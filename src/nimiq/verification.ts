export type SettlementVerification = {
  transactionFound: boolean;
  included: boolean;
  hashMatches: boolean;
  recipientMatches: boolean;
  amountMatches: boolean;
  dataMatches: boolean;
  blockHeight?: number;
};

export type VerifySettlementInput = {
  transactionHash: string;
  recipient: string;
  amountLuna: number;
  transactionData: string;
};

export type VerifySettlementResult = {
  state: 'confirming' | 'confirmed' | 'verification-failed';
  verification: SettlementVerification;
  error?: string;
};

type JsonRpcResponse = {
  result?: unknown;
  error?: { code?: number; message?: string };
};

const DEFAULT_RPC_URL = '';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeAddress(value: string): string {
  return value.replace(/\s+/gu, '').toUpperCase();
}

function decodeHex(value: string): string | null {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(normalized)) return null;
  try {
    const bytes = Uint8Array.from(normalized.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
    return new TextDecoder().decode(bytes).replace(/\0+$/gu, '');
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
    return new TextDecoder().decode(bytes).replace(/\0+$/gu, '');
  } catch {
    return null;
  }
}

function normalizeData(value: unknown): string {
  const raw = stringValue(value);
  if (!raw) return '';
  if (raw.startsWith('PP1:')) return raw;
  const hex = decodeHex(raw);
  if (hex?.startsWith('PP1:')) return hex;
  const base64 = decodeBase64(raw);
  if (base64?.startsWith('PP1:')) return base64;
  return raw;
}

function transactionRecord(result: unknown): Record<string, unknown> | null {
  const outer = record(result);
  if (!outer) return null;
  return record(outer.transaction) ?? record(outer.executedTransaction) ?? outer;
}

function getRpcUrl(): string {
  const configured = String(import.meta.env.VITE_NIMIQ_RPC_URL ?? '').trim();
  return configured || DEFAULT_RPC_URL;
}

export async function verifyReceiptBoundTransaction(
  input: VerifySettlementInput,
): Promise<VerifySettlementResult> {
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    return {
      state: 'verification-failed',
      verification: {
        transactionFound: false,
        included: false,
        hashMatches: false,
        recipientMatches: false,
        amountMatches: false,
        dataMatches: false,
      },
      error: 'Nimiq RPC verification is not configured. Set VITE_NIMIQ_RPC_URL and redeploy.',
    };
  }

  let response: Response;
  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransactionByHash',
        params: [input.transactionHash],
      }),
    });
  } catch {
    throw new Error('The configured Nimiq RPC endpoint could not be reached.');
  }

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status}.`);
  const body = await response.json() as JsonRpcResponse;
  if (body.error) throw new Error(body.error.message || 'Nimiq RPC rejected the verification request.');
  if (!body.result) {
    return {
      state: 'confirming',
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

  const tx = transactionRecord(body.result);
  if (!tx) throw new Error('Nimiq RPC returned an unsupported transaction response.');
  const outer = record(body.result) ?? {};

  const hash = stringValue(tx.hash ?? outer.hash ?? tx.transactionHash);
  const recipient = stringValue(tx.recipient ?? tx.recipientAddress ?? tx.to);
  const amount = numberValue(tx.value ?? tx.amount ?? tx.valueInLuna);
  const data = normalizeData(tx.data ?? tx.recipientData ?? tx.transactionData);
  const blockHeight = numberValue(
    outer.blockNumber ?? outer.blockHeight ?? outer.height
      ?? tx.blockNumber ?? tx.blockHeight ?? tx.height,
  );

  const verification: SettlementVerification = {
    transactionFound: true,
    included: blockHeight !== undefined,
    hashMatches: !hash || hash.toLowerCase() === input.transactionHash.toLowerCase(),
    recipientMatches: normalizeAddress(recipient) === normalizeAddress(input.recipient),
    amountMatches: amount === input.amountLuna,
    dataMatches: data === input.transactionData,
    ...(blockHeight !== undefined ? { blockHeight } : {}),
  };

  if (!verification.included) return { state: 'confirming', verification };
  const confirmed = verification.hashMatches
    && verification.recipientMatches
    && verification.amountMatches
    && verification.dataMatches;

  return confirmed
    ? { state: 'confirmed', verification }
    : {
        state: 'verification-failed',
        verification,
        error: 'The included Nimiq transaction does not match every field in this PactPay receipt.',
      };
}
