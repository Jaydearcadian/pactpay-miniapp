export type AcceptanceRecord = {
  version: 1;
  network: 'nimiq';
  contributionId: string;
  outcomeId: string;
  termsHash: string;
  contributorAddress: string;
  acceptedAt: string;
  message: string;
  publicKey: string;
  signature: string;
};

export type AcceptanceIntent = Pick<
  AcceptanceRecord,
  | 'contributionId'
  | 'outcomeId'
  | 'termsHash'
  | 'contributorAddress'
  | 'acceptedAt'
>;

function assertNonEmpty(label: string, value: string): void {
  if (!value.trim()) throw new Error(`${label} is required for signed acceptance.`);
}

export function buildAcceptanceMessage(intent: AcceptanceIntent): string {
  assertNonEmpty('Contribution ID', intent.contributionId);
  assertNonEmpty('Outcome ID', intent.outcomeId);
  assertNonEmpty('Terms fingerprint', intent.termsHash);
  assertNonEmpty('Contributor address', intent.contributorAddress);
  assertNonEmpty('Acceptance timestamp', intent.acceptedAt);

  if (!Number.isFinite(new Date(intent.acceptedAt).getTime())) {
    throw new Error('The acceptance timestamp is invalid.');
  }

  return [
    'PACTPAY_ACCEPTANCE_V1',
    `network=nimiq`,
    `contributionId=${intent.contributionId}`,
    `outcomeId=${intent.outcomeId}`,
    `termsHash=${intent.termsHash}`,
    `contributorAddress=${intent.contributorAddress}`,
    `acceptedAt=${intent.acceptedAt}`,
  ].join('\n');
}

export function assertAcceptanceRecordMatches(
  record: AcceptanceRecord | undefined,
  expected: AcceptanceIntent,
): AcceptanceRecord {
  if (!record) throw new Error('This response does not contain a signed contributor acceptance.');
  if (record.version !== 1 || record.network !== 'nimiq') {
    throw new Error('This signed acceptance version is not supported.');
  }

  const fields: Array<[keyof AcceptanceIntent, string]> = [
    ['contributionId', 'contribution'],
    ['outcomeId', 'outcome'],
    ['termsHash', 'terms fingerprint'],
    ['contributorAddress', 'contributor address'],
    ['acceptedAt', 'acceptance timestamp'],
  ];

  for (const [field, label] of fields) {
    if (record[field] !== expected[field]) {
      throw new Error(`The signed acceptance ${label} does not match this contribution.`);
    }
  }

  if (!record.publicKey.trim() || !record.signature.trim()) {
    throw new Error('The signed acceptance is missing its public key or signature.');
  }

  const expectedMessage = buildAcceptanceMessage(expected);
  if (record.message !== expectedMessage) {
    throw new Error('The signed acceptance message was changed after signing.');
  }

  return record;
}
