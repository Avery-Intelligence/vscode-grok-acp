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
exports.resolveGrokCliPath = resolveGrokCliPath;
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
/**
 * Resolve the Grok Build CLI binary.
 * Order: explicit path → PATH → ~/.grok/bin/grok
 */
function resolveGrokCliPath(configured) {
    if (configured && configured.trim()) {
        const p = configured.trim();
        if (fs.existsSync(p))
            return p;
    }
    const fromPath = which("grok");
    if (fromPath)
        return fromPath;
    const homeDefault = path.join(os.homedir(), ".grok", "bin", "grok");
    if (fs.existsSync(homeDefault))
        return homeDefault;
    // Windows
    const homeDefaultWin = path.join(os.homedir(), ".grok", "bin", "grok.exe");
    if (fs.existsSync(homeDefaultWin))
        return homeDefaultWin;
    return undefined;
}
function which(cmd) {
    const pathEnv = process.env.PATH ?? "";
    const parts = pathEnv.split(path.delimiter);
    const names = process.platform === "win32" ? [`${cmd}.exe`, cmd] : [cmd];
    for (const dir of parts) {
        for (const name of names) {
            const candidate = path.join(dir, name);
            try {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                    return candidate;
                }
            }
            catch {
                // ignore
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=cli-path.js.map