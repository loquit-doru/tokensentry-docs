# TypeScript SDK (minimal)

File: `sdk/tokensentry.ts`

Goals:
- Make integration copy/paste simple.
- Handle the x402 unpaid response shape (HTTP 402 + `x402-*` headers).
- Do **not** auto-pay; you control payment UX and retries.

## Usage

```ts
import { TokenSentryClient } from './sdk/tokensentry.js';

const client = new TokenSentryClient({ baseUrl: 'https://tokensentry.net' });

const r1 = await client.riskToken({
  chain: 'base',
  address: '0x4200000000000000000000000000000000000006',
});

if (!r1.ok && r1.status === 402) {
  console.log('Need payment:', r1.payment);
  console.log('Request id:', r1.requestId);
  // Pay `r1.payment.price` USDC on Base to `r1.payment.recipient`.
  // Then retry with your tx hash:
  const txHash = '0x...';

  const r2 = await client.riskToken({
    chain: 'base',
    address: '0x4200000000000000000000000000000000000006',
    txHash,
  });

  console.log(r2);
}
```

## Notes
- The SDK returns a tagged union `{ ok: true } | { ok: false }` so you can handle 402 cleanly.
- `requestId` is populated from the `x-request-id` response header (useful for support/debug).
- For structured response fields, use the OpenAPI schema:
  - https://tokensentry.net/openapi.json
