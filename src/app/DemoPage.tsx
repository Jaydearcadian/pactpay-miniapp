import type { PactPayState } from '../domain/model';
import { encodePayload, type InvitePayload } from '../handoff/payload';
import { saveState } from '../storage/repository';

const outcomeId = 'demo-outcome-launch';
const contributionId = 'demo-contribution-designer';
const termsHash = '7d8a3c4f2b194a6e8f03c1d57aa39b624ecf9005d42b8a731f6e2c10a9475bd1';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function demoState(): PactPayState {
  return {
    activeOutcomeId: outcomeId,
    outcomes: [{
      id: outcomeId,
      name: 'Summer product launch',
      privateLabel: 'Product launch programme',
      targetDate: daysFromNow(7),
      createdAt: new Date().toISOString(),
      contributions: [{
        id: contributionId,
        outcomeId,
        role: 'Launch designer',
        obligation: 'Deliver the responsive launch-page design and editable source files.',
        acceptanceCriteria: [
          'Desktop design approved',
          'Mobile design approved',
          'Editable source files included',
        ],
        amountNim: 0.01,
        acceptanceDeadline: daysFromNow(1),
        deliveryDeadline: daysFromNow(3),
        termsHash,
        status: 'invited',
      }],
    }],
  };
}

function invitationUrl(): string {
  const contribution = demoState().outcomes[0].contributions[0];
  const invite: InvitePayload = {
    version: 1,
    kind: 'invite',
    outcomeLabel: 'Product launch programme',
    contribution: {
      id: contribution.id,
      outcomeId: contribution.outcomeId,
      role: contribution.role,
      obligation: contribution.obligation,
      acceptanceCriteria: contribution.acceptanceCriteria,
      amountNim: contribution.amountNim,
      acceptanceDeadline: contribution.acceptanceDeadline,
      deliveryDeadline: contribution.deliveryDeadline,
      termsHash: contribution.termsHash,
    },
  };
  return `/invite/${encodePayload(invite)}`;
}

export function DemoPage() {
  function loadCoordinatorDemo() {
    saveState(demoState());
    window.location.hash = '/app';
  }

  return <main className="demoPage">
    <nav className="siteNav demoNav">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Guided product demo</small></div>
      </button>
      <div className="navActions">
        <button className="secondary" onClick={() => { window.location.hash = '/'; }}>Back to overview</button>
        <button className="primary" onClick={loadCoordinatorDemo}>Launch demo</button>
      </div>
    </nav>

    <section className="demoHero">
      <div>
        <p className="eyebrow">GUIDED VERTICAL SLICE</p>
        <h1>See one private contribution move from frozen terms to NIM settlement.</h1>
        <p>This demo uses a clearly labelled fixture: one coordinator, one launch designer, one role-scoped invitation, and a 0.01 NIM entitlement.</p>
        <div className="actions">
          <button className="primary" onClick={loadCoordinatorDemo}>Load coordinator workspace</button>
          <button className="secondary" onClick={() => { window.location.hash = invitationUrl(); }}>Preview contributor room</button>
        </div>
      </div>
      <article className="demoScenario">
        <small>DEMO SCENARIO</small>
        <strong>Product launch programme</strong>
        <span>Launch designer</span>
        <div><small>ENTITLEMENT</small><strong>0.01 NIM</strong></div>
      </article>
    </section>

    <section className="demoSequence">
      <article><span>01</span><h2>Define</h2><p>The coordinator freezes the role, obligation, acceptance criteria, deadlines, and entitlement.</p></article>
      <article><span>02</span><h2>Share</h2><p>PactPay creates a private role-scoped invitation. A visible confirmation tells the coordinator when the link is copied.</p></article>
      <article><span>03</span><h2>Fulfil</h2><p>The contributor connects through Nimiq Pay, accepts, and submits evidence against the frozen terms.</p></article>
      <article><span>04</span><h2>Settle</h2><p>The coordinator verifies the response, approves 0.01 NIM, and receives a transaction-backed receipt.</p></article>
    </section>

    <section className="demoBoundary">
      <div><p className="eyebrow">PROVEN NOW</p><h2>The complete private handoff loop.</h2><p>Outcome creation, frozen terms, encoded invitations, Nimiq account approval, evidence response, settlement approval, and receipt generation.</p></div>
      <div className="boundaryCards">
        <article><small>CURRENT DEMO</small><strong>One bilateral contribution</strong><p>Local coordinator state and private URL-fragment handoffs.</p></article>
        <article><small>NOT THE PRODUCT</small><strong>Marketplace or task board</strong><p>PactPay coordinates a private commercial obligation, not public work discovery.</p></article>
        <article><small>ROADMAP</small><strong>Durable shared infrastructure</strong><p>Authenticated accounts, resilient storage, team collaboration, and richer settlement policies.</p></article>
      </div>
    </section>

    <section className="finalCta demoFinal">
      <p className="eyebrow">READY TO DEMONSTRATE</p>
      <h2>One outcome. One private contribution. One verifiable settlement.</h2>
      <div className="actions">
        <button className="primary" onClick={loadCoordinatorDemo}>Start the live demo</button>
        <button className="secondary" onClick={() => { window.location.hash = '/wallet'; }}>Check Nimiq wallet</button>
      </div>
    </section>

    <footer className="siteFooter">
      <div><strong>PactPay</strong><p>Clear terms. Private fulfilment. Verifiable NIM settlement.</p></div>
      <div className="footerLinks"><button onClick={() => { window.location.hash = '/'; }}>Overview</button><button onClick={() => { window.location.hash = '/app'; }}>Workspace</button><button onClick={() => { window.location.hash = '/wallet'; }}>Wallet</button></div>
    </footer>
  </main>;
}
