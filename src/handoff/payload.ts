import type { AcceptanceRecord, Contribution, EvidenceRecord } from '../domain/model';

export type InvitePayload = {
  version: 1;
  kind: 'invite';
  contribution: Pick<
    Contribution,
    | 'id'
    | 'outcomeId'
    | 'role'
    | 'obligation'
    | 'acceptanceCriteria'
    | 'amountNim'
    | 'acceptanceDeadline'
    | 'deliveryDeadline'
    | 'termsHash'
  >;
  outcomeLabel: string;
};

export type ResponsePayload = {
  version: 1;
  kind: 'response';
  contributionId: string;
  outcomeId: string;
  termsHash: string;
  contributorAddress: string;
  acceptedAt: string;
  acceptance?: AcceptanceRecord;
  evidence: EvidenceRecord;
};

export type LegacyReceiptPayload = {
  version: 1;
  kind: 'receipt';
  contributionId: string;
  outcomeLabel: string;
  role: string;
  amountNim: number;
  recipient: string;
  evidenceHash: string;
  transactionHash: string;
  settledAt: string;
};

export type BoundReceiptPayload = LegacyReceiptPayload & {
  outcomeId: string;
  termsHash: string;
  acceptanceSignature: string;
  amountLuna: number;
  receiptId: string;
  transactionData: string;
  settlementState: 'broadcast';
};

export type ReceiptPayload = LegacyReceiptPayload | BoundReceiptPayload;
export type HandoffPayload = InvitePayload | ResponsePayload | ReceiptPayload;

export function isBoundReceiptPayload(payload: ReceiptPayload): payload is BoundReceiptPayload {
  return 'receiptId' in payload
    && 'transactionData' in payload
    && 'amountLuna' in payload
    && 'termsHash' in payload
    && 'acceptanceSignature' in payload
    && 'outcomeId' in payload
    && payload.settlementState === 'broadcast';
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePayload(payload: HandoffPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodePayload(value: string): HandoffPayload {
  const parsed = JSON.parse(fromBase64Url(value)) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('This PactPay link is invalid.');

  const candidate = parsed as Partial<HandoffPayload>;
  if (candidate.version !== 1 || !['invite', 'response', 'receipt'].includes(String(candidate.kind))) {
    throw new Error('This PactPay link is unsupported or damaged.');
  }

  return candidate as HandoffPayload;
}
