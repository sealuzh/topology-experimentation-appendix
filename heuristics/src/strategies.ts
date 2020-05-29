import {DiffType} from "./types/types";
import {AnalysisNode, TreeComplexityWeights} from "./rankingAlgorithm";
import {Call, ComparableCall, DiffCall} from "./types/callTypes";

/**
 *  This file holds the source code of all ranking heuristics. It does not only include the heuristics presented in the
 *  paper but also more variations not covered due to space reasons.
 *
 *  The naming between paper and source code heuristics is slightly different:
 *     Subtree <==> Subtree (ST)
 *     SubtreeWithUncertaintyPropagationAndPenalty <==> ST Ext.
 *     ResponseTimeAnalysis <==> Response Time Analysis (RTA)
 *     ResponseTimeAnalysisWithUncertaintyAndPenalty <==> RTA Ext.
 *     HybridWithUncertaintyPropagation <==> Hybrid (HYB)
 *     HybridWithUncertaintyPropagationAndPenalty <==> HYB Ext.
 */

export enum Strategy {
    Subtree,
    SubtreeWithUncertainty,
    SubtreeWithUncertaintyPropagation,
    SubtreeWithPenalty,
    SubtreeWithUncertaintyPropagationAndPenalty,
    ResponseTimeAnalysis,
    ResponseTimeAnalysisWithPenalty,
    ResponseTimeAnalysisWithUncertaintyAndPenalty,
    HybridWithUncertainty,
    HybridWithUncertaintyPropagation,
    HybridWithUncertaintyAndPenalty,
    HybridWithUncertaintyPropagationAndPenalty
}

function getComplexity(call: Call, includePenalty: boolean = false) : number {
    let weight = TreeComplexityWeights.getWeight(call);
    let penalty = includePenalty ? TreeComplexityWeights.getPenalty(call) : 0;

    return weight + penalty;
}

export abstract class AnalysisStrategy {
    value: number;

    protected constructor(value: number) {
        this.value = value;
    }

    abstract annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]) : void;

    abstract extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]) : number;

    aggregateChildValues(children: AnalysisNode<AnalysisStrategy>[]) {
        // sum up complexity of child nodes
        children.forEach(child => {
            this.value += child.state.value;
        });
    }

    getChildScores(children: AnalysisNode<AnalysisStrategy>[]) : number {
        let score = 0;

        children.forEach((child) => {
            score += child.state.value;
        });

        return score;
    }

}

export class Subtree extends AnalysisStrategy {

    constructor(value: number) {
        super(value);
    }

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        super.aggregateChildValues(children);

        // add 1 for complexity of the call itself
        this.value += 1;
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.getChildScores(children) + 1;
    }
}

export class SubtreeWithUncertainty extends Subtree {

    constructor(value: number) {
        super(value);
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.getChildScores(children) + getComplexity(call, false);
    }
}

export class SubtreeWithUncertaintyPropagation extends Subtree {

    constructor(value: number) {
        super(value);
    }

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += getComplexity(call, false);
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.getChildScores(children) + getComplexity(call, false);    }
}

export class SubtreeWithPenalty extends Subtree {
    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.getChildScores(children) + TreeComplexityWeights.getPenalty(call);
    }
}

export class SubtreeWithUncertaintyPropagationAndPenalty extends Subtree {

    constructor(value: number) {
        super(value);
    }

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += getComplexity(call, false);
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.getChildScores(children) + getComplexity(call, true);
    }
}

export class ResponseTimeAnalysis extends AnalysisStrategy {
    negativeDeviations: Map<Call, number>;
    potentialSource: Map<Call, AnalysisNode<AnalysisStrategy>[]>;
    flagged: number;

    constructor(value: number) {
        super(value);
        this.negativeDeviations = new Map<Call, number>();
        this.potentialSource = new Map<Call, AnalysisNode<AnalysisStrategy>[]>();
        this.flagged = 0;
    }

    toString(): string {
        return `{ flagged: ${this.flagged}, deviations: {${Array.from(this.negativeDeviations, 
            ([call, num]) => "\n ==> " + call.toShortString() + ": " + num + ", ")}}, \n sources: {${Array.from(this.potentialSource, 
            ([call, values]) => "\n ==> " + call.toShortString() + ": " + values.map(value => value.toString()).join(","))}}`
    }

