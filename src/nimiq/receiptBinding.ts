import type { AcceptanceRecord, EvidenceRecord } from '../domain/model';

export type ReceiptBindingInput = {
  contributionId: string;
  outcomeId: string;
  termsHash: string;
  acceptance: AcceptanceRecord;
  evidence: EvidenceRecord;
  recipient: string;
  amountNim: number;
};

export type ReceiptBinding = {
  version: 1;
  receiptId: string;
  bindingHash: string;
  transactionData: string;
  amountLuna: number;
};

function normalizeAddress(value: string): string {
  return value.replace(/\s+/gu, '').toUpperCase();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertNonEmpty(label: string, value: string): void {
  if (!value.trim()) throw new Error(`${label} is required to bind a settlement receipt.`);
}

export function amountNimToLuna(amountNim: number): number {
  if (!Number.isFinite(amountNim) || amountNim <= 0) {
    throw new Error('The NIM amount must be greater than zero.');
  }

  const amountLuna = Math.round(amountNim * 100_000);
  if (!Number.isSafeInteger(amountLuna) || amountLuna <= 0) {
    throw new Error('The NIM amount cannot be represented safely in luna.');
  }
  return amountLuna;
}

export function buildReceiptBindingMessage(input: ReceiptBindingInput): string {
  assertNonEmpty('Contribution ID', input.contributionId);
  assertNonEmpty('Outcome ID', input.outcomeId);
  assertNonEmpty('Terms fingerprint', input.termsHash);
  assertNonEmpty('Acceptance signature', input.acceptance.signature);
  assertNonEmpty('Evidence fingerprint', input.evidence.hash);
  assertNonEmpty('Recipient', input.recipient);

  const amountLuna = amountNimToLuna(input.amountNim);
  const recipient = normalizeAddress(input.recipient);
  const acceptanceAddress = normalizeAddress(input.acceptance.contributorAddress);
  if (recipient !== acceptanceAddress) {
    throw new Error('The settlement recipient does not match the signed contributor address.');
  }

  return [
    'PACTPAY_RECEIPT_V1',
    `contributionId=${input.contributionId}`,
    `outcomeId=${input.outcomeId}`,
    `termsHash=${input.termsHash}`,
    `acceptanceSignature=${input.acceptance.signature}`,
    `evidenceHash=${input.evidence.hash}`,
    `recipient=${recipient}`,
    `amountLuna=${amountLuna}`,
  ].join('\n');
}

export async function createReceiptBinding(input: ReceiptBindingInput): Promise<ReceiptBinding> {
  const message = buildReceiptBindingMessage(input);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  const bindingHash = toHex(new Uint8Array(digest));
  const receiptId = bindingHash.slice(0, 32);
  const transactionData = `PP1:${receiptId}`;

  if (new TextEncoder().encode(transactionData).length > 64) {
    throw new Error('The PactPay receipt reference exceeds Nimiq transaction-data limits.');
  }

  return {
    version: 1,
    receiptId,
    bindingHash,
    transactionData,
    amountLuna: amountNimToLuna(input.amountNim),
  };
}
