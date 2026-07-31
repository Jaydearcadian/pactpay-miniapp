# PactPay Complete Product Surface

**Artifact:** Complete Product Surface  
**Version:** 0.9.0  
**Status:** Proposed  
**Primary owner:** `experience-narrative-engine`  
**Selected mode:** `experience-thesis`  
**Workflow:** Complete Product Surface  
**Context profile:** `standard`  
**Protected dependency:** `product-truth-engine`  
**Required consults:** `brand-visual-systems-engine`, `design-to-product-engine`  
**Activated conditional consults:** `system-integrity-engine`, `interface-ecosystem-engine`  
**Accessibility specialist:** not activated as a separate pack; baseline accessibility remains mandatory through `design-to-product-engine`  
**Change class:** C1 representation + C2 implementation projection, with Product Truth contradictions separately registered  

## 0. Governing premise

PactPay must feel like one continuous private commercial handoff, not a collection of landing pages, dashboards, wallet screens, and encoded links. Every surface should express the same narrative:

```text
Outcome intent
→ private contribution terms
→ explicit acceptance
→ evidence against those terms
→ coordinator approval
→ NIM settlement proof
```

The native object is the **Private Contribution Sheet**. The dark shell represents the coordinator's controlled outcome environment; the warm sheet represents the bounded agreement that travels between parties. Nimiq Pay appears at moments of authority, not as permanent visual noise.

### Decision record — experience thesis

- **Owning skill:** `experience-narrative-engine`
- **Rationale:** The experience must project the decisive workflow and privacy invariant into one understandable mental model.
- **Relevant Product Truth:** One outcome; role-scoped private contributions; evidence-linked NIM settlement.
- **Status:** Proposed.
- **Dependencies:** Product Truth 0.9.0 proposed reconstruction; system state and handoff implementation.
- **Quality gates:** owner-authority, protected-truth, experience-coherence, decisive-workflow, privacy-projection, artifact-completeness.

---

# 1. Product Surface Map

## 1.1 Surface families

### A. Understand

Purpose: Help a first-time visitor understand the problem, product boundary, privacy model, and proof.

Surfaces:

- Cinematic landing page.
- Guided demo page.
- Product boundary and trust explanations embedded in both.

### B. Coordinate

Purpose: Let the coordinator create and manage the commercial structure of one outcome.

Surfaces:

- Coordinator home/workspace.
- Outcome index.
- Outcome detail.
- Contribution composer.
- Contribution detail and lifecycle cards.

### C. Handoff

Purpose: Move a bounded agreement or response between independent parties.

Surfaces:

- Open-invitation entry.
- Contributor invitation room.
- Response-link handoff.
- Invalid, expired, or mismatched link states.

### D. Verify and settle

Purpose: Let the coordinator verify what returned, approve value movement, and retain proof.

Surfaces:

- Evidence review.
- Payment confirmation bridge into Nimiq Pay.
- Settlement receipt.

### E. Trust and environment

Purpose: Explain wallet authority, connected account state, and environment limitations.

Surfaces:

- Wallet page.
- Persistent wallet dock in coordinator surfaces.
- Contextual wallet states inside invite and settlement flows.

## 1.2 Surface relationship

```text
Landing
├── Guided demo
├── Open app
├── Open invitation
└── Wallet

Coordinator application
├── Outcome index
│   └── Outcome workspace
│       ├── Create contribution
│       ├── Share invitation
│       ├── Review returned evidence
│       └── Open receipt
└── Wallet dock

Private handoff
├── Invitation entry
├── Contributor room
│   ├── Connect / choose Nimiq account
│   ├── Accept
│   ├── Submit evidence
│   └── Share response
└── Coordinator response review
    └── Settle through Nimiq Pay
        └── Receipt
```

### Decision record — surface families

- **Owning skill:** `experience-narrative-engine`
- **Rationale:** Organizes surfaces by user intent rather than conventional SaaS categories.
- **Relevant Product Truth:** The decisive workflow has two actors and one private handoff loop.
- **Status:** Proposed.
- **Dependencies:** Native-object model, route architecture, local-state constraints.
- **Quality gates:** no-decorative-surface, workflow-coverage, role-clarity, privacy-scope.

---

# 2. Logical Page Inventory

The logical page inventory describes responsibilities. Several responsibilities may remain combined during the competition MVP, but the frontend architecture should keep them separable.

