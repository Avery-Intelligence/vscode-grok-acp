# Grok Build ACP protocol notes (spike)

**CLI under test:** `grok 0.2.103`  
**Date:** 2026-07-17  
**Transport:** `grok agent stdio` — newline-delimited JSON-RPC 2.0 on stdin/stdout  

Not affiliated with xAI. Notes for implementers of this host only.

## Handshake (verified)

### 1. `initialize`

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientInfo": { "name": "vscode-grok-acp", "version": "0.1.0" },
    "capabilities": {}
  }
}
```

**Result (selected fields):**
- `protocolVersion`: `1`
- `agentCapabilities`: `loadSession`, `promptCapabilities.embeddedContext`, `mcpCapabilities.http` / `sse`
- `authMethods`: `cached_token` (`~/.grok/auth.json`), `grok.com` browser sign-in
- `_meta.modelState.currentModelId`: e.g. `grok-4.5`
- `_meta.availableCommands`: compact, always-approve, context, session-info, goal, …

### 2. Async notifications after initialize

- `_x.ai/mcp/servers_updated` — configured MCP servers
- `_x.ai/announcements/update`
- `_x.ai/settings/update` — UI gates, permission_mode, subscription tier display

### 3. `session/new`

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/new",
  "params": {
    "cwd": "/path/to/workspace",
    "mcpServers": []
  }
}
```

**Result:**
- `sessionId` (UUID string)
- `models`
- `_meta`

Then `session/update` notifications and `_x.ai/mcp/init_progress`.

## MCP attachment

Agent advertises `mcpCapabilities.http` and `sse`.  
`session/new` requires `mcpServers` (array; may be empty).

### Stdio (verified)

```json
{
  "name": "local",
  "command": "/abs/path/to/server",
  "args": [],
  "env": [],
  "cwd": null
}
```

`env` is `[{ "name": "K", "value": "V" }]`, not a map.

### HTTP (verified with Grok 0.2.103)

```json
{
  "type": "http",
  "name": "humfrid",
  "url": "https://example.com/mcp",
  "headers": [{ "name": "Authorization", "value": "Bearer …" }]
}
```

**Rule for this OSS package:** accept consumer-provided MCP server configs only. Never hardcode Momental/Humfrid endpoints.

## Phase 1 implementation checklist

- [ ] Request/response correlator with timeouts
- [ ] `session/prompt` (or equivalent method name — confirm next spike)
- [ ] Stream `session/update` → text / tool / permission
- [ ] Permission decision responses
- [ ] `session/cancel`
- [ ] `session/load` if resuming (`loadSession: true`)
- [ ] Map edit tool calls → host diff UI
- [ ] Document exact `mcpServers` entry for HTTP Bearer MCP

## Smoke command

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1,"clientInfo":{"name":"spike","version":"0"},"capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"session/new","params":{"cwd":"/tmp","mcpServers":[]}}' \
  | grok agent stdio
```
