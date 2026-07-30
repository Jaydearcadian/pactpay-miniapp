# PactPay

**One private project. Multiple contributors. Evidence-linked NIM payouts.**

PactPay is a mobile-first Nimiq Pay Mini App for commissioning digital work. A project owner creates a private workroom, assigns contributor tasks and payments, commits evidence for each deliverable, then approves and pays contributors directly in NIM.

## Competition MVP

- Nimiq Pay account connection
- Private local project state
- Multiple contributor tasks
- SHA-256 evidence commitments
- Native NIM payments with attached project/task evidence references
- Mobile-first error and rejection handling

## Privacy boundary

Project terms and raw evidence are not published by the app. NIM payment transactions remain publicly verifiable. PactPay does not claim shielded or anonymous blockchain settlement.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Nimiq Pay deeplink

```text
nimiqpay://miniapp?url=https://YOUR_DEPLOYED_DOMAIN
```

## Currency

Nimiq provider transaction amounts are submitted in Luna: `1 NIM = 100,000 Luna`.

## Licence

MIT
