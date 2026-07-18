import * as vscode from "vscode";
/**
 * Thin dev host. Product UIs (e.g. Humfrid) should depend on the library
 * exports and own their own webviews — not ship this command as the product.
 */
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
export { createGrokAcpSession } from "./acp/session";
export { resolveGrokCliPath } from "./cli-path";
export type { GrokAcpSession, CreateGrokAcpSessionOptions } from "./acp/session";
//# sourceMappingURL=extension.d.ts.map