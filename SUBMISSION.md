# PactPay — Nimiq Mini Apps Competition Submission

## Portal fields

### App name

PactPay

### Category

Productivity

### Pricing

Free

### Tagline

One outcome. Private contributions. Everyone settled in NIM.

### Description — under 280 characters

PactPay helps a coordinator define private, role-scoped contributions, share clear terms, receive evidence, and settle each contributor directly in NIM through Nimiq Pay. Every contributor sees only their own obligation, entitlement, deadlines, and receipt.

### Repository

https://github.com/Jaydearcadian/pactpay-miniapp

### GitHub login

Jaydearcadian

### X account

jay_dearcadian

### Team name

PactPay

### Team members

Jaydearcadian

### Live demo URL

REPLACE_WITH_FINAL_PUBLIC_HTTPS_URL

### Public demo video

REPLACE_WITH_YOUTUBE_LOOM_OR_VIMEO_URL

### Contact email

REPLACE_WITH_CONTACT_EMAIL

## Builder story

A single outcome often depends on several independent contributors, but ordinary task boards and group chats expose too much context and leave payment terms scattered across messages.

PactPay turns each contribution into a private, role-scoped agreement. The coordinator defines the obligation, acceptance criteria, deadlines, and exact NIM entitlement, then shares one bearer-secret invitation link. The contributor opens only the terms intended for them, connects a Nimiq account through Nimiq Pay, accepts the contribution, and submits evidence through a private response link.

The coordinator opens that response on the device that created the outcome. PactPay matches the returned terms fingerprint, shows the evidence and recipient, and asks the coordinator to approve the exact payment in Nimiq Pay. After confirmation, PactPay creates a receipt containing the amount, recipient, evidence fingerprint, transaction hash, and settlement time.

The competition build is intentionally focused: one complete bilateral contribution flow with local coordinator state and URL-fragment handoffs. It does not pretend to be a public freelance marketplace, payroll system, pooled escrow platform, or public task board.

PactPay uses NIM as the settlement rail rather than adding crypto as decoration. The wallet remains inside Nimiq Pay, every payment requires explicit approval, and the resulting transaction gives both sides verifiable proof that the accepted contribution was settled.

## Recommended screenshots

Capture these at a mobile viewport or directly inside Nimiq Pay:

1. Landing page — headline and private contribution visual.
2. Coordinator workspace — outcome with a 0.01 NIM contribution and lifecycle track.
3. Contributor room — obligation, criteria, deadlines, entitlement, and Nimiq acceptance action.
4. Coordinator review — matched response, evidence, recipient, and Approve and pay action.
5. Settlement receipt — 0.01 NIM sent, recipient, evidence fingerprint, transaction hash, and time.

The official portal requires at least three and accepts up to five screenshots. Use PNG, JPG, or WebP and keep each file below 2 MB.

## Suggested 60–90 second video sequence

1. State the problem: one outcome needs multiple contributors, but not everyone should see the whole deal.
2. Create an outcome and one 0.01 NIM private contribution.
3. Share the private invitation and show the copied/shared confirmation.
4. Open the invitation as the contributor, connect Nimiq, and accept.
5. Submit an evidence link and share the private response.
6. Open the response as the coordinator and show the matched terms, evidence, recipient, and amount.
7. Approve the NIM payment in Nimiq Pay.
8. End on the transaction-backed receipt and the line: One outcome. Private contributions. Everyone settled.

## Final eligibility checklist

- [ ] Repository visibility changed to Public.
- [x] MIT licence present.
- [ ] Latest frontend branch merged into main.
- [ ] `npm run build` passes on the final main commit.
- [ ] Public HTTPS demo returns HTTP 200.
- [ ] Demo opens inside Nimiq Pay.
- [ ] Nimiq wallet connection works.
- [ ] Complete 0.01 NIM invitation → response → settlement → receipt flow works.
- [ ] Public YouTube, Loom, or Vimeo demo video added.
- [ ] Icon added to submission portal.
- [ ] Thumbnail added to submission portal.
- [ ] Three to five screenshots added.
- [ ] Contact email added.
- [ ] Official form submitted before the deadline.
