import {Call} from "./callTypes";

export interface Endpoint {
    service: string,
    version: string,
    endpoint: string
}

export enum DiffType {
    REMOVE_CALL = 'REMOVE_CALL',

    // adding a call to an endpoint that did exist in the baseline version (i.e., the endpoint did exist)
    ADD_CALL_TO_EXISTING_ENDPOINT = 'ADD_CALL_TO_EXISTING_ENDPOINT',

     // adding a call to a new endpoint of an already existing version of a service
    ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_VERSION = 'ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_VERSION',

    // special case, canary calls the same endpoint but of a different version
    ADD_CALL_TO_NEW_VERSION_OF_EXISTING_SERVICE = 'ADD_CALL_TO_NEW_VERSION_OF_EXISTING_SERVICE',

     // adding a call to a new endpoint of a new version of an existing service
    ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_SERVICE = 'ADD_CALL_TO_NEW_ENDPOINT_OF_EXISTING_SERVICE',

     // calling an endpoint of a new service
    ADD_CALL_TO_NEW_SERVICE = 'ADD_CALL_TO_NEW_SERVICE',

    // // for visualization only: merges REMOVE_CALL and ADD_CALL_TO_NEW_VERSION_OF_EXISTING_SERVICE
    // UPDATED_CALLED_VERSION = 'UPDATED_CALLED_VERSION',
    //
    // // for visualization only: merges REMOVE_CALL and ADD_CALL_TO_EXISTING_ENDPOINT
    // UPDATED_CALLER_VERSION = 'UPDATED_CALLER_VERSION'
}

export class Node {
    serviceName: string;

    x?: number;         // used by d3 only
    y?: number;         // used by d3 only
    constructor(serviceName : string) {
        this.serviceName = serviceName;
    }
}

export class Edge {
    source: string;                  // used for d3
    target: string;                  // used for d3

    sourceService: string;
    targetService: string;
    calls: Call[];

    numEdge: number;               // used for d3 only

    constructor(source: string, target: string) {
        this.source = this.sourceService = source;
        this.target = this.targetService = target;
        this.numEdge = 1;
        this.calls = [];
    }

    addCall(call : Call) : void {
        this.calls.push(call);
    }
}

export enum SeverityLevels {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3
}

export interface ComparableDiff {
    getOldEndpoint() : Endpoint;
}