import {DiffType, Edge, Endpoint, SeverityLevels} from "./types/types";
import {
    AnalysisStrategy,
    HybridWithUncertainty,
    HybridWithUncertaintyAndPenalty,
    HybridWithUncertaintyPropagation,
    HybridWithUncertaintyPropagationAndPenalty,
    ResponseTimeAnalysis,
    ResponseTimeAnalysisWithPenalty,
    ResponseTimeAnalysisWithUncertaintyAndPenalty,
    Strategy,
    Subtree,
    SubtreeWithPenalty,
    SubtreeWithUncertainty,
    SubtreeWithUncertaintyPropagation,
    SubtreeWithUncertaintyPropagationAndPenalty
} from "./strategies";
import {
    Call,
    CommonCall,
    ComparableCall,
    DiffCall,
    UpdatedSourceVersion,
    UpdatedTargetVersion,
    UpdatedVersion
} from "./types/callTypes";


export interface TopologyRanking {
    rank: ((edge_dict: Map<string, Map<string, Edge>>, endpoints: Endpoint[], targetService: string) => RankingScore[])
}

export class RankingScore {
    call: Call;
    score: number;
    level: SeverityLevels;

    constructor(call: Call, score: number) {
        this.call = call;
        this.score = score;
        this.level = SeverityLevels.NONE;
    }
}

export class RankingAlgorithm implements TopologyRanking {
    strategy : Strategy = Strategy.HybridWithUncertaintyPropagationAndPenalty;

    createState() : AnalysisStrategy {
        switch (this.strategy) {
            case Strategy.Subtree:
                return new Subtree(0);
            case Strategy.SubtreeWithUncertainty:
                return new SubtreeWithUncertainty(0);
            case Strategy.SubtreeWithUncertaintyPropagation:
                return new SubtreeWithUncertaintyPropagation(0);
            case Strategy.SubtreeWithPenalty:
                return new SubtreeWithPenalty(0);
            case Strategy.SubtreeWithUncertaintyPropagationAndPenalty:
                return new SubtreeWithUncertaintyPropagationAndPenalty(0);
            case Strategy.ResponseTimeAnalysis:
                return new ResponseTimeAnalysis(0);
            case Strategy.ResponseTimeAnalysisWithPenalty:
                return new ResponseTimeAnalysisWithPenalty(0);
            case Strategy.ResponseTimeAnalysisWithUncertaintyAndPenalty:
                return new ResponseTimeAnalysisWithUncertaintyAndPenalty(0);
            case Strategy.HybridWithUncertainty:
                return new HybridWithUncertainty(0);
            case Strategy.HybridWithUncertaintyPropagation:
                return new HybridWithUncertaintyPropagation(0);
            case Strategy.HybridWithUncertaintyAndPenalty:
                return new HybridWithUncertaintyAndPenalty(0);
            case Strategy.HybridWithUncertaintyPropagationAndPenalty:
                return new HybridWithUncertaintyPropagationAndPenalty(0);
        }
    }

