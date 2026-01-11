import { TokenSentryClient } from '../tokensentry.js';

async function main() {
  const client = new TokenSentryClient({ baseUrl: 'https://tokensentry.net' });

  const r = await client.pretradeCheck({
    chain: 'base',
    address: '0x4200000000000000000000000000000000000006',
    direction: 'sell',
  });

  if (r.ok) {
    console.log('OK', r.data);
    return;
  }

  if (r.status === 402) {
    console.log('PAYMENT REQUIRED', r.payment);
    return;
  }

  console.error('ERROR', r.status, r.error, r.code, r.body);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
