import * as vscode from "vscode";
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
export { createGrokAcpSession } from "./acp/session";
export { resolveGrokCliPath } from "./cli-path";
export type { GrokAcpSession, CreateGrokAcpSessionOptions, McpServerConfig, } from "./acp/session";
//# sourceMappingURL=extension.d.ts.map