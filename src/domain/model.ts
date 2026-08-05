export type ContributionStatus =
  | 'draft'
  | 'invited'
  | 'accepted'
  | 'submitted'
  | 'payment-broadcast'
  | 'settled';

export type EvidenceRecord = {
  link: string;
  note: string;
  hash: string;
  submittedAt: string;
};

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

export type SettlementState =
  | 'broadcast'
  | 'confirming'
  | 'confirmed'
  | 'verification-failed';

export type SettlementVerification = {
  transactionFound: boolean;
  included: boolean;
  hashMatches: boolean;
  recipientMatches: boolean;
  amountMatches: boolean;
  dataMatches: boolean;
  blockHeight?: number;
  checkedAt?: string;
};

export type SettlementReceipt = {
  transactionHash: string;
  settledAt: string;
  amountNim: number;
  recipient: string;
  version?: 1;
  receiptId?: string;
  transactionData?: string;
  settlementState?: SettlementState;
  amountLuna?: number;
  confirmedAt?: string;
  confirmedBlockHeight?: number;
  verification?: SettlementVerification;
  verificationError?: string;
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
  acceptance?: AcceptanceRecord;
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