| ID | Logical page | Primary actor | Core job | Current state |
|---|---|---|---|---|
| P01 | Landing | Visitor | Understand PactPay and choose a path | Implemented, refinement needed |
| P02 | Guided demo | Judge / visitor | See the decisive workflow and proof boundary | Implemented fixture |
| P03 | Coordinator home | Coordinator | See outcomes, attention items, and primary next action | Partially implemented inside `/app` |
| P04 | Outcome index | Coordinator | Select or create an outcome | Implemented inside `/app` |
| P05 | Outcome workspace | Coordinator | See one outcome and all private contributions | Implemented inside `/app` |
| P06 | Contribution composer | Coordinator | Define and freeze one contribution | Implemented inline; proposed dedicated route/drawer |
| P07 | Contribution detail | Coordinator | Track state, share, review, settle, inspect receipt | Implemented as card; proposed focused detail |
| P08 | Invitation entry | Contributor | Paste and validate a private link | Implemented |
| P09 | Contributor room | Contributor | Understand terms, accept, submit evidence | Implemented |
| P10 | Response review | Coordinator | Verify returned response and approve settlement | Implemented via dedicated response route |
| P11 | Settlement receipt | Either party | Inspect and share transaction-backed proof | Implemented |
| P12 | Wallet and environment | Either party | Connect/choose account and understand authority | Implemented |
| P13 | Restricted/invalid handoff | Either party | Recover from invalid, expired, or wrong-device links | Partially implemented |

## Page elimination rule

Do not add:

- public profiles;
- pricing pages;
- generic settings;
- activity feeds;
- analytics dashboards;
- team administration;
- notification centres;
- marketplace discovery;
- documentation pages inside the app.

None supports the decisive workflow at the current maturity.

### Decision record — page inventory

- **Owning skill:** `experience-narrative-engine`
- **Rationale:** Every page maps to one decisive user job or recovery state.
- **Relevant Product Truth:** PactPay is not a marketplace, task board, or payroll system.
- **Status:** Proposed logical architecture; current implementation state recorded separately.
- **Dependencies:** Product non-goals; current hash router; local storage.
- **Quality gates:** product-boundary, page-necessity, implementation-honesty.

---

# 3. Sitemap and Page Hierarchy

## 3.1 Recommended route model

```text
/                              Landing
/demo                          Guided demo
/open-invitation               Branded invitation entry
/app                           Coordinator home
/app/outcomes                  Outcome index
/app/outcomes/:outcomeId       Outcome workspace
/app/outcomes/:outcomeId/new   Contribution composer
/app/contributions/:id         Contribution detail
/invite/:payload               Contributor room
/response/:payload             Coordinator response review
/receipt/:payload              Settlement receipt
/wallet                        Wallet and environment
```

For the current static hash-router implementation, the equivalent routes are:

```text
#/
#/demo
#/open-invitation
#/app
#/app/outcomes
#/app/outcome/:outcomeId
#/app/outcome/:outcomeId/new
#/app/contribution/:id
#/invite/:payload
#/response/:payload
#/receipt/:payload
#/wallet
```

## 3.2 MVP routing compromise

For submission, keep `/app` as an adaptive coordinator shell rather than rushing a full router migration. Internally introduce view states for:

- home summary;
- selected outcome;
- contribution composer;
- contribution detail.

Expose stable routes after the competition or only where low-risk. Private encoded handoff routes remain dedicated now.

### Decision record — route hierarchy

- **Owning skill:** `experience-narrative-engine`; implementation projection by `design-to-product-engine`.
- **Rationale:** Dedicated handoff and proof pages need stable isolated states; coordinator management can remain one shell for MVP speed.
- **Relevant Product Truth:** Handoffs cross devices and actors; coordinator state remains local.
- **Status:** Proposed target; adaptive-shell compromise recommended for current submission.
- **Dependencies:** Hash router, static hosting, bearer-link model.
- **Quality gates:** deep-link integrity, back-navigation, wrong-device recovery, no-workflow-regression.

---

# 4. Navigation Model

## 4.1 Three navigation contexts

### Public navigation

Used on landing, demo, and invitation entry.

Desktop:

```text
PactPay | How it works | Privacy | Settlement | Demo | Open invitation | Open app
```

Mobile:

```text
PactPay | Open app
Menu: How it works, Demo, Open invitation, Wallet
```

Wallet is not the first public CTA. It is secondary because users need product context before environment setup.

### Coordinator navigation

Desktop:

- Top bar: PactPay mark, current environment, Wallet dock.
- Left outcome rail: Outcomes, create outcome, selected outcome.
- Context header: outcome title, contributor-visible alias, target date, primary action.

Mobile:

- Top app bar: back/context label, Wallet state.
- Outcome selector becomes horizontal segmented cards or bottom sheet.
- Primary next action becomes sticky bottom action.

### Handoff navigation

Contributor invitation, response, and receipt pages should avoid application navigation. They are focused documents.

Allow only:

- PactPay mark;
- privacy/trust indicator;
- explicit return or close action when safe;
- wallet context where required.

Do not expose the coordinator's outcome index to contributors.

## 4.2 Back behaviour

- Landing → app: browser back returns to landing.
- App → composer: back returns to exact selected outcome.
- Invitation → wallet approval: return restores invitation state.
- Response review → wallet approval: return restores review and does not mark settlement complete before a transaction hash.
- Receipt → return to coordinator workspace only when opened on coordinator device; otherwise return to landing.

