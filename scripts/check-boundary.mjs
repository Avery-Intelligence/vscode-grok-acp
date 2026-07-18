#!/usr/bin/env node
/**
 * Fail if private product / secret patterns appear in the OSS tree.
 * Keep this package legally and technically isolated from Momental/Humfrid product code.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const SKIP_DIRS = new Set([
  "node_modules",
  "out",
  "dist",
  ".git",
  ".vscode-test",
]);

// Patterns that must not appear in OSS source (allowlisted files may mention isolation rules).
const FORBIDDEN = [
  { re: /packages\/(api|worker|webapp|database)\//i, msg: "monorepo package path" },
  { re: /@momental\//i, msg: "private @momental package import" },
  { re: /mcp\.momentalos\.com/i, msg: "product MCP host (use consumer config, not hardcode)" },
  { re: /mcp\.humfrid\.com/i, msg: "product MCP host (use consumer config, not hardcode)" },
  { re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/i, msg: "private key material" },
  { re: /gho_[A-Za-z0-9]{20,}/, msg: "GitHub token" },
  { re: /xai-[A-Za-z0-9]{20,}/, msg: "xAI API key shape" },
];

const ALLOWLIST = new Set([
  "scripts/check-boundary.mjs",
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/BOUNDARY.md",
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const files = walk(root);
const violations = [];

for (const file of files) {
  const rel = relative(root, file);
  if (ALLOWLIST.has(rel)) continue;
  if (rel.endsWith(".png") || rel.endsWith(".jpg") || rel.endsWith(".vsix")) continue;

  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const { re, msg } of FORBIDDEN) {
    if (re.test(text)) {
      violations.push(`${rel}: ${msg} (matched ${re})`);
    }
  }
}

if (violations.length) {
  console.error("Boundary check FAILED:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log("Boundary check OK (" + files.length + " files scanned).");
