# Scripts

## x402 pay + retry (Node)

File: `scripts/x402-pay-and-call.mjs`

This script demonstrates a full x402 flow against `tokensentry.net`:
- Call API → receive 402 + `x402-*` pricing headers
- Pay USDC on Base to `x402-recipient`
- Retry with `x402-tx-hash`

### Requirements
- Node 18+

### Install dependencies

```bash
npm i viem
```

### Run (dry run)

```bash
DRY_RUN=1 node scripts/x402-pay-and-call.mjs
```

### Run (real)

Set:
- `RPC_URL_BASE` (Base JSON-RPC)
- `BOT_PRIVATE_KEY` (wallet private key; keep it safe)

Then:

```bash
node scripts/x402-pay-and-call.mjs
```

Optional overrides:
- `API_CALL_URL` (full URL)
- `API_METHOD` (`GET`/`POST`)
- `API_BODY` (raw JSON string)
