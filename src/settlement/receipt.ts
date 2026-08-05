import type { AcceptanceRecord } from '../domain/model';

export const RECEIPT_BINDING_VERSION = 1 as const;
export const RECEIPT_DATA_PREFIX = 'PP1:';
export const MAX_NIMIQ_DATA_BYTES = 64;

export type ReceiptBindingInput = {
  contributionId: string;
  outcomeId: string;
  termsHash: string;
  acceptance: AcceptanceRecord;
  evidenceHash: string;
  recipient: string;
  amountNim: number;
};

export type ReceiptBinding = {
  version: typeof RECEIPT_BINDING_VERSION;
  receiptId: string;
  transactionData: string;
  amountLuna: number;
  canonicalMessage: string;
};

function requireValue(label: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required to create a settlement receipt.`);
  return normalized;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function nimToLuna(amountNim: number): number {
  if (!Number.isFinite(amountNim) || amountNim <= 0) {
    throw new Error('The NIM amount must be greater than zero.');
  }

  const amountLuna = Math.round(amountNim * 100_000);
  if (!Number.isSafeInteger(amountLuna) || amountLuna <= 0) {
    throw new Error('The NIM amount cannot be represented safely in luna.');
  }

  return amountLuna;
}

export function buildReceiptCanonicalMessage(input: ReceiptBindingInput): string {
  const amountLuna = nimToLuna(input.amountNim);
  const acceptance = input.acceptance;

  return [
    'PACTPAY_RECEIPT_V1',
    `contributionId=${requireValue('Contribution ID', input.contributionId)}`,
    `outcomeId=${requireValue('Outcome ID', input.outcomeId)}`,
    `termsHash=${requireValue('Terms fingerprint', input.termsHash)}`,
    `acceptancePublicKey=${requireValue('Acceptance public key', acceptance.publicKey)}`,
    `acceptanceSignature=${requireValue('Acceptance signature', acceptance.signature)}`,
    `evidenceHash=${requireValue('Evidence fingerprint', input.evidenceHash)}`,
    `recipient=${requireValue('Recipient', input.recipient)}`,
    `amountLuna=${amountLuna}`,
  ].join('\n');
}

export async function createReceiptBinding(input: ReceiptBindingInput): Promise<ReceiptBinding> {
  const canonicalMessage = buildReceiptCanonicalMessage(input);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalMessage));
  const receiptId = toBase64Url(new Uint8Array(digest));
  const transactionData = `${RECEIPT_DATA_PREFIX}${receiptId}`;

  if (utf8ByteLength(transactionData) > MAX_NIMIQ_DATA_BYTES) {
    throw new Error('The PactPay receipt reference exceeds Nimiq transaction-data limits.');
  }

  return {
    version: RECEIPT_BINDING_VERSION,
    receiptId,
    transactionData,
    amountLuna: nimToLuna(input.amountNim),
    canonicalMessage,
  };
}

export function assertReceiptTransactionData(receiptId: string, transactionData: string): void {
  const expected = `${RECEIPT_DATA_PREFIX}${requireValue('Receipt ID', receiptId)}`;
  if (transactionData !== expected) {
    throw new Error('The transaction data does not match this PactPay receipt ID.');
  }
  if (utf8ByteLength(transactionData) > MAX_NIMIQ_DATA_BYTES) {
    throw new Error('The transaction data exceeds Nimiq limits.');
  }
}
