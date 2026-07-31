export type ContributionStatus =
  | 'draft'
  | 'invited'
  | 'accepted'
  | 'submitted'
  | 'settled';

export type EvidenceRecord = {
  link: string;
  note: string;
  hash: string;
  submittedAt: string;
};

export type SettlementReceipt = {
  transactionHash: string;
  settledAt: string;
  amountNim: number;
  recipient: string;
};

export type Contribution = {
  id: string;
  outcomeId: string;
  role: string;
  obligation: string;
  acceptanceCriteria: string[];
  amountNim: number;
  acceptanceDeadline: string;
  deliveryDeadline: string;
  termsHash: string;
  status: ContributionStatus;
  contributorLabel?: string;
  contributorAddress?: string;
  acceptedAt?: string;
  evidence?: EvidenceRecord;
  receipt?: SettlementReceipt;
};

export type Outcome = {
  id: string;
  name: string;
  privateLabel: string;
  targetDate: string;
  createdAt: string;
  contributions: Contribution[];
};

export type PactPayState = {
  outcomes: Outcome[];
  activeOutcomeId?: string;
};