    rank(edge_dict: Map<string, Map<string, Edge>>, endpoints: Endpoint[], targetService: string): RankingScore[] {

        let topology: any = {};
        endpoints.forEach(endpoint => {
            if (!(endpoint.service in topology)) {
                topology[endpoint.service] = {};
            }
            if (!(endpoint.version in topology[endpoint.service])) {
                topology[endpoint.service][endpoint.version] = {};
            }
            if (!(endpoint.endpoint in topology[endpoint.service][endpoint.version])) {
                topology[endpoint.service][endpoint.version][endpoint.endpoint] = [];
            }
        });

        edge_dict.forEach((target_dict, sourceService) => {
            target_dict.forEach((edge, targetService) => {
                edge.calls.forEach(call => {
                    topology[sourceService][call.sourceEndpoint.version][call.sourceEndpoint.endpoint].push(call);
                });
            });
        });

        let dict: Map<string, AnalysisNode<AnalysisStrategy>> = new Map<string, AnalysisNode<AnalysisStrategy>>();
        let nodes = [];

        for (let version in topology[targetService]) {
            let current_endpoints = topology[targetService][version];
            for (let current_endpoint in current_endpoints) {

                // used to detect cycles in the call graph -> would result in an endless loop otherwise
                // cycles are resolved during the clustering phase and shouldn't occur here

                let temporary: Set<Endpoint> = new Set<Endpoint>();

                let endpoint = {service: targetService, version: version, endpoint: current_endpoint};
                let child = new AnalysisNode<AnalysisStrategy>(endpoint, [], [], this.createState());

                temporary.add(endpoint);
                for (let call of current_endpoints[current_endpoint]) {
                    call = call as Call;
                    let call_children = [];
                    call_children.push(this.walkCallPath(dict, topology, call.targetEndpoint, temporary));
                    child.calls.push(call);

                    if (call instanceof UpdatedTargetVersion) {
                        temporary.add(call.getOldEndpoint());
                        call_children.push(this.walkCallPath(dict, topology, call.getOldEndpoint(), temporary));
                    } else if (call instanceof UpdatedVersion) {
                        call = call as UpdatedVersion;
                        temporary.add(call.getOldTargetEndpoint());
                        call_children.push(this.walkCallPath(dict, topology, call.getOldTargetEndpoint(), temporary));
                    }
                    child.children.push(call_children);
                }
                nodes.push(child);
            }
        }

        nodes.forEach(node => {
            this.annotateTree(node);
        });

        let scores: RankingScore[] = [];
        nodes.forEach(node => {
            this.extractScore(node, scores);
        });

        scores = this.filterScores(scores);

        let complexity = nodes.map(node => node.state.value).reduce((accum, current) => accum + current);

        // add those call to the list that are not part of the ranking yet (i.e., not reached by the target service)
        edge_dict.forEach((target_dict, sourceService) => {
            target_dict.forEach((edge, targetService) => {
                edge.calls.forEach(call => {
                    if (scores.map(score => score.call).indexOf(call) == -1) {
                        scores.push(new RankingScore(call, -1));
                    }
                });
            });
        });

        scores.sort((a, b,) => b.score - a.score);
        this.setSeverityLevel(scores);

        return scores;
    }

    filterScores(scores: RankingScore[]) : RankingScore[] {
        let m : Map<Call,RankingScore> = new Map<Call, RankingScore>();

        scores.forEach(score => {
           if(!m.has(score.call))
               m.set(score.call, score);
        });

        return Array.from(m.values());
    }

    setSeverityLevel(scores: RankingScore[]) {
        let values = scores
            .filter(score => score.score >= 0)
            .map(score => score.score)
            .sort();

        let percentile33 = values[Math.ceil(0.33 * values.length) - 1];
        let percentile66 = values[Math.ceil(0.66 * values.length) - 1];

        scores
            .filter(score => score.score >= 0)
            .forEach(score => {
                if (score.score < percentile33)
                    score.level = SeverityLevels.LOW;
                else if(score.score >= percentile33 && score.score < percentile66)
                    score.level = SeverityLevels.MEDIUM;
                else
                    score.level = SeverityLevels.HIGH;
            });
    }

