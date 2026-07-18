"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGrokCliPath = exports.createGrokAcpSession = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const cli_path_1 = require("./cli-path");
const session_1 = require("./acp/session");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("grokAcp.open", async () => {
        const configured = vscode.workspace
            .getConfiguration("grokAcp")
            .get("cliPath", "");
        const cliPath = (0, cli_path_1.resolveGrokCliPath)(configured || undefined);
        if (!cliPath) {
            void vscode.window.showErrorMessage("Grok CLI not found. Install Grok Build (https://x.ai/cli) or set grokAcp.cliPath.");
            return;
        }
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
        try {
            const session = await (0, session_1.createGrokAcpSession)({
                cliPath,
                cwd,
                onServerRequest: async (req) => {
                    if (req.method.toLowerCase().includes("permission")) {
                        const pick = await vscode.window.showQuickPick([
                            { label: "Allow once", id: "allow-once" },
                            { label: "Allow always", id: "allow-always" },
                            { label: "Reject", id: "reject" },
                        ], { placeHolder: `Grok permission: ${req.method}` });
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
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Grok ACP smoke prompt…",
                cancellable: false,
            }, async () => session.prompt("Reply with exactly the single word: pong"));
            void vscode.window.showInformationMessage(`Grok ACP OK (session ${session.sessionId.slice(0, 8)}…): ${result.text.slice(0, 80)}`);
            session.dispose();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            void vscode.window.showErrorMessage(`Grok ACP failed: ${message}`);
        }
    }));
}
function deactivate() {
    // no-op
}
var session_2 = require("./acp/session");
Object.defineProperty(exports, "createGrokAcpSession", { enumerable: true, get: function () { return session_2.createGrokAcpSession; } });
var cli_path_2 = require("./cli-path");
Object.defineProperty(exports, "resolveGrokCliPath", { enumerable: true, get: function () { return cli_path_2.resolveGrokCliPath; } });
//# sourceMappingURL=extension.js.map