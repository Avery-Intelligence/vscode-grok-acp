import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Resolve the Grok Build CLI binary.
 * Order: explicit path → PATH → ~/.grok/bin/grok
 */
export function resolveGrokCliPath(configured?: string): string | undefined {
  if (configured && configured.trim()) {
    const p = configured.trim();
    if (fs.existsSync(p)) return p;
  }

  const fromPath = which("grok");
  if (fromPath) return fromPath;

  const homeDefault = path.join(os.homedir(), ".grok", "bin", "grok");
  if (fs.existsSync(homeDefault)) return homeDefault;

  // Windows
  const homeDefaultWin = path.join(os.homedir(), ".grok", "bin", "grok.exe");
  if (fs.existsSync(homeDefaultWin)) return homeDefaultWin;

  return undefined;
}

function which(cmd: string): string | undefined {
  const pathEnv = process.env.PATH ?? "";
  const parts = pathEnv.split(path.delimiter);
  const names =
    process.platform === "win32" ? [`${cmd}.exe`, cmd] : [cmd];

  for (const dir of parts) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch {
        // ignore
      }
    }
  }
  return undefined;
}
