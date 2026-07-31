import { keccak256, toHex } from 'viem';
import type { Contribution } from '../domain/model';

function fingerprint(value: string): string {
  return keccak256(toHex(value)).slice(2);
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

export async function fingerprintTerms(
  contribution: Parameters<typeof canonicalTerms>[0],
): Promise<string> {
  return fingerprint(canonicalTerms(contribution));
}

export async function fingerprintEvidence(input: {
  contributionId: string;
  termsHash: string;
  link: string;
  note: string;
  submittedAt: string;
}): Promise<string> {
  return fingerprint(JSON.stringify({
    contributionId: input.contributionId,
    termsHash: input.termsHash,
    link: input.link.trim(),
    note: input.note.trim(),
    submittedAt: input.submittedAt,
  }));
}
