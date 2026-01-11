# Quickstart (60 seconds)

## 1) Free demo (no payment)

```bash
curl -i https://tokensentry.net/v1/analyze/demo
```

## 2) Unpaid call (expect 402)

```bash
curl -i "https://tokensentry.net/v1/risk/token?chain=base&address=0x4200000000000000000000000000000000000006"
```

You’ll receive `402 Payment Required` and headers:
- `x402-price`
- `x402-chain`
- `x402-recipient`

## 3) Pay + retry

Send a USDC transfer on Base to `x402-recipient` for at least `x402-price`, then retry the *same request* with:

```bash
curl -i "https://tokensentry.net/v1/risk/token?chain=base&address=0x4200000000000000000000000000000000000006" \
  -H "x402-tx-hash: 0xYOUR_TX_HASH"
```

## 4) Optional: automated pay+retry (Node)

See [scripts/x402-pay-and-call.mjs](../scripts/x402-pay-and-call.mjs).
