import * as vscode from "vscode";
import { resolveGrokCliPath } from "./cli-path";
import { createGrokAcpSession } from "./acp/session";

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
        const session = await createGrokAcpSession({
          cliPath,
          cwd,
          onServerRequest: async (req) => {
            if (req.method.toLowerCase().includes("permission")) {
              const pick = await vscode.window.showQuickPick(
                [
                  { label: "Allow once", id: "allow-once" },
                  { label: "Allow always", id: "allow-always" },
                  { label: "Reject", id: "reject" },
                ],
                { placeHolder: `Grok permission: ${req.method}` },
              );
              if (!pick || pick.id === "reject") {
                req.respond({
                  outcome: { outcome: "selected", optionId: "reject" },
                });
                return;
              }
              req.respond({
                outcome: { outcome: "selected", optionId: pick.id },
              });
              return;
            }
            req.reject(-32601, `Unhandled: ${req.method}`);
          },
        });

        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Grok ACP smoke prompt…",
            cancellable: false,
          },
          async () =>
            session.prompt("Reply with exactly the single word: pong"),
        );

        void vscode.window.showInformationMessage(
          `Grok ACP OK (session ${session.sessionId.slice(0, 8)}…): ${result.text.slice(0, 80)}`,
        );
        session.dispose();
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

export { createGrokAcpSession } from "./acp/session";
export { resolveGrokCliPath } from "./cli-path";
export type {
  GrokAcpSession,
  CreateGrokAcpSessionOptions,
  McpServerConfig,
} from "./acp/session";
