import type { SettlementVerification } from '../domain/model';

export type VerifySettlementInput = {
  transactionHash: string;
  recipient: string;
  amountLuna: number;
  transactionData: string;
};

export type VerifySettlementResult = {
  state: 'confirmed' | 'pending' | 'verification-failed';
  verification: SettlementVerification;
  checkedAt: string;
  error?: string;
};

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL;
  if (typeof configured !== 'string' || !configured.trim()) {
    throw new Error('Nimiq RPC verification is not configured. Set VITE_NIMIQ_RPC_URL and redeploy.');
  }
  return configured.trim();
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
  return typeof value === 'string'
    ? value.replaceAll('_', '').replace(/\s+/gu, '').toUpperCase()
    : '';
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function normalizeHash(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^0x/u, '').toLowerCase() : '';
}

function decodeHex(value: string): string | null {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(normalized)) return null;
  try {
    const pairs = normalized.match(/.{2}/gu) ?? [];
    const bytes = Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
    return new TextDecoder().decode(bytes).replace(/\0+$/u, '');
  } catch {
    return null;
  }
}

function decodeBase64(value: string): string | null {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes).replace(/\0+$/u, '');
  } catch {
    return null;
  }
}

function normalizeData(value: unknown): string {
  if (typeof value === 'string') {
    const plain = value.replace(/\0+$/u, '');
    if (plain.startsWith('PP1:')) return plain;
    const hex = decodeHex(value);
    if (hex?.startsWith('PP1:')) return hex;
    const base64 = decodeBase64(value);
    if (base64?.startsWith('PP1:')) return base64;
    return plain;
  }

  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && Number(item) >= 0 && Number(item) <= 255)) {
    return new TextDecoder().decode(Uint8Array.from(value as number[])).replace(/\0+$/u, '');
  }

  const nested = asRecord(value);
  return nested ? normalizeData(first(nested, ['data', 'bytes', 'value'])) : '';
}

function extractTransaction(result: unknown): {
  transaction: Record<string, unknown>;
  metadata: Record<string, unknown>;
} | null {
  const outer = asRecord(result);
  if (!outer) return null;

  const data = asRecord(outer.data);
  const metadata = asRecord(outer.metadata) ?? {};
  if (data) return { transaction: data, metadata };

  const nested = asRecord(first(outer, ['transaction', 'tx', 'executedTransaction']));
  return { transaction: nested ?? outer, metadata };
}

function blockHeight(
  transaction: Record<string, unknown>,
  metadata: Record<string, unknown>,
): number | undefined {
  const direct = normalizeInteger(first(transaction, [
    'blockNumber',
    'blockHeight',
    'block_number',
    'block_height',
    'height',
  ]));
  if (direct !== null) return direct;

  const fromMetadata = normalizeInteger(first(metadata, [
    'blockNumber',
    'blockHeight',
    'block_number',
    'block_height',
    'height',
  ]));
  if (fromMetadata !== null) return fromMetadata;

  const block = asRecord(first(transaction, ['block', 'blockInfo', 'block_info']));
  const nested = block
    ? normalizeInteger(first(block, ['number', 'height', 'blockNumber', 'block_number']))
    : null;
  return nested ?? undefined;
}

function pendingResult(checkedAt: string): VerifySettlementResult {
  return {
    state: 'pending',
    checkedAt,
    verification: {
      transactionFound: false,
      included: false,
      hashMatches: false,
      recipientMatches: false,
      amountMatches: false,
      dataMatches: false,
    },
  };
}

export async function verifyNimiqSettlement(
  input: VerifySettlementInput,
): Promise<VerifySettlementResult> {
  const expectedHash = normalizeHash(input.transactionHash);
  if (!expectedHash) throw new Error('A transaction hash is required for verification.');

  let response: Response;
  try {
    response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getTransactionByHash',
        params: [input.transactionHash.trim()],
        id: 1,
      }),
    });
  } catch {
    throw new Error('The configured Nimiq RPC endpoint could not be reached.');
  }

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status}.`);
  const body = await response.json() as { result?: unknown; error?: { message?: string } };
  const checkedAt = new Date().toISOString();

  if (body.error) {
    const message = body.error.message || 'Nimiq RPC rejected the verification request.';
    if (/not found|unknown transaction|missing/iu.test(message)) return pendingResult(checkedAt);
    throw new Error(message);
  }

  const fetched = extractTransaction(body.result);
  if (!fetched) return pendingResult(checkedAt);

  const { transaction, metadata } = fetched;
  const returnedHash = normalizeHash(first(transaction, ['hash', 'transactionHash', 'transaction_hash']));
  const recipient = normalizeAddress(first(transaction, ['recipient', 'recipientAddress', 'recipient_address', 'to']));
  const value = normalizeInteger(first(transaction, ['value', 'amount', 'valueLuna', 'value_luna', 'valueInLuna']));
  const data = normalizeData(first(transaction, ['data', 'recipientData', 'recipient_data', 'extraData', 'extra_data', 'transactionData']));
  const height = blockHeight(transaction, metadata);
  const includedFlag = first(transaction, ['included', 'confirmed', 'executed']);
  const included = height !== undefined || includedFlag === true;

  const verification: SettlementVerification = {
    transactionFound: true,
    included,
    hashMatches: !returnedHash || returnedHash === expectedHash,
    recipientMatches: recipient === normalizeAddress(input.recipient),
    amountMatches: value === input.amountLuna,
    dataMatches: data === input.transactionData,
    ...(height !== undefined ? { blockHeight: height } : {}),
  };

  if (!included) return { state: 'pending', verification, checkedAt };

  const matches = verification.hashMatches
    && verification.recipientMatches
    && verification.amountMatches
    && verification.dataMatches;

  return matches
    ? { state: 'confirmed', verification, checkedAt }
    : {
        state: 'verification-failed',
        verification,
        checkedAt,
        error: 'The included Nimiq transaction does not match this PactPay receipt.',
      };
}
