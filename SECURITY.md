# Security Policy

## Scope

`vscode-grok-acp` is a local host for the official Grok Build CLI over ACP (stdio).

## Reporting

Report vulnerabilities privately to the maintainers via GitHub Security Advisories on this repository (preferred), or the security contact listed on the organization profile.

Do **not** open public issues for sensitive reports.

## Expectations

- No hardcoded credentials in source or CI.
- No network calls to product backends from this package except what the `grok` binary itself performs after user login / `XAI_API_KEY`.
- Shell and file tool calls from the agent must go through explicit user permission UI in any consumer extension.

## Out of scope

- Bugs in the upstream `grok` CLI or xAI services
- Misconfiguration of user API keys
