import type { Contribution, ContributionStatus } from './model';

const transitions: Record<ContributionStatus, ContributionStatus[]> = {
  draft: ['invited'],
  invited: ['accepted'],
  accepted: ['submitted'],
  submitted: ['payment-broadcast'],
  'payment-broadcast': ['settled'],
  settled: [],
};

export function canTransition(from: ContributionStatus, to: ContributionStatus): boolean {
  return transitions[from].includes(to);
}

export function transitionContribution(
  contribution: Contribution,
  requestedStatus: ContributionStatus,
  patch: Partial<Contribution> = {},
): Contribution {
  const nextStatus = requestedStatus === 'settled' && patch.receipt?.settlementState === 'broadcast'
    ? 'payment-broadcast'
    : requestedStatus;

  if (!canTransition(contribution.status, nextStatus)) {
    throw new Error(`Cannot move contribution from ${contribution.status} to ${nextStatus}.`);
  }

  return {
    ...contribution,
    ...patch,
    status: nextStatus,
  };
}

export function isContributionExpired(contribution: Contribution, now = Date.now()): boolean {
  if (contribution.status === 'invited') {
    return new Date(contribution.acceptanceDeadline).getTime() < now;
  }

  if (contribution.status === 'accepted') {
    return new Date(contribution.deliveryDeadline).getTime() < now;
  }

  return false;
}

export function getContributionNextAction(contribution: Contribution): string {
  if (isContributionExpired(contribution)) return 'Deadline passed';

  switch (contribution.status) {
    case 'draft': return 'Freeze terms and create invitation';
    case 'invited': return 'Awaiting contributor acceptance';
    case 'accepted': return 'Awaiting evidence';
    case 'submitted': return 'Review and settle';
    case 'payment-broadcast': return 'Verify Nimiq settlement';
    case 'settled': return 'Settlement complete';
  }
}
