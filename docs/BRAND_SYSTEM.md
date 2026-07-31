# PactPay Brand System

## Product truth

PactPay is a private coordination and settlement layer for outcomes fulfilled by multiple independent contributors.

**Core promise:** One outcome. Private contributions. Everyone settled.

**Supporting promise:** Clarity before work. Privacy during fulfilment. Proof after settlement.

## Brand character

- Institutional, not bureaucratic.
- Private, not secretive.
- Precise, not technical for its own sake.
- Fair to contributors, without sounding adversarial.
- Premium, but calm and usable.

## Visual concept

**The Private Contribution Ledger** combines:

- a dark graphite coordination shell;
- warm ivory Contribution Sheets;
- restrained Nimiq-yellow value and action signals;
- soft green verification and settlement states;
- architectural lanes showing independent contributions moving toward one outcome.

The visual metaphor is a controlled outcome corridor, not a blockchain network.

## Colour roles

- `#090B0A` — primary graphite background.
- `#0F1310` — raised dark surface.
- `#F2EEE5` — Contribution Sheet ivory.
- `#191B19` — sheet ink.
- `#F2FF63` — primary action and NIM value.
- `#79A881` — verified or settled.
- `#FFF0AD` — review or attention.
- `#A8B0AA` — supporting text.

Yellow is reserved for primary actions, wallet approval, and value movement. Green is reserved for verified completion.

## Typography

- Interface: Inter or a neutral system sans.
- Contribution Sheet headings: system serif / Georgia.
- Fingerprints, sequence numbers, and transaction identifiers: system monospace.

Large headlines use tight tracking and compact line-height. Body text remains generous and readable.

## Product-native components

- Outcome Index
- Contribution Sheet
- Entitlement Block
- Trust Track
- Privacy Scope
- Evidence Package
- Next Action Panel
- Settlement Receipt
- Wallet Dock

These should appear consistently across landing, demo, coordinator, contributor, review, wallet, and receipt pages.

## Interaction rules

- One dominant next action per state.
- Every asynchronous action must produce visible feedback.
- Link sharing confirms with a compact toast.
- No fake activity, fake balances, or fake transaction success.
- Demo fixtures must be explicitly labelled.
- Private links are treated as bearer secrets.

## Page system

- `/` — explanatory cinematic overview.
- `/demo` — guided vertical-slice demonstration.
- `/app` — coordinator workspace.
- `/invite/:payload` — contributor room.
- `/response/:payload` — coordinator review.
- `/receipt/:payload` — settlement receipt.
- `/wallet` — Nimiq Pay connection and environment state.

## Motion

Use restrained functional motion only:

- sheet entry;
- lane progression;
- status transitions;
- compact toast confirmation;
- subtle scroll reveal.

Avoid WebGL, decorative particles, continuous ambient movement, and motion that obscures state.

## Submission boundary

The competition demo proves one complete bilateral contribution flow with a 0.01 NIM entitlement. It does not claim marketplace discovery, pooled escrow, backend synchronization, contributor accounts, or multi-party dispute handling.