### Decision record — navigation

- **Owning skill:** `experience-narrative-engine`.
- **Rationale:** Navigation must communicate actor, scope, and authority; contributors must never infer access to the complete outcome.
- **Relevant Product Truth:** Coordinator sees global outcome; contributor sees minimum necessary disclosure.
- **Status:** Proposed.
- **Dependencies:** Actor context, route source, local coordinator state.
- **Quality gates:** privacy-boundary, location-awareness, back-stack integrity, one-primary-action.

---

# 5. Landing-Page-to-Application Transition

## 5.1 Landing narrative sequence

1. **Promise:** One outcome. Private contributions. Everyone settled.
2. **Problem:** Independent specialists should not need one shared commercial room.
3. **Mental model:** One outcome splits into private Contribution Sheets.
4. **Terms:** The deal is clear before wallet connection or work acceptance.
5. **Handoff:** Each contributor receives one role-scoped bearer link.
6. **Evidence:** Work returns against the exact terms accepted.
7. **Settlement:** Nimiq Pay provides explicit account and payment approval.
8. **Proof:** Settlement receipt joins amount, recipient, evidence fingerprint, transaction, and time.
9. **Action:** Create an outcome, view the guided demo, or open an invitation.

## 5.2 Transition choreography

The primary CTA **Create an outcome** should transition through a short shared-object animation:

- the hero's central Outcome line contracts;
- one warm sheet moves toward the viewport;
- the sheet becomes the empty coordinator workspace shell;
- focus lands on “Create your first outcome.”

Implementation-safe fallback: fade through a dark frame for 180–240 ms and retain the same visual object proportions across landing and app.

## 5.3 Entry paths

- Coordinator: Landing → Open app → create/select outcome.
- Judge: Landing → Demo → fixture → coordinator or contributor view.
- Contributor: Shared link → contributor room directly; no landing detour.
- Contributor without direct navigation: Landing → Open invitation → paste link.
- Wallet setup: contextual from app or contributor room; public wallet CTA remains secondary.

### Decision record — landing transition

- **Owning skill:** `experience-narrative-engine`; motion realization by `design-to-product-engine`.
- **Rationale:** Prevents the cinematic landing page from feeling like a separate marketing site.
- **Relevant Product Truth:** The Contribution Sheet is the native object across understanding and execution.
- **Status:** Proposed.
- **Dependencies:** shared design tokens and components; reduced-motion fallback.
- **Quality gates:** narrative-continuity, performance, reduced-motion, focus-transfer.

---

# 6. Page Integration and User-Journey Model

## 6.1 Coordinator decisive journey

```text
Enter app
→ create/select outcome
→ add private contribution
→ review terms summary
→ freeze terms
→ share invitation
→ wait for response
→ open response on same coordinator state
→ verify terms/evidence/recipient
→ approve NIM payment
→ receive receipt
```

Each step must visibly answer:

- What state is this contribution in?
- Who must act next?
- What information is private?
- What will happen if I press the primary action?

## 6.2 Contributor decisive journey

```text
Open invitation
→ understand outcome alias, role, obligation, criteria, amount, deadlines
→ connect or choose Nimiq account
→ explicitly accept
→ attach evidence link and note
→ submit response package
→ share response with coordinator
→ later open receipt if shared
```

The contributor must see terms before account connection. The wallet address should appear only after approval and should be labelled **Settlement address**, not generic **Wallet**.

## 6.3 State language

Use verbs and obligations rather than system jargon:

| Internal state | User-facing status | Next-action language |
|---|---|---|
| draft | Draft terms | Complete contribution terms |
| invited | Invitation ready | Share private invitation |
| accepted | Accepted | Contributor submits evidence |
| submitted | Evidence received | Review and settle |
| payment pending | Awaiting wallet approval | Approve in Nimiq Pay |
| settled | Settled | Open receipt |
| expired | Acceptance expired | Create a replacement invitation |
| invalid | Link cannot be verified | Request a new link |

Avoid displaying “hash route,” “payload,” or “SDK” in primary product copy.

## 6.4 Proof experience

Proof is layered:

1. **Terms summary** — human-readable agreement.
2. **Terms fingerprint** — compact technical reference, secondary.
3. **Evidence package** — link, note, submission time, fingerprint.
4. **Wallet confirmation** — external authority moment.
5. **Settlement receipt** — amount, recipient, transaction, evidence reference, time.

### Decision record — journeys

- **Owning skill:** `experience-narrative-engine`.
- **Rationale:** The product succeeds only if both actors understand obligation, next action, and proof without shared workspace access.
- **Relevant Product Truth:** Clear terms, private fulfilment, proof after settlement.
- **Status:** Proposed; much of the sequence is implemented.
- **Dependencies:** lifecycle state machine, response matching, Nimiq provider.
- **Quality gates:** decisive-journey-completeness, state-language, authority-clarity, proof-integrity.

