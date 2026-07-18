"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrokAcpSession = createGrokAcpSession;
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
const jsonrpc_1 = require("./jsonrpc");
async function createGrokAcpSession(options) {
    const agentArgs = options.agentArgs ?? ["stdio"];
    const child = (0, node_child_process_1.spawn)(options.cliPath, ["agent", ...agentArgs], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ["pipe", "pipe", "pipe"],
    });
    await waitForSpawn(child);
    const peer = new jsonrpc_1.JsonRpcPeer(child.stdin, child.stdout);
    const bus = new node_events_1.EventEmitter();
    const timeout = options.requestTimeoutMs ?? 180_000;
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => bus.emit("stderr", chunk));
    child.on("exit", (code, signal) => {
        peer.dispose();
        bus.emit("exit", { code, signal });
    });
    peer.on("notification", (n) => {
        bus.emit("notification", n.method, n.params);
        if (n.method === "session/update") {
            const params = (n.params ?? {});
            const update = (params.update ?? params);
            bus.emit("update", {
                sessionId: params.sessionId,
                sessionUpdate: update.sessionUpdate,
                update,
                raw: n.params,
            });
        }
    });
    peer.on("request", (req) => {
        const respond = (result) => peer.respond(req.id, result);
        const reject = (code, message) => peer.respondError(req.id, code, message);
        if (options.onServerRequest) {
            void Promise.resolve(options.onServerRequest({
                id: req.id,
                method: req.method,
                params: req.params,
                respond,
                reject,
            })).catch((err) => {
                reject(-32000, err instanceof Error ? err.message : String(err));
            });
            return;
        }
        // Default: auto-allow common permission shapes for headless smoke tests
        if (req.method.includes("permission") ||
            req.method.includes("Permission")) {
            respond({ outcome: { outcome: "selected", optionId: "allow-once" } });
            return;
        }
        reject(-32601, `Unhandled server request: ${req.method}`);
    });
    await peer.request("initialize", {
        protocolVersion: 1,
        clientInfo: {
            name: options.clientName ?? "vscode-grok-acp",
            version: options.clientVersion ?? "0.2.0",
        },
        capabilities: {
            fs: { readTextFile: true, writeTextFile: true },
        },
    }, 30_000);
    peer.notify("notifications/initialized", {});
    const mcpServers = (options.mcpServers ?? []).map(normalizeMcpServer);
    const newResult = (await peer.request("session/new", { cwd: options.cwd, mcpServers }, 60_000));
    const sessionId = newResult.sessionId;
    if (!sessionId) {
        child.kill("SIGTERM");
        throw new Error("session/new did not return sessionId");
    }
    return {
        get pid() {
            return child.pid;
        },
        sessionId,
        peer,
        async prompt(text, extra = []) {
            const chunks = [];
            const thoughts = [];
            const onUpd = (ev) => {
                if (ev.sessionId && ev.sessionId !== sessionId)
                    return;
                const kind = ev.sessionUpdate;
                const content = ev.update.content;
                if (kind === "agent_message_chunk" && content?.text) {
                    chunks.push(content.text);
                }
                if (kind === "agent_thought_chunk" && content?.text) {
                    thoughts.push(content.text);
                }
            };
            bus.on("update", onUpd);
            try {
                const prompt = [{ type: "text", text }, ...extra];
                const raw = await peer.request("session/prompt", { sessionId, prompt }, timeout);
                return {
                    stopReason: raw?.stopReason,
                    text: chunks.join(""),
                    thoughts: thoughts.join(""),
                    raw,
                };
            }
            finally {
                bus.off("update", onUpd);
            }
        },
        async setMode(modeId) {
            return peer.request("session/set_mode", { sessionId, modeId }, 15_000);
        },
        onUpdate(handler) {
            bus.on("update", handler);
            return () => bus.off("update", handler);
        },
        onNotification(handler) {
            const fn = (method, params) => handler(method, params);
            bus.on("notification", fn);
            return () => bus.off("notification", fn);
        },
        dispose() {
            peer.dispose();
            bus.removeAllListeners();
            if (!child.killed) {
                try {
                    child.kill("SIGTERM");
                }
                catch {
                    // ignore
                }
            }
        },
        send(message) {
            // low-level escape hatch
            child.stdin.write(`${JSON.stringify(message)}\n`);
        },
    };
}
function toNameValue(input) {
    if (!input)
        return [];
    if (Array.isArray(input))
        return input;
    return Object.entries(input).map(([name, value]) => ({ name, value }));
}
function normalizeMcpServer(s) {
    // HTTP / SSE
    if (s.type === "http" || s.type === "sse" || (s.url && !s.command)) {
        return {
            type: s.type ?? "http",
            name: s.name,
            url: s.url,
            headers: toNameValue(s.headers),
        };
    }
    // stdio — args + env required by Grok's McpServer enum
    return {
        name: s.name,
        command: s.command,
        args: s.args ?? [],
        env: toNameValue(s.env),
        cwd: s.cwd ?? null,
    };
}
function waitForSpawn(child) {
    return new Promise((resolve, reject) => {
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const onSpawn = () => {
            cleanup();
            resolve();
        };
        const cleanup = () => {
            child.off("error", onError);
            child.off("spawn", onSpawn);
        };
        child.once("error", onError);
        child.once("spawn", onSpawn);
        setImmediate(() => {
            if (child.pid) {
                cleanup();
                resolve();
            }
        });
    });
}
//# sourceMappingURL=session.js.map