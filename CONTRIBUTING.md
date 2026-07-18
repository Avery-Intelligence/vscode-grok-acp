# Contributing

## Boundary rules

This repository is **open-source and product-agnostic**.

| Allowed | Not allowed |
|---------|-------------|
| Generic ACP host fixes | Private product UI, branding, or APIs |
| Grok CLI discovery / spawn | Hardcoded product endpoints or keys |
| Permission / diff helpers | Imports from private monorepos |
| Tests and docs for ACP | “Momental-only” or “Humfrid-only” features |

If a change only makes sense for one commercial product, implement it in that product’s private repo and keep this package generic.

## Developer Certificate of Origin (DCO)

By contributing, you certify that you have the right to submit the work under the MIT license (DCO 1.1). Sign commits:

```bash
git commit -s -m "feat: ..."
```

## Setup

```bash
npm install
npm run compile
npm test
```

## Pull requests

1. Keep PRs focused.
2. Run `npm run check:boundary` (denylist scan).
3. Do not include secrets, customer data, or private paths.