---

# 7. Navbar, Sidebar, Menu, Footer, and Secondary Navigation

## Navbar

### Public

- Transparent-to-graphite sticky bar.
- PactPay mark and descriptor.
- Three explanatory anchors maximum.
- Demo as text link.
- Open app as primary yellow action.

### Application

- Compact, non-cinematic.
- Product mark.
- Environment badge: **Nimiq Pay Mini App** or **Browser preview**.
- Wallet dock with connected/disconnected state.
- No marketing anchors.

## Sidebar / outcome rail

Use only on coordinator desktop and tablet landscape.

Contents:

- Outcomes heading.
- New outcome action.
- Outcome rows: name, contribution count, review count.
- Selected state.

Do not include generic Home, Analytics, Team, Settings, Billing, or Help sections.

## Mobile menu

Public pages: small sheet menu.

Coordinator app: no hamburger menu by default. Use:

- outcome selector;
- wallet button;
- context back button;
- sticky primary action.

## Footer

Landing/demo/footer:

- Product promise.
- How it works.
- Privacy.
- Demo.
- Open invitation.
- Open app.
- “Built for Nimiq Pay” attribution where competition rules permit.

Application and focused handoff pages:

- Minimal brand line only.
- No large navigation footer that distracts from the next action.

## Secondary navigation

- Contribution lifecycle track doubles as progress navigation only when stages are complete and inspectable.
- Receipt details may use disclosure sections: Human summary / Technical proof.
- No tabs unless a contribution detail becomes too dense; current MVP should remain linear.

### Decision record — navigation components

- **Owning skill:** `experience-narrative-engine`; visual realization by `brand-visual-systems-engine` and `design-to-product-engine`.
- **Rationale:** Navigation density follows actor complexity, not SaaS convention.
- **Relevant Product Truth:** One decisive workflow; no generic management platform.
- **Status:** Proposed.
- **Dependencies:** viewport, route context, actor context.
- **Quality gates:** hierarchy, touch-target, no-decorative-navigation, privacy-scope.

---

# 8. Brand and Visual Direction

## Brand thesis

**PactPay is a private commercial instrument that feels precise enough for coordinators and fair enough for contributors.**

It should feel:

- institutional without looking like banking software;
- private without looking secretive or ominous;
- premium without luxury decoration;
- technical without blockchain motifs;
- calm at rest and decisive at authority moments.

## Core visual metaphor

**The Private Contribution Ledger:** an architectural graphite outcome environment containing warm, human-readable Contribution Sheets that move through clear states and become receipts.

## Expression hierarchy

1. Dark graphite shell — coordination and bounded privacy.
2. Warm ivory sheet — human agreement and readable obligation.
3. Nimiq yellow — value, primary action, wallet authority.
4. Verification green — matched, accepted, settled.
5. Amber — review, waiting, expiring.
6. Red — invalid, rejected, destructive.

## Anti-patterns

- glowing blockchain nodes;
- token coins;
- cyberpunk neon;
- glassmorphic dashboards;
- dense financial charts;
- generic purple SaaS gradients;
- playful gig-marketplace illustrations;
- legal-document skeuomorphism.

### Decision record — brand direction

- **Owning skill:** `brand-visual-systems-engine`.
- **Rationale:** The visual system must embody private coordination and human-readable agreements, not crypto abstraction.
- **Relevant Product Truth:** Private Contribution is the product primitive; NIM settlement is central but not the whole product.
- **Status:** Existing direction accepted in project context; formal canonicalization still pending.
- **Dependencies:** Product definition and Nimiq ecosystem compatibility.
- **Quality gates:** brand-truth, distinctiveness, accessibility, cross-surface consistency, implementation realism.

---

# 9. Logo Direction and Rationale

## Recommended logo system

### Primary mark: **The Bound Pact**

A geometric `P` constructed from two elements:

- an outer vertical/curved frame representing the outcome boundary;
- one inset sheet or folded lane representing a private contribution entering the boundary.

The negative space should imply a protected passage, not a padlock.

### Wordmark

- `PactPay` in a neutral grotesk with slightly tightened tracking.
- No split colouring between Pact and Pay.
- `Pay` should not dominate because the product is coordination plus settlement.

### App icon

- Graphite rounded square.
- Yellow Bound Pact mark.
- Optional ivory inset at larger sizes.

### Current `P` tile

The existing yellow `P` tile is acceptable as an interim competition mark but is **not a finished logo**. It lacks a unique structural idea and can be confused with a generic initial badge.

## Rationale

The mark must communicate:

- bounded scope;
- one private contribution moving inside a larger outcome;
- clarity and settlement;
- compact recognizability inside Nimiq Pay.

### Decision record — logo

