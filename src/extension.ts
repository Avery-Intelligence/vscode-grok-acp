import * as vscode from "vscode";
import { resolveGrokCliPath } from "./cli-path";
import { createGrokAcpSession } from "./acp/session";

/**
 * Thin dev host. Product UIs (e.g. Humfrid) should depend on the library
 * exports and own their own webviews — not ship this command as the product.
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("grokAcp.open", async () => {
      const configured = vscode.workspace
        .getConfiguration("grokAcp")
        .get<string>("cliPath", "");
      const cliPath = resolveGrokCliPath(configured || undefined);
      if (!cliPath) {
        void vscode.window.showErrorMessage(
          "Grok CLI not found. Install Grok Build (https://x.ai/cli) or set grokAcp.cliPath.",
        );
        return;
      }

      const cwd =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

      try {
        const session = await createGrokAcpSession({ cliPath, cwd });
        void vscode.window.showInformationMessage(
          `Grok ACP host ready (${cliPath}). Session scaffold only — implement UI in your product extension.`,
        );
        context.subscriptions.push({ dispose: () => session.dispose() });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(`Grok ACP failed: ${message}`);
      }
    }),
  );
}

export function deactivate(): void {
  // no-op
}

// Public library surface for product extensions
export { createGrokAcpSession } from "./acp/session";
export { resolveGrokCliPath } from "./cli-path";
export type { GrokAcpSession, CreateGrokAcpSessionOptions } from "./acp/session";
