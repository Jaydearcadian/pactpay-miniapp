import type { Contribution } from '../domain/model';

const HASH_SEEDS = [
  0x811c9dc5,
  0x9e3779b9,
  0x85ebca6b,
  0xc2b2ae35,
  0x27d4eb2f,
  0x165667b1,
  0xd3a2646c,
  0xfd7046c5,
] as const;

function fingerprint(value: string): string {
  const hashes = HASH_SEEDS.map((seed) => seed >>> 0);

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    for (let lane = 0; lane < hashes.length; lane += 1) {
      const mixed = (hashes[lane] ^ (code + lane * 97 + index)) >>> 0;
      hashes[lane] = Math.imul(mixed, 0x01000193 + lane * 2) >>> 0;
      hashes[lane] ^= hashes[lane] >>> 13;
    }
  }

  return hashes.map((hash) => (hash >>> 0).toString(16).padStart(8, '0')).join('');
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
