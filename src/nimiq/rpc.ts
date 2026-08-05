export type SettlementVerification = {
  transactionFound: boolean;
  included: boolean;
  recipientMatches: boolean;
  amountMatches: boolean;
  dataMatches: boolean;
  blockHeight?: number;
  checkedAt: string;
};

export type VerifySettlementInput = {
  transactionHash: string;
  recipient: string;
  amountLuna: number;
  transactionData: string;
};

export type VerifySettlementResult = {
  state: 'confirmed' | 'pending' | 'verification-failed';
  verification: SettlementVerification;
  error?: string;
};

const DEFAULT_RPC_URL = 'https://rpc.nimiqwatch.com';

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_RPC_URL;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function first(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function normalizeAddress(value: unknown): string {
  return typeof value === 'string' ? value.replaceAll('_', '').replace(/\s+/gu, '').toUpperCase() : '';
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function decodeHex(value: string): string | null {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(normalized)) return null;
  try {
    const bytes = Uint8Array.from(normalized.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
    return new TextDecoder().decode(bytes).replace(/\0+$/u, '');
  } catch {
    return null;
  }
}

function normalizeData(value: unknown): string {
  if (typeof value === 'string') {
    const decoded = decodeHex(value);
    return decoded?.startsWith('PP1:') ? decoded : value.replace(/\0+$/u, '');
  }
  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && Number(item) >= 0 && Number(item) <= 255)) {
    return new TextDecoder().decode(Uint8Array.from(value as number[])).replace(/\0+$/u, '');
  }
  const record = asRecord(value);
  if (record) return normalizeData(first(record, ['data', 'bytes', 'value']));
  return '';
}

function extractTransaction(result: unknown): Record<string, unknown> | null {
  const record = asRecord(result);
  if (!record) return null;
  const nested = first(record, ['transaction', 'tx', 'executedTransaction']);
  return asRecord(nested) ?? record;
}

function blockHeight(record: Record<string, unknown>): number | undefined {
  const direct = normalizeInteger(first(record, ['blockNumber', 'blockHeight', 'block_number', 'block_height']));
  if (direct !== null) return direct;
  const block = asRecord(first(record, ['block', 'blockInfo', 'block_info']));
  const nested = block ? normalizeInteger(first(block, ['number', 'height', 'blockNumber', 'block_number'])) : null;
  return nested ?? undefined;
}

export async function verifyNimiqSettlement(input: VerifySettlementInput): Promise<VerifySettlementResult> {
  if (!input.transactionHash.trim()) throw new Error('A transaction hash is required for verification.');

  const response = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getTransactionByHash',
      params: [input.transactionHash.trim()],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status}.`);
  const body = await response.json() as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || 'Nimiq RPC rejected the verification request.');

  const transaction = extractTransaction(body.result);
  const checkedAt = new Date().toISOString();
  if (!transaction) {
    return {
      state: 'pending',
      verification: {
        transactionFound: false,
        included: false,
        recipientMatches: false,
        amountMatches: false,
        dataMatches: false,
        checkedAt,
      },
    };
  }

  const recipient = normalizeAddress(first(transaction, ['recipient', 'recipientAddress', 'recipient_address', 'to']));
  const value = normalizeInteger(first(transaction, ['value', 'amount', 'valueLuna', 'value_luna']));
  const data = normalizeData(first(transaction, ['data', 'recipientData', 'recipient_data', 'extraData', 'extra_data']));
  const height = blockHeight(transaction);
  const includedFlag = first(transaction, ['included', 'confirmed', 'executed']);
  const included = height !== undefined || includedFlag === true;

  const verification: SettlementVerification = {
    transactionFound: true,
    included,
    recipientMatches: recipient === normalizeAddress(input.recipient),
    amountMatches: value === input.amountLuna,
    dataMatches: data === input.transactionData,
    blockHeight: height,
    checkedAt,
  };

  if (!included) return { state: 'pending', verification };
  const matches = verification.recipientMatches && verification.amountMatches && verification.dataMatches;
  return matches
    ? { state: 'confirmed', verification }
    : {
        state: 'verification-failed',
        verification,
        error: 'The included Nimiq transaction does not match this PactPay receipt.',
      };
}
