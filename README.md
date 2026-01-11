# TokenSentry Risk Oracle (Public Docs)

This repo is the public integration surface for TokenSentry.

- Website: https://tokensentry.net/
- Try in browser: https://tokensentry.net/try
- OpenAPI JSON (canonical): https://tokensentry.net/openapi.json
- Tools (OpenAI-compatible): https://tokensentry.net/tools/openai.json
- Tools (generic): https://tokensentry.net/tools.json
- Registry JSON: https://tokensentry.net/registry.json
- Public stats: https://tokensentry.net/stats

Start here:
- Quickstart: ./examples/quickstart.md
- Postman collection: ./postman_collection.json
- Scripts: ./scripts/README.md

## What it does
TokenSentry returns token risk signals for AI/bots before swaps.

Primary endpoints:
- `GET /v1/risk/token?chain=...&address=0x...` (x402 paywalled)
- `POST /v1/pretrade/check` (x402 paywalled, agent-friendly verdict + hints)
- `GET /v1/analyze/demo` (free demo)

## Quick demo

```bash
curl -i https://tokensentry.net/v1/analyze/demo
```

## Postman

Import the collection:
- `postman_collection.json`

Or import directly from OpenAPI:
- https://tokensentry.net/openapi.json

## Paid calls (x402 flow)
Unpaid requests return `402 Payment Required` and pricing headers:
- `x402-price`
- `x402-chain`
- `x402-recipient`

Client flow:
1. Call the endpoint → receive `402` + `x402-*` headers
2. Pay `x402-price` (USDC) on Base to `x402-recipient`
3. Retry the *same request* with `x402-tx-hash: 0x...`

Example (risk endpoint):

```bash
curl -i "https://tokensentry.net/v1/risk/token?chain=base&address=0x4200000000000000000000000000000000000006"
```

Then retry with:

```bash
curl -i "https://tokensentry.net/v1/risk/token?chain=base&address=0x4200000000000000000000000000000000000006" \
  -H "x402-tx-hash: 0xYOUR_TX_HASH"
```

## OpenAPI / SDK generation
Use the canonical spec URL for generators (Kiota, Postman import, etc.):
- https://tokensentry.net/openapi.json

## Notes
- This repo is intentionally documentation-only.
- The production service is hosted at `tokensentry.net`.