    walkCallPath(dict: Map<string, AnalysisNode<AnalysisStrategy>>, topology: any, endpoint: Endpoint, temporary: Set<Endpoint>): AnalysisNode<AnalysisStrategy> {

        if (dict.has(EPToString(endpoint))) {
            // @ts-ignore
            return dict.get(EPToString(endpoint));
        }

        let children: AnalysisNode<AnalysisStrategy>[][] = [];
        let calls: Call[] = [];

        topology[endpoint.service][endpoint.version][endpoint.endpoint].forEach((next: Call) => {

            if (temporary.has(next.targetEndpoint) ||
                (next instanceof UpdatedTargetVersion && temporary.has(next.getOldEndpoint())) ||
                (next instanceof UpdatedVersion && temporary.has(next.getOldTargetEndpoint()))) {
                console.error("cycles in call graph");
            } else {
                let call_children = [];
                temporary.add(next.targetEndpoint);
                call_children.push(this.walkCallPath(dict, topology, next.targetEndpoint, temporary));

                if (next instanceof UpdatedTargetVersion) {
                    temporary.add(next.getOldEndpoint());
                    call_children.push(this.walkCallPath(dict, topology, next.getOldEndpoint(), temporary));
                }else if(next instanceof UpdatedVersion) {
                    let call = next as UpdatedVersion;
                    temporary.add(call.getOldTargetEndpoint());
                    call_children.push(this.walkCallPath(dict, topology, call.getOldTargetEndpoint(), temporary));
                }
                children.push(call_children);
                calls.push(next);
            }
        });

        let node = new AnalysisNode<AnalysisStrategy>(endpoint, children, calls, this.createState());
        dict.set(EPToString(endpoint), node);

        return node;
    }

    annotateTree(node: AnalysisNode<AnalysisStrategy>) {
        if (node.calls.length > 0 && node.state.value == 0) {
            node.calls.forEach((call, index) => {
                let children = node.children[index];

                children.forEach(child => this.annotateTree(child));
                node.state.annotate(call, node, children);
            })
        }
    }

    extractScore(node: AnalysisNode<AnalysisStrategy>, scores: RankingScore[]) {
        if (node.calls.length > 0) {
            node.calls.forEach((call, index) => {
                let children = node.children[index];

                children.forEach((child) => this.extractScore(child, scores));
                let score = node.state.extract(call, node, children);
                let rankingScore = new RankingScore(call, score);
                scores.push(rankingScore);
            });
        }
    }
}

// this is a workaround as TypeScript or ES2017 still do not support (dictionary) keys other than number or string
function EPToString(endpoint: Endpoint): string {
    return endpoint.service + "-" + endpoint.version + "-" + endpoint.endpoint;
}

export class AnalysisNode<T> {
    endpoint: Endpoint;
    children: AnalysisNode<T>[][];
    calls: Call[];
    state: T;

    constructor(endpoint: Endpoint, children: AnalysisNode<T>[][], calls: Call[], state: T) {
        this.endpoint = endpoint;
        this.children = children;
        this.calls = calls;
        this.state = state;
    }

    toString(): string {
        return `{endpoint: {service: ${this.endpoint.service}, version: ${this.endpoint.version}, endpoint: ${this.endpoint.endpoint}},\n` +
            `state: ${this.state.toString()}}`
    }
}

export class TreeComplexityWeights {

    // removed 'readonly' for evaluation purposes
    public static REMOVE = 1;

    public static ADD_NEW_SERVICE = 3;

    public static ADD_EXISTING_ENDPOINT = 1;

    public static UPDATE_CALLER = 2;

    public static UPDATE_CALLEE = 2;

    public static UPDATE_CALLER_CALLEE = 2;

    public static COMMON = 0;

    // -----------------------------------------------------------------

    public static RESPONSE_PENALTY = 5;

    // -----------------------------------------------------------------

    // shouldn't occur if version migration is correct, remove + new version of existing service ==> update callee
    public static readonly ADD_NEW_VERSION_EXISTING_SERVICE = 1;

    // shouldn't occur for immutable services
    public static readonly ADD_NEW_ENDPOINT_EXISTING_SERVICE = 1;

    // shouldn't occur for immutable services
    public static readonly ADD_NEW_ENDPOINT_EXISTING_VERSION = 1;

