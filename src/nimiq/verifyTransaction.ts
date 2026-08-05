export type SettlementVerification = {
  transactionFound: boolean;
  included: boolean;
  recipientMatches: boolean;
  amountMatches: boolean;
  dataMatches: boolean;
  confirmedBlockHeight?: number;
  confirmedAt?: string;
};

export type VerifySettlementInput = {
  transactionHash: string;
  recipient: string;
  amountLuna: number;
  transactionData: string;
};

export type VerifySettlementResult = {
  status: 'confirmed' | 'pending' | 'failed';
  verification: SettlementVerification;
  error?: string;
};

const DEFAULT_RPC_URL = 'https://rpc.nimiqwatch.com';

function rpcUrl(): string {
  const configured = import.meta.env.VITE_NIMIQ_RPC_URL as string | undefined;
  return configured?.trim() || DEFAULT_RPC_URL;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function decodeData(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('PP1:')) return value;

  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (/^[0-9a-f]+$/iu.test(hex) && hex.length % 2 === 0) {
    try {
      const bytes = Uint8Array.from(hex.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
      const decoded = new TextDecoder().decode(bytes).replace(/\0+$/u, '');
      if (decoded) return decoded;
    } catch {
      return value;
    }
  }

  try {
    const binary = atob(value);
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))).replace(/\0+$/u, '');
  } catch {
    return value;
  }
}

function normalizeAddress(value: string): string {
  return value.replace(/\s+/gu, '').toUpperCase();
}

async function getTransactionByHash(transactionHash: string): Promise<{ transaction: Record<string, unknown>; metadata: Record<string, unknown> } | null> {
  const response = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getTransactionByHash',
      params: [transactionHash],
      id: 1,
    }),
  });

  if (!response.ok) throw new Error(`Nimiq RPC returned HTTP ${response.status}.`);
  const body = asRecord(await response.json());
  if (body.error) {
    const error = asRecord(body.error);
    const message = firstString(error, ['message']) || 'Nimiq RPC could not fetch the transaction.';
    if (/not found/iu.test(message)) return null;
    throw new Error(message);
  }

  const result = asRecord(body.result);
  const data = result.data ?? body.result;
  if (!data) return null;
  return { transaction: asRecord(data), metadata: asRecord(result.metadata) };
}

export async function verifySettlementTransaction(input: VerifySettlementInput): Promise<VerifySettlementResult> {
  if (!input.transactionHash.trim()) throw new Error('A transaction hash is required for verification.');

  const fetched = await getTransactionByHash(input.transactionHash.trim());
  if (!fetched) {
    return {
      status: 'pending',
      verification: {
        transactionFound: false,
        included: false,
        recipientMatches: false,
        amountMatches: false,
        dataMatches: false,
      },
    };
  }

  const { transaction, metadata } = fetched;
  const recipient = firstString(transaction, ['recipient', 'to', 'recipientAddress']);
  const value = firstNumber(transaction, ['value', 'amount']);
  const blockNumber = firstNumber(transaction, ['blockNumber', 'blockHeight', 'height'])
    ?? firstNumber(metadata, ['blockNumber', 'blockHeight', 'height']);
  const rawData = transaction.data ?? transaction.recipientData ?? transaction.extraData;
  const decodedData = decodeData(rawData);

  const verification: SettlementVerification = {
    transactionFound: true,
    included: typeof blockNumber === 'number' && blockNumber >= 0,
    recipientMatches: normalizeAddress(recipient) === normalizeAddress(input.recipient),
    amountMatches: value === input.amountLuna,
    dataMatches: decodedData === input.transactionData,
    confirmedBlockHeight: blockNumber,
    confirmedAt: new Date().toISOString(),
  };

  if (!verification.included) return { status: 'pending', verification };

  const allMatch = verification.recipientMatches
    && verification.amountMatches
    && verification.dataMatches;

  return allMatch
    ? { status: 'confirmed', verification }
    : {
        status: 'failed',
        verification,
        error: 'The included Nimiq transaction does not match this PactPay receipt.',
      };
}
