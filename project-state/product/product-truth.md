# PactPay Product Truth

**Version:** 0.9.0  
**Status:** Proposed reconstruction  
**Canonical owner:** `product-truth-engine`  
**Source boundary:** Accepted project context, implemented frontend, and existing brand-system artifact. This file is not canonical until Product Truth review and gates pass.

## Primary user

A coordinator at an agency, studio, consultancy, or small distributed delivery team who assembles independent specialists behind one client or product outcome.

## Painful moment

The coordinator must give each contributor enough commercial clarity to commit and deliver, while avoiding unnecessary disclosure of the wider client relationship, other contributors, and the complete deal structure. Existing project tools expose too much, define commercial obligations too loosely, or separate payment from evidence and acceptance.

## Desired outcome

The coordinator can create one outcome, issue role-scoped private contribution agreements, receive evidence against frozen terms, and settle each accepted contribution in NIM with a verifiable receipt.

## Product definition

PactPay is a private coordination and settlement layer for outcomes fulfilled by multiple independent contributors.

## Core promise

> One outcome. Private contributions. Everyone settled.

## Product primitive

The **Private Contribution**: a role-scoped commercial obligation containing the contributor role, deliverable, acceptance criteria, entitlement, deadlines, terms fingerprint, evidence package, recipient address, and settlement receipt.

## Decisive workflow

```text
Coordinator creates outcome
→ defines private contribution and NIM entitlement
→ freezes terms
→ shares private invitation
→ contributor opens role-scoped room
→ connects through Nimiq Pay
→ accepts terms
→ submits evidence
→ shares response
→ coordinator verifies response
→ approves and sends NIM
→ settlement receipt is created
```

## Product invariants

1. The coordinator can see the complete outcome; a contributor sees only their own contribution.
2. Terms are presented before wallet connection and acceptance.
3. Obligation, criteria, entitlement, and deadlines cannot be silently changed after invitation creation.
4. Evidence remains associated with the exact contribution terms accepted by the contributor.
5. Settlement is marked complete only after Nimiq Pay returns a transaction hash.
6. PactPay never receives private keys or seed phrases.
7. Every asynchronous action gives clear visible feedback.
8. Demo fixtures are explicitly labelled and never presented as user activity.

## Privacy and trust model

- Private invitation and response links are bearer secrets.
- Contribution payloads are carried in URL fragments and are not sent to the hosting origin by normal HTTP requests.
- Local coordinator state currently lives in browser storage.
- Nimiq Pay controls account selection and payment approval.
- NIM transactions are publicly verifiable; PactPay does not claim anonymous or shielded settlement.
- The current deterministic fingerprints provide change detection and matching inside the demo, but are not yet a canonical cryptographic integrity guarantee.

## MVP scope

- One coordinator device.
- Outcomes with multiple independently settled contributions.
- Role-scoped invitation links.
- Contributor acceptance through Nimiq Pay.
- Evidence link and note submission.
- Coordinator review and direct NIM settlement.
- Settlement receipt containing recipient, amount, evidence fingerprint, transaction hash, and time.
- Guided fixture demonstrating a 0.01 NIM bilateral contribution.

## Non-goals

- Public contributor marketplace.
- Generic project management or Kanban.
- Payroll or employment administration.
- Public profiles or contributor discovery.
- Backend invitation service or cross-device coordinator synchronization.
- File hosting.
- Pooled escrow, complex disputes, or multi-asset settlement.
- Shielded or anonymous blockchain settlement.

## Current proof boundary

**Implemented or user-verified:** hosted HTTPS Mini App access, Nimiq account connection, private invitation creation and opening, link sharing/copy fallback, local outcome state, evidence-response link structure, wallet-approval integration path.

**Demonstrated with fixture:** guided launch-designer contribution with a 0.01 NIM entitlement.

**Not yet verified in this run:** complete real 0.01 NIM settlement and receipt after the latest frontend changes; full mobile/accessibility audit; production-strength integrity and persistence.
