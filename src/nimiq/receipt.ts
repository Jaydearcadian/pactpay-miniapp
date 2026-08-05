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
  reference: string;
  amountLuna: number;
  canonicalMessage: string;
};

function assertText(label: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required to bind the settlement receipt.`);
  return normalized;
}

function amountToLuna(amountNim: number): number {
  if (!Number.isFinite(amountNim) || amountNim <= 0) {
    throw new Error('The settlement amount must be greater than zero.');
  }

  const amountLuna = Math.round(amountNim * 100_000);
  if (!Number.isSafeInteger(amountLuna) || amountLuna <= 0) {
    throw new Error('The settlement amount cannot be represented safely in luna.');
  }
  return amountLuna;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildReceiptCanonicalMessage(input: ReceiptBindingInput): { message: string; amountLuna: number } {
  const amountLuna = amountToLuna(input.amountNim);
  const message = [
    'PACTPAY_RECEIPT_V1',
    'network=nimiq',
    `contributionId=${assertText('Contribution ID', input.contributionId)}`,
    `outcomeId=${assertText('Outcome ID', input.outcomeId)}`,
    `termsHash=${assertText('Terms fingerprint', input.termsHash)}`,
    `acceptanceSignature=${assertText('Acceptance signature', input.acceptance.signature)}`,
    `acceptancePublicKey=${assertText('Acceptance public key', input.acceptance.publicKey)}`,
    `acceptedAt=${assertText('Acceptance timestamp', input.acceptance.acceptedAt)}`,
    `evidenceHash=${assertText('Evidence fingerprint', input.evidence.hash)}`,
    `recipient=${assertText('Recipient', input.recipient)}`,
    `amountLuna=${amountLuna}`,
  ].join('\n');

  return { message, amountLuna };
}

export async function createReceiptBinding(input: ReceiptBindingInput): Promise<ReceiptBinding> {
  const { message, amountLuna } = buildReceiptCanonicalMessage(input);
  const receiptId = await sha256Hex(message);
  const reference = `PP1:${receiptId.slice(0, 40)}`;

  if (new TextEncoder().encode(reference).length > 64) {
    throw new Error('The PactPay receipt reference exceeds Nimiq transaction data limits.');
  }

  return {
    version: 1,
    receiptId,
    reference,
    amountLuna,
    canonicalMessage: message,
  };
}
