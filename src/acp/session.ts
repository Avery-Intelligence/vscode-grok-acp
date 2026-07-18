import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { JsonRpcPeer, type JsonRpcId } from "./jsonrpc";

/** ACP McpServer — env/headers are name/value arrays (not plain objects). */
export interface McpServerConfig {
  name: string;
  /** stdio (default if command set) | http | sse */
  type?: "stdio" | "http" | "sse";
  command?: string;
  args?: string[];
  env?: Array<{ name: string; value: string }> | Record<string, string>;
  cwd?: string | null;
  url?: string;
  headers?: Array<{ name: string; value: string }> | Record<string, string>;
}

export interface CreateGrokAcpSessionOptions {
  cliPath: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  agentArgs?: string[];
  /** Generic MCP servers passed to session/new (no product hardcoding). */
  mcpServers?: McpServerConfig[];
  clientName?: string;
  clientVersion?: string;
  requestTimeoutMs?: number;
  /**
   * Handle server→client requests (permissions, etc.).
   * Must call respond/reject appropriately.
   */
  onServerRequest?: (req: {
    id: JsonRpcId;
    method: string;
    params: unknown;
    respond: (result: unknown) => void;
    reject: (code: number, message: string) => void;
  }) => void | Promise<void>;
}

export type PromptContent =
  | { type: "text"; text: string }
  | {
      /** Base64 image (no data: URL prefix). Verified against Grok Build ACP. */
      type: "image";
      data: string;
      mimeType: string;
    };

export interface PromptResult {
  stopReason?: string;
  text: string;
  thoughts: string;
  raw: unknown;
}

export interface SessionUpdateEvent {
  sessionId?: string;
  sessionUpdate?: string;
  update: Record<string, unknown>;
  raw: unknown;
}

export interface GrokAcpSession {
  readonly pid: number | undefined;
  readonly sessionId: string;
  readonly peer: JsonRpcPeer;
  /**
   * Send a user turn. Pass a string, or a full content array (text + images).
   * Optional `extra` content is appended when the first arg is a string.
   */
  prompt(
    textOrContent: string | PromptContent[],
    extra?: PromptContent[],
  ): Promise<PromptResult>;
  setMode(modeId: string): Promise<unknown>;
  onUpdate(handler: (ev: SessionUpdateEvent) => void): () => void;
  onNotification(handler: (method: string, params: unknown) => void): () => void;
  dispose(): void;
  /** @deprecated use peer / prompt */
  send(message: unknown): void;
}

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

  await waitForSpawn(child);

  const peer = new JsonRpcPeer(child.stdin, child.stdout);
  const bus = new EventEmitter();
  const timeout = options.requestTimeoutMs ?? 180_000;

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => bus.emit("stderr", chunk));
  child.on("exit", (code, signal) => {
    peer.dispose();
    bus.emit("exit", { code, signal });
  });

  peer.on("notification", (n: { method: string; params: unknown }) => {
    bus.emit("notification", n.method, n.params);
    if (n.method === "session/update") {
      const params = (n.params ?? {}) as Record<string, unknown>;
      const update = (params.update ?? params) as Record<string, unknown>;
      bus.emit("update", {
        sessionId: params.sessionId as string | undefined,
        sessionUpdate: update.sessionUpdate as string | undefined,
        update,
        raw: n.params,
      } satisfies SessionUpdateEvent);
    }
  });

  peer.on("request", (req: { id: JsonRpcId; method: string; params: unknown }) => {
    const respond = (result: unknown) => peer.respond(req.id, result);
    const reject = (code: number, message: string) =>
      peer.respondError(req.id, code, message);

    if (options.onServerRequest) {
      void Promise.resolve(
        options.onServerRequest({
          id: req.id,
          method: req.method,
          params: req.params,
          respond,
          reject,
        }),
      ).catch((err: unknown) => {
        reject(-32000, err instanceof Error ? err.message : String(err));
      });
      return;
    }

    // Default: auto-allow common permission shapes for headless smoke tests
    if (
      req.method.includes("permission") ||
      req.method.includes("Permission")
    ) {
      respond({ outcome: { outcome: "selected", optionId: "allow-once" } });
      return;
    }
    reject(-32601, `Unhandled server request: ${req.method}`);
  });

  await peer.request(
    "initialize",
    {
      protocolVersion: 1,
      clientInfo: {
        name: options.clientName ?? "vscode-grok-acp",
        version: options.clientVersion ?? "0.2.0",
      },
      capabilities: {
        fs: { readTextFile: true, writeTextFile: true },
      },
    },
    30_000,
  );

  peer.notify("notifications/initialized", {});

  const mcpServers = (options.mcpServers ?? []).map(normalizeMcpServer);
  const newResult = (await peer.request(
    "session/new",
    { cwd: options.cwd, mcpServers },
    60_000,
  )) as { sessionId: string };

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
    async prompt(
      textOrContent: string | PromptContent[],
      extra: PromptContent[] = [],
    ): Promise<PromptResult> {
      const chunks: string[] = [];
      const thoughts: string[] = [];
      const onUpd = (ev: SessionUpdateEvent) => {
        if (ev.sessionId && ev.sessionId !== sessionId) return;
        const kind = ev.sessionUpdate;
        const content = ev.update.content as
          | { type?: string; text?: string }
          | undefined;
        if (kind === "agent_message_chunk" && content?.text) {
          chunks.push(content.text);
        }
        if (kind === "agent_thought_chunk" && content?.text) {
          thoughts.push(content.text);
        }
      };
      bus.on("update", onUpd);
      try {
        const prompt: PromptContent[] = Array.isArray(textOrContent)
          ? [...textOrContent, ...extra]
          : [{ type: "text", text: textOrContent }, ...extra];
        const raw = await peer.request(
          "session/prompt",
          { sessionId, prompt },
          timeout,
        );
        return {
          stopReason: (raw as { stopReason?: string })?.stopReason,
          text: chunks.join(""),
          thoughts: thoughts.join(""),
          raw,
        };
      } finally {
        bus.off("update", onUpd);
      }
    },
    async setMode(modeId: string): Promise<unknown> {
      return peer.request(
        "session/set_mode",
        { sessionId, modeId },
        15_000,
      );
    },
    onUpdate(handler: (ev: SessionUpdateEvent) => void) {
      bus.on("update", handler);
      return () => bus.off("update", handler);
    },
    onNotification(handler: (method: string, params: unknown) => void) {
      const fn = (method: string, params: unknown) => handler(method, params);
      bus.on("notification", fn);
      return () => bus.off("notification", fn);
    },
    dispose() {
      peer.dispose();
      bus.removeAllListeners();
      if (!child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    },
    send(message: unknown) {
      // low-level escape hatch
      child.stdin.write(`${JSON.stringify(message)}\n`);
    },
  };
}

function toNameValue(
  input?: Array<{ name: string; value: string }> | Record<string, string>,
): Array<{ name: string; value: string }> {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return Object.entries(input).map(([name, value]) => ({ name, value }));
}

function normalizeMcpServer(s: McpServerConfig): Record<string, unknown> {
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

function waitForSpawn(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
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
    setImmediate(() => {
      if (child.pid) {
        cleanup();
        resolve();
      }
    });
  });
}