- **Owning skill:** `brand-visual-systems-engine`.
- **Rationale:** A structural mark reinforces the product primitive without relying on generic privacy symbols.
- **Relevant Product Truth:** One outcome contains multiple role-scoped private contributions.
- **Status:** Proposed; current letter tile remains implemented interim asset.
- **Dependencies:** icon-size testing, Nimiq Pay listing requirements, trademark review.
- **Quality gates:** uniqueness, small-size legibility, monochrome, contrast, no-misleading-security-symbol.

---

# 10. Typography, Color, Iconography, Imagery, and Design Tokens

## 10.1 Typography

### Interface sans

Preferred: **Inter**. Fallback: system UI sans.

Roles:

- Display: 64–140 px responsive, weight 700–800, tight tracking.
- Page title: 40–72 px.
- Section title: 28–52 px.
- Body: 16–18 px, line-height 1.55–1.75.
- UI label: 12–14 px.

### Agreement serif

Preferred: **Source Serif 4** or **Newsreader** if bundled safely; fallback Georgia.

Use only for:

- Contribution Sheet role heading;
- receipt amount/title;
- focused handoff titles.

### Monospace

Use for:

- fingerprints;
- transaction hashes;
- sequence IDs;
- technical proof disclosure.

## 10.2 Color tokens

```css
--pp-bg: #090B0A;
--pp-surface-1: #0F1310;
--pp-surface-2: #151B17;
--pp-border-dark: #29302B;
--pp-text-primary: #F3F5F2;
--pp-text-secondary: #A8B0AA;
--pp-text-muted: #7D867F;

--pp-sheet: #F2EEE5;
--pp-sheet-raised: #FAF7F0;
--pp-ink: #191B19;
--pp-ink-secondary: #555650;
--pp-sheet-border: #D8D2C5;

--pp-action: #F2FF63;
--pp-action-ink: #0B0D0B;
--pp-success: #79A881;
--pp-success-bg: #D9EFDD;
--pp-attention: #6D5711;
--pp-attention-bg: #FFF0AD;
--pp-danger: #8B3026;
--pp-danger-bg: #F8E4E1;
```

Accessibility correction: `#747168` on `#F2EEE5` is below 4.5:1 for normal text. Use `#676961` or darker for small sheet copy.

## 10.3 Spacing and geometry

```css
--pp-space-1: 4px;
--pp-space-2: 8px;
--pp-space-3: 12px;
--pp-space-4: 16px;
--pp-space-5: 24px;
--pp-space-6: 32px;
--pp-space-7: 48px;
--pp-space-8: 72px;
--pp-space-9: 112px;

--pp-radius-control: 12px;
--pp-radius-card: 18px;
--pp-radius-sheet: 22px;
--pp-radius-scene: 32px;
--pp-radius-pill: 999px;
```

## 10.4 Iconography

- 1.5–1.75 px line icons.
- Geometric, minimal, rounded joins.
- Use icons only where they improve scanning.
- Pair status icons with labels.

Core icons:

- outcome boundary;
- contribution sheet;
- private link;
- terms matched;
- evidence package;
- wallet approval;
- settlement receipt;
- expiration;
- warning.

## 10.5 Imagery

Use product-native composition rather than stock photography.

- Architectural lines and lanes.
- Cropped Contribution Sheets.
- Close-up UI states.
- Abstract physical-document lighting.
- No people required for MVP.

### Decision record — design tokens

- **Owning skill:** `brand-visual-systems-engine`; token implementation by `design-to-product-engine`.
- **Rationale:** Shared tokens keep landing, application, handoff, wallet, and receipt visually coherent.
- **Relevant Product Truth:** Dark global coordination plus warm role-scoped agreement.
- **Status:** Proposed refinement of existing implemented palette.
- **Dependencies:** CSS token migration, font loading constraints.
- **Quality gates:** WCAG contrast, token completeness, visual consistency, performance.

---

# 11. Scroll, Motion, and Interaction Sequence

## 11.1 Landing motion

- Hero lanes reveal from outcome origin.
- Contribution Sheets enter with 6–12 px vertical drift and subtle rotation.
- Scroll sections reveal once, not continuously.
- Settlement flow advances left-to-right on desktop and top-to-bottom on mobile.
- Final CTA resolves separated lanes into one completed outcome boundary.

## 11.2 Application motion

- Sheet creation: 180 ms opacity + translate.
- Status progression: track segment fills over 220 ms.
- Composer open: drawer or inline expansion over 200–260 ms.
- Share/copy confirmation: toast enters 160 ms, remains about 1.6 s, exits 180 ms.
- Review matched checks: stagger 60–90 ms.
- Receipt: success seal and amount appear after transaction hash is returned.

## 11.3 Authority moments

Before opening Nimiq Pay:

- freeze page motion;
- update primary button to “Waiting for Nimiq Pay…”;
- preserve context under the external approval surface;
- restore exact state after rejection or return.

## 11.4 Reduced motion

