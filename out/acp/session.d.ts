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
export declare function createGrokAcpSession(options: CreateGrokAcpSessionOptions): Promise<GrokAcpSession>;
//# sourceMappingURL=session.d.ts.map