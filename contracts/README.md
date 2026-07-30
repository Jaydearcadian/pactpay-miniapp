# PactPay Escrow

Non-custodial ERC-20 contribution escrow for PactPay.

## What it protects

- Every contribution is fully funded before invitation.
- The contributor accepts an exact frozen `termsHash`.
- The coordinator cannot withdraw funds after acceptance.
- Submission starts a fixed review window.
- Approval releases funds immediately.
- Owner silence lets the contributor claim after the review deadline.
- One revision request is permitted.
- A dispute locks funds until the named resolver acts.
- The resolver can only release to the contributor or refund the coordinator.

## What remains off-chain

Only hashes, addresses, amounts, deadlines, lifecycle status and payment state belong on-chain.

Keep these private in PactPay's application layer:

- outcome descriptions;
- client identity;
- deliverable URLs;
- acceptance notes;
- contributor network;
- total outcome budget and margins.

## Local setup

Install Foundry, then from this directory:

```bash
forge install foundry-rs/forge-std --no-commit
forge test -vvv
```

## Lifecycle

```text
Funded
  -> Accepted
  -> Submitted
      -> Settled by coordinator approval
      -> Settled by contributor timeout claim
      -> RevisionRequested -> Submitted
      -> Disputed -> Settled or Refunded by resolver

Funded -> Refunded after an unaccepted deadline
Accepted -> Refunded after a missed submission deadline
```

## Current limits

- ERC-20 entitlement only;
- one contributor and one resolver per contribution;
- one revision cycle;
- binary dispute outcome;
- no partial payments;
- no protocol fees;
- no upgradeability;
- no deployment has been performed yet.

This contract has not been audited and must not hold production funds until review and test deployment are complete.