When `prefers-reduced-motion: reduce`:

- disable floating sheet loops;
- remove parallax;
- use immediate state changes or opacity only;
- preserve toast timing without directional movement;
- never encode meaning only in animation.

### Decision record — motion

- **Owning skill:** `design-to-product-engine`, constrained by experience and brand.
- **Rationale:** Motion should clarify handoff, state, and authority—not decorate.
- **Relevant Product Truth:** One contribution moves through a deterministic lifecycle.
- **Status:** Proposed; partial motion implemented.
- **Dependencies:** browser/WebView performance and reduced-motion support.
- **Quality gates:** functional-motion, reduced-motion, no-state-obscuration, 60-fps target on representative phone.

---

# 12. Responsive Behaviour

## Breakpoints

- Compact: 320–479 px.
- Mobile: 480–767 px.
- Tablet: 768–1023 px.
- Desktop: 1024–1439 px.
- Wide: 1440 px+.

## Mobile principles

- Contributor journey is the strictest reference viewport: 390 px.
- One column for all handoff pages.
- 44 px minimum targets.
- Sticky bottom primary action when the action is below a long document.
- Safe-area padding for Nimiq Pay WebView.
- Hashes and addresses wrap or truncate with accessible full-value disclosure.
- No horizontal scrolling.
- Deadline cards stack.
- Lifecycle track becomes 2×2 or vertical.

## Coordinator mobile

- Outcome index becomes a compact selector, not a permanent sidebar.
- Metrics reduce to two highest-value summaries: Needs review and NIM committed.
- Contribution cards show role, amount, state, next action first; details expand.
- Composer becomes full-screen sheet or dedicated state.

## Desktop

- Coordinator rail remains visible.
- Outcome and contribution content uses a maximum readable width.
- Do not stretch warm sheets across the full viewport.

### Decision record — responsiveness

- **Owning skill:** `design-to-product-engine`.
- **Rationale:** The Mini App environment is mobile-first, but coordinators may create and review on desktop.
- **Relevant Product Truth:** Contributor handoff must remain understandable without shared workspace or training.
- **Status:** Proposed refinement; current CSS has partial responsive support.
- **Dependencies:** Nimiq Pay WebView dimensions, device testing.
- **Quality gates:** 320px minimum, 390px decisive journey, touch targets, no overflow, safe-area support.

---

# 13. Loading, Empty, Success, Error, Restricted, and Permission States

## Loading

- App boot: branded graphite skeleton, never a blank screen.
- Local state load: immediate; no spinner unless migration occurs.
- Wallet initialization: “Waiting for Nimiq Pay…” with cancel/retry after timeout.
- Share: button busy state only if native share is active; copy fallback returns immediate toast.
- Settlement: preserve recipient and amount while waiting.

## Empty

- No outcomes: explain one outcome + one contribution; show Create outcome.
- Outcome has no contributions: show Add first contribution.
- No evidence: explain who acts next.
- No wallet: contextual Connect Nimiq account, not a generic error.

## Success

- Outcome created: compact confirmation and contribution composer opens.
- Terms frozen: show Invitation ready and dominant Share action.
- Link copied: “Private invitation copied” toast, 1.6 s.
- Accepted: state changes and evidence form appears.
- Evidence submitted: response handoff surface appears.
- Settled: receipt only after transaction hash.

## Error

- Invalid form: inline field messages plus top summary only when multiple errors.
- Invalid link: explain unsupported/damaged and request a replacement.
- Wrong coordinator device: explain that original local state is required.
- Wallet unavailable: explain browser vs Nimiq Pay environment.
- Wallet rejection: “No payment was sent” or “Account connection was cancelled.”
- Settlement failure: preserve submitted state and allow retry.

## Restricted / permission

- Contributor cannot see coordinator workspace.
- Response cannot be imported without matching local outcome/contribution state.
- Expired invitation disables acceptance and offers Request new invitation guidance.
- Settled contribution disables duplicate payment.
- Bearer link warning appears before copying only as concise secondary text, not a modal every time.

### Decision record — states

- **Owning skill:** `experience-narrative-engine`; system semantics consult by `system-integrity-engine`.
- **Rationale:** Failure and restricted states reveal the actual trust model and must not be generic.
- **Relevant Product Truth:** Local coordinator authority, bearer-secret links, explicit wallet approval.
- **Status:** Proposed; several states implemented, recovery incomplete.
- **Dependencies:** state machine, timeout handling, route validation.
- **Quality gates:** failure-recovery, permission-clarity, no-false-success, persistent-context.

---

# 14. Frontend Component Architecture

## 14.1 Foundations

```text
src/design/
├── tokens.css
├── typography.css
├── motion.css
├── primitives/
│   ├── Button.tsx
│   ├── Field.tsx
│   ├── Dialog.tsx
│   ├── Toast.tsx
│   ├── StatusBadge.tsx
│   └── AppFrame.tsx
```