    public static getWeight(call: Call) {
        if (call instanceof DiffCall) {
            if (call.type === DiffType.REMOVE_CALL)
                return TreeComplexityWeights.REMOVE;
            else if (call.type === DiffType.ADD_CALL_TO_NEW_SERVICE)
                return TreeComplexityWeights.ADD_NEW_SERVICE;
            else if (call.type === DiffType.ADD_CALL_TO_EXISTING_ENDPOINT)
                return TreeComplexityWeights.ADD_EXISTING_ENDPOINT;
            else if (call.type === DiffType.ADD_CALL_TO_NEW_VERSION_OF_EXISTING_SERVICE)
                return TreeComplexityWeights.ADD_NEW_VERSION_EXISTING_SERVICE;
            else if (call.type === DiffType.ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_VERSION)
                return TreeComplexityWeights.ADD_NEW_ENDPOINT_EXISTING_VERSION;
            else if (call.type === DiffType.ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_SERVICE)
                return TreeComplexityWeights.ADD_NEW_ENDPOINT_EXISTING_SERVICE;
        } else if (call instanceof UpdatedSourceVersion)
            return TreeComplexityWeights.UPDATE_CALLER;
        else if (call instanceof UpdatedTargetVersion)
            return TreeComplexityWeights.UPDATE_CALLEE;
        else if(call instanceof UpdatedVersion)
            return TreeComplexityWeights.UPDATE_CALLER_CALLEE;
        else if (call instanceof CommonCall)
            return TreeComplexityWeights.COMMON;

        return 0;
    }

    public static getPenalty(call: Call) {
        if(call instanceof ComparableCall) {
            if(call.hasCriticalResponseTime()) {
                return TreeComplexityWeights.RESPONSE_PENALTY;
            }
        }
        return 0;
    }

    public static setDefaultWeights() {
        TreeComplexityWeights.REMOVE = 1;
        TreeComplexityWeights.ADD_NEW_SERVICE = 3;
        TreeComplexityWeights.ADD_EXISTING_ENDPOINT = 1;
        TreeComplexityWeights.UPDATE_CALLER = 2;
        TreeComplexityWeights.UPDATE_CALLEE = 2;
        TreeComplexityWeights.UPDATE_CALLER_CALLEE = 2;
        TreeComplexityWeights.COMMON = 0;
    }

    public static setWeightVariant(variant : number) {
        if(variant == 0) {
            this.setDefaultWeights();
        }else if(variant == 1) { // common has a score of 1
            TreeComplexityWeights.REMOVE = 1;
            TreeComplexityWeights.ADD_NEW_SERVICE = 3;
            TreeComplexityWeights.ADD_EXISTING_ENDPOINT = 1;
            TreeComplexityWeights.UPDATE_CALLER = 2;
            TreeComplexityWeights.UPDATE_CALLEE = 2;
            TreeComplexityWeights.UPDATE_CALLER_CALLEE = 2;
            TreeComplexityWeights.COMMON = 1;
        }else if(variant == 2) { // new service and updates are equal
            TreeComplexityWeights.REMOVE = 1;
            TreeComplexityWeights.ADD_NEW_SERVICE = 3;
            TreeComplexityWeights.ADD_EXISTING_ENDPOINT = 1;
            TreeComplexityWeights.UPDATE_CALLER = 3;
            TreeComplexityWeights.UPDATE_CALLEE = 3;
            TreeComplexityWeights.UPDATE_CALLER_CALLEE = 3;
            TreeComplexityWeights.COMMON = 1;
        }else if(variant == 3) { // higher scores for new functionality
            TreeComplexityWeights.REMOVE = 1;
            TreeComplexityWeights.ADD_NEW_SERVICE = 5;
            TreeComplexityWeights.ADD_EXISTING_ENDPOINT = 2;
            TreeComplexityWeights.UPDATE_CALLER = 3;
            TreeComplexityWeights.UPDATE_CALLEE = 3;
            TreeComplexityWeights.UPDATE_CALLER_CALLEE = 3;
            TreeComplexityWeights.COMMON = 1;
        }

    }
}
