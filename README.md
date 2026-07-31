# PactPay

**One outcome. Private contributions. Everyone settled.**

PactPay is a private coordination and settlement layer for outcomes fulfilled by multiple independent contributors.

A coordinator defines a role-scoped contribution with clear obligations, acceptance criteria, deadlines, and a NIM entitlement. The contributor receives a private invitation, accepts through Nimiq Pay, submits evidence, and returns a private response. The coordinator verifies the response and approves the exact NIM settlement in Nimiq Pay.

## Competition MVP

The current vertical slice demonstrates:

- outcome creation and local coordinator state;
- role-scoped private contributions;
- deterministic terms and evidence fingerprints;
- private invitation and response links carried in URL fragments;
- Nimiq Pay account approval;
- native NIM settlement with explicit wallet confirmation;
- transaction-backed settlement receipts;
- mobile-first invitation, evidence, review, wallet, and receipt states.

The demo uses one bilateral contribution and a small NIM entitlement. It does not claim a marketplace, pooled escrow, public contributor profiles, backend synchronization, or dispute handling.

## Decisive workflow

```text
Outcome
→ Private contribution
→ Terms fingerprint
→ Private invitation
→ Contributor acceptance
→ Evidence response
→ Coordinator review
→ NIM settlement
→ Receipt
```

## Privacy and trust boundary

- The coordinator keeps the complete outcome view.
- A contributor receives only their role, obligation, criteria, deadlines, entitlement, evidence context, and settlement proof.
- Private handoff links are bearer secrets and should be shared only with the intended recipient.
- URL fragments are not sent to the hosting server during normal navigation.
- PactPay never receives wallet keys or a seed phrase.
- Nimiq Pay controls account approval and payment confirmation.
- NIM transactions remain publicly verifiable.
- PactPay does not claim shielded or anonymous blockchain settlement.

The current fingerprint function is deterministic and useful for matching returned terms and evidence. It is not presented as cryptographic authentication or tamper-proof enforcement.

## Product surfaces

```text
#/                  Explanatory landing page
#/demo              Guided vertical-slice demo
#/open-invitation   Branded invitation entry
#/app               Coordinator workspace
#/invite/:payload   Contributor room
#/response/:payload Coordinator review
#/receipt/:payload  Settlement receipt
#/wallet             Nimiq Pay connection
```

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 5174
```

## Nimiq Pay deeplink

```text
nimiqpay://miniapp?url=https://YOUR_DEPLOYED_DOMAIN
```

The deployed Mini App must use a public HTTPS origin before it can be opened reliably inside Nimiq Pay.

## Currency

Nimiq provider transaction amounts are submitted in Luna:

```text
1 NIM = 100,000 Luna
```

## Product and design governance

- `project-state/product/product-truth.md`
- `project-state/experience/complete-product-surface.md`
- `project-state/contradiction-register.yaml`
- `docs/BRAND_SYSTEM.md`

## Licence

MIT
