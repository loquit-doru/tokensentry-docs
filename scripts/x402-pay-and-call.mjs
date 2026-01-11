/* global fetch, console, process */

// Node 18+ recommended (built-in fetch).
// This is a *client* example showing the x402 flow:
// 1) call API -> 402 + x402-* headers
// 2) pay USDC on Base to x402-recipient
// 3) retry with x402-tx-hash

import { createPublicClient, createWalletClient, erc20Abi, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Base mainnet USDC
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function parseUsdcAmountToBaseUnits(price) {
  const m = String(price).trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*USDC$/i);
  if (!m) return null;

  const [intsRaw, fracRaw = ''] = m[1].split('.');
  const ints = (intsRaw || '0').replace(/^0+(?=\d)/, '') || '0';
  const frac = String(fracRaw).padEnd(6, '0').slice(0, 6);

  if (!/^\d+$/.test(ints)) return null;
  if (!/^\d{6}$/.test(frac)) return null;

  return BigInt(ints) * 1_000_000n + BigInt(frac);
}

async function callApi({ url, method, headers, body }) {
  const init = {
    method,
    headers: headers || {},
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.headers = { 'content-type': 'application/json', ...init.headers };
    init.body = body || '';
  }

  const res = await fetch(url, init);
  const text = await res.text();
  return { res, text };
}

async function main() {
  const apiUrl =
    process.env.API_CALL_URL ||
    'https://tokensentry.net/v1/risk/token?chain=base&address=0x4200000000000000000000000000000000000006';

  const method = String(process.env.API_METHOD || 'GET').toUpperCase();
  const rawBody = process.env.API_BODY;
  const body = rawBody ? String(rawBody) : undefined;

  console.log(`[x402] Calling API: ${method} ${apiUrl}`);
  const first = await callApi({ url: apiUrl, method, body });

  if (first.res.status !== 402) {
    console.log(`[x402] API status=${first.res.status}`);
    console.log(first.text);
    return;
  }

  const price = first.res.headers.get('x402-price');
  const recipient = first.res.headers.get('x402-recipient');
  const chain = first.res.headers.get('x402-chain');

  if (!price || !recipient || !chain) {
    throw new Error(
      `Missing x402 headers. price=${price} recipient=${recipient} chain=${chain}. Body=${first.text}`,
    );
  }

  if (String(chain).toLowerCase() !== 'base') {
    throw new Error(`This example supports only Base for now (x402-chain=${chain}).`);
  }

  const amount = parseUsdcAmountToBaseUnits(price);
  if (amount === null) throw new Error(`Unsupported price format: ${price}`);

  const dryRun = process.env.DRY_RUN === '1' || String(process.env.DRY_RUN).toLowerCase() === 'true';

  console.log(`[x402] 402 received. Need to pay ${price} to ${recipient} on ${chain}.`);
  if (dryRun) {
    console.log('[x402] DRY_RUN enabled; not sending on-chain transaction.');
    return;
  }

  const rpcUrl = mustGetEnv('RPC_URL_BASE');
  const pk = mustGetEnv('BOT_PRIVATE_KEY');

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) });

  console.log(`[x402] Sending USDC transfer from ${account.address}...`);
  const hash = await walletClient.writeContract({
    address: BASE_USDC,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, amount],
  });

  console.log(`[x402] txHash=${hash} (waiting for confirmation)`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[x402] confirmed status=${receipt.status}`);

  if (receipt.status !== 'success') {
    throw new Error(`Payment tx reverted: ${hash}`);
  }

  console.log('[x402] Retrying API with x402-tx-hash...');
  const second = await callApi({
    url: apiUrl,
    method,
    body,
    headers: { 'x402-tx-hash': hash },
  });
  console.log(`[x402] API status=${second.res.status}`);
  console.log(second.text);
}

main().catch((err) => {
  console.error(`[x402] ERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
