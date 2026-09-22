# vscode-grok-acp

Proprietary **Agent Client Protocol (ACP)** host library and thin VS Code extension for [Grok Build](https://x.ai/cli) (`grok agent stdio`).

**Not affiliated with, endorsed by, or sponsored by xAI.**  
“Grok”, “Grok Build”, and “xAI” are trademarks of xAI; used here only to describe compatibility.

## What this is

| Layer | Role |
|-------|------|
| **This repo** | Generic ACP host: spawn official `grok`, chat, permissions, diffs |
| **Your product** | Branding, auth UX, and extra tabs (e.g. Humfrid) live in a **separate private** project |

Dependency direction is one-way: **private product → this package**. This package never imports private product code.

## Requirements

- VS Code 1.98+ (or compatible fork)
- [Grok Build CLI](https://docs.x.ai/build/overview) (`grok`) on `PATH` or configured path
- Eligible xAI account (e.g. SuperGrok / X Premium+) **or** `XAI_API_KEY` — eligibility is determined by xAI, not this project

## Install (development)

```bash
npm install
npm run compile
# F5 in VS Code to launch Extension Development Host
```

## Library usage (from a private extension)

```ts
import { createGrokAcpSession } from "vscode-grok-acp";

// Product extension owns webview UI and wires this host.
```

## Brand & trademark

- Do **not** name third-party products “Grok …” or “Brand + Grok” as the app title ([xAI Brand Guidelines](https://x.ai/legal/brand-guidelines)).
- Accurate descriptive copy (“works with Grok Build”, “requires the Grok Build CLI”) is fine with a clear non-affiliation notice.

## Security

See [SECURITY.md](./SECURITY.md). This host only spawns the local `grok` process and speaks ACP over stdio. It does not ship API keys.

## License

Copyright (c) 2026 Avery Intelligence Inc. All rights reserved. Proprietary and confidential.

