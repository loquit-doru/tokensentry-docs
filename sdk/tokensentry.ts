export type SupportedChain = 'base' | 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'bsc';

export type PaymentRequiredInfo = {
  price: string;
  recipient: string;
  chain: string;
  reason?: string;
};

export type PaymentRequiredResult = {
  ok: false;
  status: 402;
  payment: PaymentRequiredInfo;
  body?: unknown;
};

export type ApiErrorResult = {
  ok: false;
  status: number;
  error?: string;
  code?: string;
  body?: unknown;
};

export type ApiOkResult<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ApiResult<T> = ApiOkResult<T> | PaymentRequiredResult | ApiErrorResult;

export type TokenRiskResponse = Record<string, unknown>;
export type PretradeCheckResponse = Record<string, unknown>;

export type TokenSentryClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  const u = String(baseUrl || '').trim() || 'https://tokensentry.net';
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return undefined;

  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractPaymentRequiredInfo(res: Response): PaymentRequiredInfo {
  const price = res.headers.get('x402-price') || '';
  const recipient = res.headers.get('x402-recipient') || '';
  const chain = res.headers.get('x402-chain') || '';
  const reason = res.headers.get('x402-reason') || undefined;

  return { price, recipient, chain, reason };
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | undefined | null>): string {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export class TokenSentryClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultTimeoutMs?: number;

  constructor(opts: TokenSentryClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl || 'https://tokensentry.net');
    this.fetchImpl = opts.fetchImpl || fetch;
    this.defaultTimeoutMs = opts.defaultTimeoutMs;
  }

  /**
   * GET /v1/risk/token
   *
   * If unpaid, returns ok=false with status=402 and `payment` headers.
   */
  async riskToken(input: {
    chain: SupportedChain;
    address: string;
    timeoutMs?: number;
    txHash?: string;
  }): Promise<ApiResult<TokenRiskResponse>> {
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;

    const url = buildUrl(this.baseUrl, '/v1/risk/token', {
      chain: input.chain,
      address: input.address,
      timeout_ms: timeoutMs,
    });

    const headers: Record<string, string> = {};
    if (input.txHash) headers['x402-tx-hash'] = input.txHash;

    const res = await this.fetchImpl(url, { method: 'GET', headers });

    if (res.status === 402) {
      const body = await readJsonOrText(res);
      return { ok: false, status: 402, payment: extractPaymentRequiredInfo(res), body };
    }

    const body = await readJsonOrText(res);

    if (!res.ok) {
      const maybeObj = (body && typeof body === 'object') ? (body as any) : undefined;
      return {
        ok: false,
        status: res.status,
        error: maybeObj?.error,
        code: maybeObj?.code,
        body,
      };
    }

    return { ok: true, status: res.status, data: (body || {}) as TokenRiskResponse };
  }

  /**
   * POST /v1/pretrade/check
   *
   * If unpaid, returns ok=false with status=402 and `payment` headers.
   */
  async pretradeCheck(input: {
    chain: SupportedChain;
    address: string;
    direction?: 'buy' | 'sell';
    amount?: string | number;
    slippage_bps?: string | number;
    wallet?: string;
    timeoutMs?: number;
    txHash?: string;
  }): Promise<ApiResult<PretradeCheckResponse>> {
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;

    const url = buildUrl(this.baseUrl, '/v1/pretrade/check', {
      timeout_ms: timeoutMs,
    });

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (input.txHash) headers['x402-tx-hash'] = input.txHash;

    const bodyIn = {
      chain: input.chain,
      address: input.address,
      direction: input.direction,
      amount: input.amount,
      slippage_bps: input.slippage_bps,
      wallet: input.wallet,
    };

    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyIn),
    });

    if (res.status === 402) {
      const body = await readJsonOrText(res);
      return { ok: false, status: 402, payment: extractPaymentRequiredInfo(res), body };
    }

    const body = await readJsonOrText(res);

    if (!res.ok) {
      const maybeObj = (body && typeof body === 'object') ? (body as any) : undefined;
      return {
        ok: false,
        status: res.status,
        error: maybeObj?.error,
        code: maybeObj?.code,
        body,
      };
    }

    return { ok: true, status: res.status, data: (body || {}) as PretradeCheckResponse };
  }
}
