import { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
export type JsonRpcId = string | number;
export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: JsonRpcId;
    method: string;
    params?: unknown;
}
export interface JsonRpcNotification {
    jsonrpc: "2.0";
    method: string;
    params?: unknown;
}
export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: JsonRpcId;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
/**
 * Line-delimited JSON-RPC 2.0 over a duplex stream (ACP stdio).
 */
export declare class JsonRpcPeer extends EventEmitter {
    private readonly stdin;
    private readonly stdout;
    private nextId;
    private buffer;
    private pending;
    private closed;
    constructor(stdin: Writable, stdout: Readable);
    request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown>;
    notify(method: string, params?: unknown): void;
    /** Respond to a server-initiated request (e.g. permission). */
    respond(id: JsonRpcId, result: unknown): void;
    respondError(id: JsonRpcId, code: number, message: string): void;
    dispose(): void;
    private write;
    private onData;
    private handleMessage;
    private failAll;
}
//# sourceMappingURL=jsonrpc.d.ts.map