    handleChild(call: ComparableCall, node: AnalysisNode<AnalysisStrategy>, child: AnalysisNode<AnalysisStrategy>) {
        // base case:
        // (1) measuring a performance deviation for the first time
        let childState = child.state as ResponseTimeAnalysis;

        if (childState.negativeDeviations.size == 0) {
            this.negativeDeviations.set(call, call.getMaxNegativeDeviation());

            ResponseTimeAnalysis.addSource(this, call, child);
            childState.flagged += 1;
            this.identifyAndFlagPotentialSources(child);

        } else {
            // there are probably some cascading performance deviations
            let totalDeviations = 0;
            let deviation = 0;
            childState.negativeDeviations.forEach((number, _) => totalDeviations += number);

            if (call.isDeviationWithinBoundary(totalDeviations)) {
                this.negativeDeviations.set(call, totalDeviations);
            }
            else {
                deviation = call.getMaxNegativeDeviation();
                this.negativeDeviations.set(call, deviation);
            }
            ResponseTimeAnalysis.addSource(this, call, child);
            ResponseTimeAnalysis.downwardPropagation(child);

            // case (2): if performance deviation seems to be cascaded
            // we do not need to flag another potential source, we just cascade

            // case (3): the deviation gets smaller (e.g., by introducing caches),
            // we do not flag as well, we just cascade
            // current limitation:
            // if there is a change covering all previous deviations, e.g., 200ms faster, previous deviation was in total 40ms
            // and then there is a second change introducing 100ms delay, we won't spot this one

            // case (4): the deviation is getting larger because of other changes
            if (deviation > totalDeviations) {

                // we flag the child as it might be the source for the deviation
                childState.flagged += 1;
                // plus, we need to look for other changes that might have introduced the deviation
                this.identifyAndFlagPotentialSources(child);
            }
        }
    }

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]) {
        if (call instanceof ComparableCall && call.hasCriticalResponseTime()) {
            children.forEach((child) => this.handleChild(call, node, child));
        }
    }

    identifyAndFlagPotentialSources(child: AnalysisNode<AnalysisStrategy>): void {
        let childState = child.state as ResponseTimeAnalysis;

        let candidates = child.calls.filter(childCall => childCall instanceof DiffCall &&
            (childCall.type == DiffType.ADD_CALL_TO_NEW_SERVICE ||
                childCall.type == DiffType.ADD_CALL_TO_EXISTING_ENDPOINT ||
                childCall.type == DiffType.ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_SERVICE ||
                childCall.type == DiffType.ADD_CALL_TO_NEW_VERSION_OF_EXISTING_SERVICE));

        if (candidates.length > 0) {
            candidates.forEach(childCall => {
                let index = child.calls.indexOf(childCall);
                let children = child.children[index];

                children.forEach(node => {
                    let nodeState = node.state as ResponseTimeAnalysis;
                    nodeState.flagged += 1;
                    ResponseTimeAnalysis.addSource(childState, childCall, node);
                });
            });
        }
    }

    static addSource(state: ResponseTimeAnalysis, call: Call, source: AnalysisNode<AnalysisStrategy>): void {
        if (!state.potentialSource.has(call))
            state.potentialSource.set(call, []);

        state.potentialSource.get(call)!.push(source);
    }

    static downwardPropagation(node: AnalysisNode<AnalysisStrategy>): void {
        let state = node.state as ResponseTimeAnalysis;
        state.potentialSource.forEach((subNodes) => {
            subNodes.forEach(subNode => {
                let subState = subNode.state as ResponseTimeAnalysis;
                subState.flagged += 1;
                ResponseTimeAnalysis.downwardPropagation(subNode);
            });
        });
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return Math.max.apply(Math, children.map((child) => {
            let state = child.state as ResponseTimeAnalysis;
            return state.flagged;
        }));
    }
}

export class ResponseTimeAnalysisWithPenalty extends ResponseTimeAnalysis {
    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) * TreeComplexityWeights.RESPONSE_PENALTY;
    }
}

export class ResponseTimeAnalysisWithUncertaintyAndPenalty extends ResponseTimeAnalysis {
    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) * TreeComplexityWeights.RESPONSE_PENALTY + getComplexity(call);
    }
}

export class HybridWithUncertainty extends ResponseTimeAnalysis {

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        // flag the nodes based on response time
        super.annotate(call, node, children);

        // propagate uncertainty complexity
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += 1;
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) + super.getChildScores(children) + getComplexity(call, false);
    }
}

export class HybridWithUncertaintyPropagation extends ResponseTimeAnalysis {

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        // flag the nodes based on response time
        super.annotate(call, node, children);

        // propagate uncertainty complexity
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += getComplexity(call, false);;
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) + super.getChildScores(children) + getComplexity(call, false);
    }
}

export class HybridWithUncertaintyAndPenalty extends ResponseTimeAnalysis {

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        // flag the nodes based on response time
        super.annotate(call, node, children);

        // propagate uncertainty complexity
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += 1;
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) * TreeComplexityWeights.RESPONSE_PENALTY + super.getChildScores(children) + getComplexity(call, false);
    }
}

export class HybridWithUncertaintyPropagationAndPenalty extends ResponseTimeAnalysis {

    annotate(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): void {
        // flag the nodes based on response time
        super.annotate(call, node, children);

        // propagate uncertainty complexity
        super.aggregateChildValues(children);

        // add the call's complexity
        this.value += getComplexity(call, false);
    }

    extract(call: Call, node: AnalysisNode<AnalysisStrategy>, children: AnalysisNode<AnalysisStrategy>[]): number {
        return super.extract(call, node, children) * TreeComplexityWeights.RESPONSE_PENALTY + super.getChildScores(children) + getComplexity(call, false);
    }
}

