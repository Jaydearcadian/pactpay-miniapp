import type { Contribution } from '../domain/model';

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function canonicalTerms(contribution: Pick<
  Contribution,
  | 'id'
  | 'outcomeId'
  | 'role'
  | 'obligation'
  | 'acceptanceCriteria'
  | 'amountNim'
  | 'acceptanceDeadline'
  | 'deliveryDeadline'
>): string {
  return JSON.stringify({
    id: contribution.id,
    outcomeId: contribution.outcomeId,
    role: contribution.role.trim(),
    obligation: contribution.obligation.trim(),
    acceptanceCriteria: contribution.acceptanceCriteria.map((criterion) => criterion.trim()).filter(Boolean),
    amountNim: contribution.amountNim,
    acceptanceDeadline: contribution.acceptanceDeadline,
    deliveryDeadline: contribution.deliveryDeadline,
  });
}

export function fingerprintTerms(contribution: Parameters<typeof canonicalTerms>[0]): Promise<string> {
  return sha256Hex(canonicalTerms(contribution));
}

export function fingerprintEvidence(input: {
  contributionId: string;
  termsHash: string;
  link: string;
  note: string;
  submittedAt: string;
}): Promise<string> {
  return sha256Hex(JSON.stringify({
    contributionId: input.contributionId,
    termsHash: input.termsHash,
    link: input.link.trim(),
    note: input.note.trim(),
    submittedAt: input.submittedAt,
  }));
}