## 14.2 Product-native components

```text
src/components/pactpay/
├── BrandMark.tsx
├── OutcomeRail.tsx
├── OutcomeHeader.tsx
├── ContributionSheet.tsx
├── ContributionComposer.tsx
├── EntitlementBlock.tsx
├── LifecycleTrack.tsx
├── NextActionPanel.tsx
├── PrivacyScope.tsx
├── TermsSummary.tsx
├── EvidencePackage.tsx
├── WalletDock.tsx
├── AuthorityBridge.tsx
├── SettlementSummary.tsx
└── SettlementReceipt.tsx
```

## 14.3 Page compositions

```text
src/pages/
├── LandingPage.tsx
├── DemoPage.tsx
├── CoordinatorAppPage.tsx
├── InvitationEntryPage.tsx
├── ContributorRoomPage.tsx
├── ResponseReviewPage.tsx
├── ReceiptPage.tsx
└── WalletPage.tsx
```

## 14.4 State and services

```text
src/features/
├── outcomes/
├── contributions/
├── handoffs/
├── wallet/
└── settlement/

src/services/
├── storage.ts
├── handoffCodec.ts
├── fingerprint.ts
└── nimiq.ts
```

## 14.5 Architecture rules

- Pages compose; they do not own domain transitions.
- Lifecycle transitions remain in one domain module.
- Share/copy uses one service and one Toast component.
- Wallet environment and account state use one provider/hook.
- Encoded handoff parsing is validated before rendering pages.
- Demo fixture creation is isolated and explicitly labelled.
- CSS is migrated from page-specific files toward tokens + component styles incrementally, not as a deadline-risk rewrite.

### Decision record — frontend architecture

- **Owning skill:** `design-to-product-engine`.
- **Rationale:** The current monolithic `App.tsx` mixes routing, state transitions, page composition, handoff, and settlement, making refinement risky.
- **Relevant Product Truth:** One lifecycle should render consistently across coordinator, contributor, review, and receipt surfaces.
- **Status:** Proposed target architecture; current implementation remains monolithic.
- **Dependencies:** no-regression extraction plan, test coverage.
- **Quality gates:** component-responsibility, domain-state separation, route integrity, visual parity.

---

# 15. Accessibility Contract

## Semantics

- One `h1` per page.
- Landmark structure: header/nav/main/footer.
- Contribution lifecycle uses ordered list semantics.
- Status changes use `aria-live="polite"`; errors use `role="alert"`.
- Dialogs trap focus and restore it.
- Icon-only controls receive accessible names.

## Keyboard

- Entire coordinator journey is operable without pointer.
- Visible focus ring uses yellow/ivory contrast without changing layout.
- Escape closes non-destructive overlays.
- Enter submits forms only when valid and expected.

## Colour and contrast

- Normal text target: WCAG AA 4.5:1.
- Large text target: 3:1.
- Focus and component boundaries: 3:1.
- State never relies only on colour.
- Replace low-contrast `#747168` small text on ivory.

## Motion

- Respect reduced motion.
- No required time-limited actions except external deadlines represented as data.
- Toasts auto-dismiss visually but messages remain non-essential and actions are already completed; critical errors do not auto-dismiss.

## Forms

- Persistent labels.
- Helpful examples but no placeholder-only instruction.
- Inline validation associated with fields.
- Date/time communicated in local timezone.
- Amount input states NIM and supports decimal precision.

## Language

- Plain English.
- Avoid unexplained protocol jargon.
- “Private” is qualified: role-scoped handoff, not anonymous blockchain settlement.
- Technical proof values have copy buttons and readable labels.

## Localization readiness

Full localization is not required for competition MVP. Preserve:

- `Intl.DateTimeFormat` usage;
- no text embedded in images;
- flexible layouts for 30–40% text expansion;
- central string extraction as later implementation work.

### Decision record — accessibility

- **Owning skill:** `design-to-product-engine` accessibility contract.
- **Rationale:** Accessibility is part of implementation integrity, not optional polish.
- **Relevant Product Truth:** Terms and authority must be understandable before acceptance and payment.
- **Status:** Proposed baseline contract; formal specialist audit unresolved.
- **Dependencies:** component extraction and device testing.
- **Quality gates:** keyboard, focus, semantics, contrast, reduced-motion, form-errors, 390px flow.

---

# 16. Implementation Handoff

## 16.1 Submission-critical pass

### Priority 0 — release blockers

1. Build and runtime verification at current branch head.
2. Complete a real 0.01 NIM contribution through receipt.
3. Replace README product definition and SHA-256 claim after Product Truth/integrity review.
4. Verify private invitation and response routes under the public HTTPS URL.
5. Ensure all wallet rejection/failure states say that no payment occurred.
6. Move to stable HTTPS hosting if possible; otherwise clearly label temporary tunnel in internal submission checklist.

