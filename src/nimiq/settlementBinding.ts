import type { AcceptanceRecord } from '../domain/model';

export type SettlementBindingInput = {
  contributionId: string;
  outcomeId: string;
  termsHash: string;
  acceptance: AcceptanceRecord;
  evidenceHash: string;
  recipient: string;
  amountNim: number;
};

export type SettlementBinding = {
  version: 1;
  receiptId: string;
  transactionData: string;
  amountLuna: number;
  canonicalPayload: string;
};

const LUNA_PER_NIM = 100_000;
const RECEIPT_ID_HEX_LENGTH = 24;

function required(label: string, value: string): string {
  const next = value.trim();
  if (!next) throw new Error(`${label} is required to bind the settlement receipt.`);
  return next;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function nimToLuna(amountNim: number): number {
  if (!Number.isFinite(amountNim) || amountNim <= 0) {
    throw new Error('The settlement amount must be greater than zero.');
  }

  const amountLuna = Math.round(amountNim * LUNA_PER_NIM);
  if (!Number.isSafeInteger(amountLuna) || amountLuna <= 0) {
    throw new Error('The settlement amount cannot be represented safely in luna.');
  }
  return amountLuna;
}

export async function createSettlementBinding(input: SettlementBindingInput): Promise<SettlementBinding> {
  const amountLuna = nimToLuna(input.amountNim);
  const canonical = {
    version: 1,
    network: 'nimiq',
    contributionId: required('Contribution ID', input.contributionId),
    outcomeId: required('Outcome ID', input.outcomeId),
    termsHash: required('Terms fingerprint', input.termsHash),
    acceptanceSignature: required('Acceptance signature', input.acceptance.signature),
    acceptancePublicKey: required('Acceptance public key', input.acceptance.publicKey),
    acceptanceTimestamp: required('Acceptance timestamp', input.acceptance.acceptedAt),
    evidenceHash: required('Evidence fingerprint', input.evidenceHash),
    recipient: required('Recipient', input.recipient),
    amountLuna,
  } as const;

  const canonicalPayload = JSON.stringify(canonical);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPayload));
  const receiptId = toHex(new Uint8Array(digest)).slice(0, RECEIPT_ID_HEX_LENGTH);
  const transactionData = `PP1:${receiptId}`;

  if (new TextEncoder().encode(transactionData).byteLength > 64) {
    throw new Error('The PactPay receipt reference exceeds Nimiq transaction data limits.');
  }

  return {
    version: 1,
    receiptId,
    transactionData,
    amountLuna,
    canonicalPayload,
  };
}
