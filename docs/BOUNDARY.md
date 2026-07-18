# Isolation boundary

This repository is **public MIT** and must remain free of private product code.

## Never commit here

- Momental / Humfrid product UI, auth, or API clients
- Imports from `Avery-Intelligence/momental` or `@momental/*`
- Hardcoded `mcp.momentalos.com` / `mcp.humfrid.com` credentials or product-only tool allowlists
- Customer data, internal prompts, CLAUDE.md from the monorepo

## Allowed

- Generic ACP + Grok CLI process management
- Configurable MCP attachment **by consumer** (product passes URL/token at runtime)
- Descriptive mentions of Grok Build for compatibility

## Consumers

Private product (e.g. Humfrid VS Code extension) depends on published releases of this package via npm or git tags. Never the reverse.
