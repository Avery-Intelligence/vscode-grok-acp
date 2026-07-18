"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcPeer = void 0;
const node_events_1 = require("node:events");
/**
 * Line-delimited JSON-RPC 2.0 over a duplex stream (ACP stdio).
 */
class JsonRpcPeer extends node_events_1.EventEmitter {
    stdin;
    stdout;
    nextId = 1;
    buffer = "";
    pending = new Map();
    closed = false;
    constructor(stdin, stdout) {
        super();
        this.stdin = stdin;
        this.stdout = stdout;
        this.stdout.setEncoding("utf8");
        this.stdout.on("data", (chunk) => this.onData(chunk));
        this.stdout.on("end", () => this.failAll(new Error("ACP stdout ended")));
        this.stdout.on("error", (err) => this.emit("error", err));
    }
    request(method, params, timeoutMs = 120_000) {
        if (this.closed)
            return Promise.reject(new Error("ACP peer closed"));
        const id = this.nextId++;
        const key = String(id);
        const msg = { jsonrpc: "2.0", id, method, params };
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(key);
                reject(new Error(`ACP request timeout: ${method} (${timeoutMs}ms)`));
            }, timeoutMs);
            this.pending.set(key, { resolve, reject, timer });
            this.write(msg);
        });
    }
    notify(method, params) {
        const msg = { jsonrpc: "2.0", method, params };
        this.write(msg);
    }
    /** Respond to a server-initiated request (e.g. permission). */
    respond(id, result) {
        this.write({ jsonrpc: "2.0", id, result });
    }
    respondError(id, code, message) {
        this.write({
            jsonrpc: "2.0",
            id,
            error: { code, message },
        });
    }
    dispose() {
        this.closed = true;
        this.failAll(new Error("ACP peer disposed"));
    }
    write(obj) {
        if (this.closed)
            return;
        this.stdin.write(`${JSON.stringify(obj)}\n`);
    }
    onData(chunk) {
        this.buffer += chunk;
        let idx;
        while ((idx = this.buffer.indexOf("\n")) >= 0) {
            const line = this.buffer.slice(0, idx).trim();
            this.buffer = this.buffer.slice(idx + 1);
            if (!line)
                continue;
            let msg;
            try {
                msg = JSON.parse(line);
            }
            catch {
                this.emit("parseError", line);
                continue;
            }
            this.handleMessage(msg);
        }
    }
    handleMessage(msg) {
        if ("id" in msg && ("result" in msg || "error" in msg)) {
            const key = String(msg.id);
            const p = this.pending.get(key);
            if (p) {
                clearTimeout(p.timer);
                this.pending.delete(key);
                if (msg.error) {
                    const err = msg.error;
                    const e = new Error(err.message ?? "ACP error");
                    e.code = err.code;
                    e.data = err.data;
                    p.reject(e);
                }
                else {
                    p.resolve(msg.result);
                }
            }
            return;
        }
        if (typeof msg.method === "string") {
            if ("id" in msg && msg.id !== undefined && msg.id !== null) {
                // Server request — e.g. session/request_permission
                this.emit("request", {
                    id: msg.id,
                    method: msg.method,
                    params: msg.params,
                });
            }
            else {
                this.emit("notification", {
                    method: msg.method,
                    params: msg.params,
                });
            }
        }
    }
    failAll(err) {
        for (const [, p] of this.pending) {
            clearTimeout(p.timer);
            p.reject(err);
        }
        this.pending.clear();
    }
}
exports.JsonRpcPeer = JsonRpcPeer;
//# sourceMappingURL=jsonrpc.js.map