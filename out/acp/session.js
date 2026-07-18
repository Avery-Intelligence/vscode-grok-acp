"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrokAcpSession = createGrokAcpSession;
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
/**
 * Spawns `grok agent stdio` and exposes a minimal session handle.
 *
 * Full ACP initialize/session/new handshake will land in follow-up commits.
 * Product extensions should build UI on top of this host, not re-spawn CLI ad hoc.
 */
async function createGrokAcpSession(options) {
    const agentArgs = options.agentArgs ?? ["stdio"];
    const child = (0, node_child_process_1.spawn)(options.cliPath, ["agent", ...agentArgs], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ["pipe", "pipe", "pipe"],
    });
    const bus = new node_events_1.EventEmitter();
    let buffer = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line)
                continue;
            try {
                bus.emit("message", JSON.parse(line));
            }
            catch {
                bus.emit("message", { raw: line });
            }
        }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
        bus.emit("stderr", chunk);
    });
    child.on("error", (err) => {
        bus.emit("error", err);
    });
    child.on("exit", (code, signal) => {
        bus.emit("exit", { code, signal });
    });
    // Give spawn a tick to fail fast on missing binary / EACCES
    await new Promise((resolve, reject) => {
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
        // Some Node versions don't emit 'spawn'; resolve next tick if no error
        setImmediate(() => {
            if (child.pid) {
                cleanup();
                resolve();
            }
        });
    });
    return {
        get pid() {
            return child.pid;
        },
        send(message) {
            if (!child.stdin.writable) {
                throw new Error("Grok ACP session stdin is not writable");
            }
            child.stdin.write(`${JSON.stringify(message)}\n`);
        },
        onNotification(handler) {
            bus.on("message", handler);
            return () => bus.off("message", handler);
        },
        dispose() {
            bus.removeAllListeners();
            if (!child.killed) {
                child.kill("SIGTERM");
            }
        },
    };
}
//# sourceMappingURL=session.js.map