### Priority 1 — high-leverage surface refinement

1. Introduce shared `Toast` and remove DOM-observer auto-dismiss workaround.
2. Extract `ContributionSheet`, `EntitlementBlock`, `LifecycleTrack`, and `WalletDock`.
3. Replace workspace hero with compact coordinator home/header; keep cinematic hero only on landing.
4. Make invitation, response, wallet, and receipt use the same focused-sheet frame.
5. Add browser-preview vs Nimiq-Pay environment badge.
6. Correct muted text contrast.

### Priority 2 — architecture after submission

1. Split coordinator logical views into routes.
2. Add versioned handoff payload validation.
3. Restore cryptographic fingerprints with migration/versioning if required by Product Truth and security review.
4. Add durable state/backend only as a future compatible extension.
5. Create final Bound Pact logo asset.

## 16.2 Acceptance checklist

### Landing

- Product understood in under 20 seconds.
- Primary CTA enters app.
- Demo and invitation paths are visible but secondary.
- No generic blockchain imagery.

### Coordinator

- One dominant next action.
- Outcome and contribution hierarchy is clear.
- Share confirmation is visible but brief.
- Submitted contribution visibly needs review.

### Contributor

- Terms visible before wallet connection.
- Amount and deadlines are prominent.
- Connected address is labelled Settlement address.
- Evidence submission and response sharing are explicit.

### Settlement

- Recipient and amount are visible before wallet approval.
- Rejection preserves submitted state.
- Receipt is created only after transaction hash.

### Responsive/accessibility

- 390 px decisive journey passes.
- No horizontal overflow.
- 44 px controls.
- Keyboard and visible focus pass.
- Reduced-motion pass.

## 16.3 Handoffs

### To `product-truth-engine`

Resolve and canonicalize:

- Outcome/private-contribution terminology versus README project/task terminology.
- Exact privacy wording.
- Whether “terms frozen” is acceptable with the current integrity mechanism.
- Current proof boundary after real settlement verification.

### To `system-integrity-engine`

Define:

- authoritative lifecycle and recovery states;
- fingerprint/integrity semantics;
- versioned payload validation;
- duplicate settlement protection;
- local-state wrong-device recovery language.

### To `brand-visual-systems-engine`

Produce:

- final brand thesis;
- Bound Pact logo sketches and selected mark;
- canonical token file;
- typography and icon specification;
- cross-surface visual QA.

### To `design-to-product-engine`

Implement:

- shared component grammar;
- coordinator shell refinement;
- focused handoff frame;
- responsive and accessibility contract;
- motion and toast system;
- visual regression checks.

### To `interface-ecosystem-engine`

Review only the Nimiq Pay projection:

- account connection and account switching;
- payment approval language;
- deeplink/environment behaviour;
- transaction return and failure semantics.

---

# Gate Summary

| Gate | Status | Notes |
|---|---|---|
| Owner authority | PASS | Experience Narrative is primary owner; protected Product Truth preserved |
| Context profile | PASS | Standard profile sufficient; no deep escalation required |
| Product Truth availability | CONDITIONAL | Proposed reconstruction exists; canonical artifact was missing |
| Protected truth | PASS WITH OPEN REVIEW | No foundation change introduced; contradictions registered |
| Experience coherence | PROPOSED PASS | Complete journey and surface map defined; not user-tested |
| Brand truth | PROPOSED PASS | Direction aligns with existing brand artifact; logo unresolved |
| Implementation realism | PASS | Recommendations distinguish current adaptive shell from target routes |
| System integrity | CONDITIONAL | Fingerprint and SHA-256 contradiction blocks strong integrity claims |
| Interface projection | CONDITIONAL | Wallet connection verified by user; complete settlement not yet reverified |
| Accessibility | CONDITIONAL | Contract defined; formal audit not executed |
| Release truth | BLOCKED | Latest build and complete 0.01 NIM settlement not verified; stable URL unresolved |

---

# Run Closure

- **Selected route:** Complete Product Surface → `experience-narrative-engine` / `experience-thesis`.
- **Current project maturity:** M6 Integrated Implementation; release capability remains demo-only and not fully gated.
- **Protected decisions:** primary coordinator, private contribution primitive, decisive handoff workflow, role-scoped privacy, explicit Nimiq Pay authority, MVP non-goals.
- **Proposed artifacts:** Product Surface Map, logical page inventory, sitemap, navigation model, brand/visual direction, logo direction, tokens, motion system, responsive contract, state catalogue, component architecture, accessibility contract, implementation handoff.
- **Unresolved contradictions:** README terminology, SHA-256 claim, integrity language, adaptive-shell versus page hierarchy, stable deployment URL.
- **Gate status:** Conditional; release gate blocked, design proposal complete.
- **Next handoff:** `product-truth-engine` canonicalization and contradiction resolution, followed by `design-to-product-engine` submission-critical realization and visual QA.
