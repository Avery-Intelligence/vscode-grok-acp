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
  error?: { code: number; message: string; data?: unknown };
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

/**
 * Line-delimited JSON-RPC 2.0 over a duplex stream (ACP stdio).
 */
export class JsonRpcPeer extends EventEmitter {
  private nextId = 1;
  private buffer = "";
  private pending = new Map<string, Pending>();
  private closed = false;

  constructor(
    private readonly stdin: Writable,
    private readonly stdout: Readable,
  ) {
    super();
    this.stdout.setEncoding("utf8");
    this.stdout.on("data", (chunk: string) => this.onData(chunk));
    this.stdout.on("end", () => this.failAll(new Error("ACP stdout ended")));
    this.stdout.on("error", (err) => this.emit("error", err));
  }

  request(method: string, params?: unknown, timeoutMs = 120_000): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("ACP peer closed"));
    const id = this.nextId++;
    const key = String(id);
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`ACP request timeout: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(key, { resolve, reject, timer });
      this.write(msg);
    });
  }

  notify(method: string, params?: unknown): void {
    const msg: JsonRpcNotification = { jsonrpc: "2.0", method, params };
    this.write(msg);
  }

  /** Respond to a server-initiated request (e.g. permission). */
  respond(id: JsonRpcId, result: unknown): void {
    this.write({ jsonrpc: "2.0", id, result } as JsonRpcResponse);
  }

  respondError(id: JsonRpcId, code: number, message: string): void {
    this.write({
      jsonrpc: "2.0",
      id,
      error: { code, message },
    } as JsonRpcResponse);
  }

  dispose(): void {
    this.closed = true;
    this.failAll(new Error("ACP peer disposed"));
  }

  private write(obj: unknown): void {
    if (this.closed) return;
    this.stdin.write(`${JSON.stringify(obj)}\n`);
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(line) as Record<string, unknown>;
      } catch {
        this.emit("parseError", line);
        continue;
      }
      this.handleMessage(msg);
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    if ("id" in msg && ("result" in msg || "error" in msg)) {
      const key = String(msg.id);
      const p = this.pending.get(key);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(key);
        if (msg.error) {
          const err = msg.error as { message?: string; code?: number; data?: unknown };
          const e = new Error(err.message ?? "ACP error");
          (e as Error & { code?: number; data?: unknown }).code = err.code;
          (e as Error & { data?: unknown }).data = err.data;
          p.reject(e);
        } else {
          p.resolve(msg.result);
        }
      }
      return;
    }

    if (typeof msg.method === "string") {
      if ("id" in msg && msg.id !== undefined && msg.id !== null) {
        // Server request — e.g. session/request_permission
        this.emit("request", {
          id: msg.id as JsonRpcId,
          method: msg.method,
          params: msg.params,
        });
      } else {
        this.emit("notification", {
          method: msg.method,
          params: msg.params,
        });
      }
    }
  }

  private failAll(err: Error): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }
}
