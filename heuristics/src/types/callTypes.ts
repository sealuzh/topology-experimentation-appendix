import {ComparableDiff, DiffType, Endpoint} from "./types";
import {ComparableStatistics, SimpleStatistics} from "./statisticTypes";


export abstract class Call {
    sourceEndpoint: Endpoint;
    targetEndpoint: Endpoint;
    numEdge: number;

    protected constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint) {
        this.sourceEndpoint = sourceEndpoint;
        this.targetEndpoint = targetEndpoint;
        this.numEdge = 1;
    }

    toString(): string {
        return this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return this.sourceEndpoint.version + " - " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }
}


export class DiffCall extends Call {
    type: DiffType;
    stats: SimpleStatistics;

    constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, type: DiffType, stats: SimpleStatistics) {
        super(sourceEndpoint, targetEndpoint);
        this.type = type;
        this.stats = stats;
    }

    toString(): string {
        return this.type + ": " + this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return this.type + ": " + this.sourceEndpoint.version + "- " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }
}


export abstract class ComparableCall extends Call {
    stats: ComparableStatistics;

    protected constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, stats: ComparableStatistics) {
        super(sourceEndpoint, targetEndpoint);
        this.stats = stats;
    }

    // the service gets significantly slower
    hasCriticalResponseTime(): boolean {
        return this.stats.hasCriticalResponseTime()
    }

    getMaxNegativeDeviation(): number {
        return this.stats.getMaxNegativeDeviation()
    }

    isDeviationWithinBoundary(boundary: number): boolean {
        return this.stats.isDeviationWithinBoundary(boundary);
    }
}

export class UpdatedSourceVersion extends ComparableCall implements ComparableDiff {
    oldSourceVersion: string;

    constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, oldSourceVersion: string, stats: ComparableStatistics) {
        super(sourceEndpoint, targetEndpoint, stats);
        this.oldSourceVersion = oldSourceVersion;
    }

    toString(): string {
        return "UpdatedSourceVersion:" + this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return "UpdatedSourceVersion: " + this.sourceEndpoint.version + "- " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }

    getOldEndpoint(): Endpoint {
        return {
            service: this.sourceEndpoint.service,
            version: this.oldSourceVersion,
            endpoint: this.sourceEndpoint.endpoint
        };
    }
}

export class UpdatedTargetVersion extends ComparableCall implements ComparableDiff {
    oldTargetVersion: string;

    constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, oldTargetVersion: string, stats: ComparableStatistics) {
        super(sourceEndpoint, targetEndpoint, stats);
        this.oldTargetVersion = oldTargetVersion;
    }

    toString(): string {
        return "UpdatedTargetVersion:" + this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return "UpdatedTargetVersion: " + this.sourceEndpoint.version + "- " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }

    getOldEndpoint(): Endpoint {
        return {
            service: this.targetEndpoint.service,
            version: this.oldTargetVersion,
            endpoint: this.targetEndpoint.endpoint
        };
    }
}

export class UpdatedVersion extends ComparableCall implements ComparableDiff {
    oldTargetVersion: string;
    oldSourceVersion: string;

    constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, oldSourceVersion: string, oldTargetVersion: string, stats: ComparableStatistics) {
        super(sourceEndpoint, targetEndpoint, stats);
        this.oldTargetVersion = oldTargetVersion;
        this.oldSourceVersion = oldSourceVersion;
    }

    toString(): string {
        return "UpdatedVersion:" + this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return "UpdatedVersion: " + this.sourceEndpoint.version + "- " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }

    getOldEndpoint(): Endpoint {
        return {
            service: this.targetEndpoint.service,
            version: this.oldTargetVersion,
            endpoint: this.targetEndpoint.endpoint
        };
    }

    getOldSourceEndpoint(): Endpoint {
        return {
            service: this.sourceEndpoint.service,
            version: this.oldSourceVersion,
            endpoint: this.sourceEndpoint.endpoint
        };
    }

    getOldTargetEndpoint(): Endpoint {
        return {
            service: this.targetEndpoint.service,
            version: this.oldTargetVersion,
            endpoint: this.targetEndpoint.endpoint
        };
    }
}

export class CommonCall extends ComparableCall {

    constructor(sourceEndpoint: Endpoint, targetEndpoint: Endpoint, stats: ComparableStatistics) {
        super(sourceEndpoint, targetEndpoint, stats);
    }

    toString(): string {
        return "Common:" + this.sourceEndpoint.service + "/" + this.sourceEndpoint.version + "/" + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.service + "/" + this.targetEndpoint.version + "/" + this.targetEndpoint.endpoint
    }

    toShortString(): string {
        return "Common: " + this.sourceEndpoint.version + "- " + this.sourceEndpoint.endpoint + " ==> " +
            this.targetEndpoint.version + " - " + this.targetEndpoint.endpoint
    }
}