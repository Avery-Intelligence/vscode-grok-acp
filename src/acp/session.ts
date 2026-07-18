import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";

export interface CreateGrokAcpSessionOptions {
  /** Absolute path to the `grok` binary */
  cliPath: string;
  /** Working directory for the agent */
  cwd: string;
  /** Extra env (do not inject private product secrets here) */
  env?: NodeJS.ProcessEnv;
  /** Args after `agent` (default: `stdio`) */
  agentArgs?: string[];
}

export interface GrokAcpSession {
  readonly pid: number | undefined;
  /** Raw ACP JSON-RPC write (line-delimited JSON) — protocol wiring is iterative */
  send(message: unknown): void;
  onNotification(handler: (msg: unknown) => void): () => void;
  dispose(): void;
}

/**
 * Spawns `grok agent stdio` and exposes a minimal session handle.
 *
 * Full ACP initialize/session/new handshake will land in follow-up commits.
 * Product extensions should build UI on top of this host, not re-spawn CLI ad hoc.
 */
export async function createGrokAcpSession(
  options: CreateGrokAcpSessionOptions,
): Promise<GrokAcpSession> {
  const agentArgs = options.agentArgs ?? ["stdio"];
  const child: ChildProcessWithoutNullStreams = spawn(
    options.cliPath,
    ["agent", ...agentArgs],
    {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  const bus = new EventEmitter();
  let buffer = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        bus.emit("message", JSON.parse(line) as unknown);
      } catch {
        bus.emit("message", { raw: line });
      }
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    bus.emit("stderr", chunk);
  });

  child.on("error", (err) => {
    bus.emit("error", err);
  });

  child.on("exit", (code, signal) => {
    bus.emit("exit", { code, signal });
  });

  // Give spawn a tick to fail fast on missing binary / EACCES
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
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
    send(message: unknown) {
      if (!child.stdin.writable) {
        throw new Error("Grok ACP session stdin is not writable");
      }
      child.stdin.write(`${JSON.stringify(message)}\n`);
    },
    onNotification(handler: (msg: unknown) => void) {
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
