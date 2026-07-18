import { JsonRpcPeer, type JsonRpcId } from "./jsonrpc";
/** ACP McpServer — env/headers are name/value arrays (not plain objects). */
export interface McpServerConfig {
    name: string;
    /** stdio (default if command set) | http | sse */
    type?: "stdio" | "http" | "sse";
    command?: string;
    args?: string[];
    env?: Array<{
        name: string;
        value: string;
    }> | Record<string, string>;
    cwd?: string | null;
    url?: string;
    headers?: Array<{
        name: string;
        value: string;
    }> | Record<string, string>;
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
export type PromptContent = {
    type: "text";
    text: string;
} | {
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
    prompt(textOrContent: string | PromptContent[], extra?: PromptContent[]): Promise<PromptResult>;
    setMode(modeId: string): Promise<unknown>;
    onUpdate(handler: (ev: SessionUpdateEvent) => void): () => void;
    onNotification(handler: (method: string, params: unknown) => void): () => void;
    dispose(): void;
    /** @deprecated use peer / prompt */
    send(message: unknown): void;
}
export declare function createGrokAcpSession(options: CreateGrokAcpSessionOptions): Promise<GrokAcpSession>;
//# sourceMappingURL=session.d.ts.map