import { useEffect, useMemo, useState } from 'react';
import type { Contribution, Outcome, PactPayState } from '../domain/model';
import { getContributionNextAction, transitionContribution } from '../domain/lifecycle';
import { decodePayload, encodePayload, type InvitePayload, type ReceiptPayload, type ResponsePayload } from '../handoff/payload';
import { fingerprintEvidence, fingerprintTerms } from '../lib/fingerprint';
import { createId } from '../lib/id';
import { connectNimiq, sendNim } from '../nimiq/client';
import { loadState, resetState, saveState } from '../storage/repository';

type Route =
  | { kind: 'home' }
  | { kind: 'invite'; payload: string }
  | { kind: 'response'; payload: string }
  | { kind: 'receipt'; payload: string };

function parseRoute(): Route {
  const hash = window.location.hash || '#/';
  const match = hash.match(/^#\/(invite|response|receipt)\/(.+)$/u);
  if (!match) return { kind: 'home' };
  return { kind: match[1] as Route['kind'] & ('invite' | 'response' | 'receipt'), payload: match[2] };
}

function routeUrl(kind: 'invite' | 'response' | 'receipt', payload: string): string {
  return `${window.location.origin}${window.location.pathname}#/${kind}/${payload}`;
}

function localDateTime(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

async function shareOrCopy(title: string, text: string, url: string): Promise<string> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'Shared successfully.';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'Sharing cancelled.';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'Private link copied.';
}

const emptyContribution = {
  role: '',
  obligation: '',
  criteria: '',
  amountNim: '10',
  acceptanceDeadline: localDateTime(1),
  deliveryDeadline: localDateTime(3),
};

export function App() {
  const [state, setState] = useState<PactPayState>(loadState);
  const [route, setRoute] = useState<Route>(parseRoute);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(state.outcomes.length === 0);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [outcomeName, setOutcomeName] = useState('');
  const [outcomeLabel, setOutcomeLabel] = useState('');
  const [targetDate, setTargetDate] = useState(localDateTime(7).slice(0, 10));
  const [contributionForm, setContributionForm] = useState(emptyContribution);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const persist = (next: PactPayState) => {
    setState(next);
    saveState(next);
  };

  const activeOutcome = useMemo(() => {
    return state.outcomes.find((outcome) => outcome.id === state.activeOutcomeId) ?? state.outcomes[0] ?? null;
  }, [state]);

  function updateContribution(outcomeId: string, nextContribution: Contribution) {
    persist({
      ...state,
      activeOutcomeId: outcomeId,
      outcomes: state.outcomes.map((outcome) => outcome.id === outcomeId
        ? { ...outcome, contributions: outcome.contributions.map((item) => item.id === nextContribution.id ? nextContribution : item) }
        : outcome),
    });
  }

  function createOutcome(event: React.FormEvent) {
    event.preventDefault();
    if (!outcomeName.trim() || !outcomeLabel.trim() || !targetDate) {
      setMessage('Complete the outcome name, contributor-visible alias, and target date.');
      return;
    }
    const outcome: Outcome = {
      id: createId(),
      name: outcomeName.trim(),
      privateLabel: outcomeLabel.trim(),
      targetDate: new Date(`${targetDate}T23:59:00`).toISOString(),
      createdAt: new Date().toISOString(),
      contributions: [],
    };
    persist({ outcomes: [outcome, ...state.outcomes], activeOutcomeId: outcome.id });
    setOutcomeName('');
    setOutcomeLabel('');
    setShowOutcomeForm(false);
    setShowContributionForm(true);
    setMessage('Outcome created. Add the first private contribution.');
  }

  async function createContribution(event: React.FormEvent) {
    event.preventDefault();
    if (!activeOutcome) return;
    const amount = Number(contributionForm.amountNim);
    const criteria = contributionForm.criteria.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!contributionForm.role.trim() || !contributionForm.obligation.trim() || criteria.length === 0 || !Number.isFinite(amount) || amount <= 0) {
      setMessage('Add a role, obligation, at least one acceptance criterion, and a valid NIM entitlement.');
      return;
    }
    if (new Date(contributionForm.acceptanceDeadline) >= new Date(contributionForm.deliveryDeadline)) {
      setMessage('The delivery deadline must be after the acceptance deadline.');
      return;
    }

    setBusy(true);
    try {
      const draft: Contribution = {
        id: createId(),
        outcomeId: activeOutcome.id,
        role: contributionForm.role.trim(),
        obligation: contributionForm.obligation.trim(),
        acceptanceCriteria: criteria,
        amountNim: amount,
        acceptanceDeadline: new Date(contributionForm.acceptanceDeadline).toISOString(),
        deliveryDeadline: new Date(contributionForm.deliveryDeadline).toISOString(),
        termsHash: '',
        status: 'draft',
      };
      const termsHash = await fingerprintTerms(draft);
      const contribution = transitionContribution(draft, 'invited', { termsHash });
      persist({
        ...state,
        activeOutcomeId: activeOutcome.id,
        outcomes: state.outcomes.map((outcome) => outcome.id === activeOutcome.id
          ? { ...outcome, contributions: [...outcome.contributions, contribution] }
          : outcome),
      });
      setContributionForm(emptyContribution);
      setShowContributionForm(false);
      setMessage('Terms frozen. The private invitation is ready to share.');
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite(outcome: Outcome, contribution: Contribution) {
    const invite: InvitePayload = {
      version: 1,
      kind: 'invite',
      outcomeLabel: outcome.privateLabel,
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
    setMessage(await shareOrCopy('Private PactPay contribution', `${contribution.role} · ${contribution.amountNim} NIM`, routeUrl('invite', encodePayload(invite))));
  }

  function importResponse(response: ResponsePayload): Contribution | null {
    const outcome = state.outcomes.find((item) => item.id === response.outcomeId);
    const contribution = outcome?.contributions.find((item) => item.id === response.contributionId);
    if (!outcome || !contribution) return null;
    if (contribution.termsHash !== response.termsHash) throw new Error('The returned terms do not match the frozen contribution.');
    if (contribution.status === 'settled') return contribution;
    const accepted = contribution.status === 'invited'
      ? transitionContribution(contribution, 'accepted', { contributorAddress: response.contributorAddress, acceptedAt: response.acceptedAt })
      : { ...contribution, contributorAddress: response.contributorAddress, acceptedAt: response.acceptedAt };
    const submitted = accepted.status === 'accepted'
      ? transitionContribution(accepted, 'submitted', { evidence: response.evidence })
      : { ...accepted, evidence: response.evidence, status: 'submitted' as const };
    updateContribution(outcome.id, submitted);
    return submitted;
  }

  async function settle(outcome: Outcome, contribution: Contribution) {
    if (contribution.status !== 'submitted' || !contribution.evidence || !contribution.contributorAddress) return;
    if (contribution.receipt) {
      setMessage('This contribution is already settled.');
      return;
    }
    setBusy(true);
    setMessage('Waiting for Nimiq Pay confirmation…');
    try {
      const transactionHash = await sendNim({
        recipient: contribution.contributorAddress,
        amountNim: contribution.amountNim,
        contributionId: contribution.id,
        evidenceHash: contribution.evidence.hash,
      });
      const settledAt = new Date().toISOString();
      const settled = transitionContribution(contribution, 'settled', {
        receipt: { transactionHash, settledAt, amountNim: contribution.amountNim, recipient: contribution.contributorAddress },
      });
      updateContribution(outcome.id, settled);
      const receipt: ReceiptPayload = {
        version: 1,
        kind: 'receipt',
        contributionId: contribution.id,
        outcomeLabel: outcome.privateLabel,
        role: contribution.role,
        amountNim: contribution.amountNim,
        recipient: contribution.contributorAddress,
        evidenceHash: contribution.evidence.hash,
        transactionHash,
        settledAt,
      };
      window.location.hash = `/receipt/${encodePayload(receipt)}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settlement was not completed.');
    } finally {
      setBusy(false);
    }
  }

  if (route.kind === 'invite') return <InviteRoom payload={route.payload} setMessage={setMessage} />;
  if (route.kind === 'receipt') return <ReceiptPage payload={route.payload} />;
  if (route.kind === 'response') {
    let response: ResponsePayload;
    try {
      const decoded = decodePayload(route.payload);
      if (decoded.kind !== 'response') throw new Error('This is not a contribution response.');
      response = decoded;
    } catch (error) {
      return <InvalidLink message={error instanceof Error ? error.message : 'This response link is invalid.'} />;
    }
    let contribution: Contribution | null = null;
    let error = '';
    try { contribution = importResponse(response); } catch (value) { error = value instanceof Error ? value.message : 'The response could not be verified.'; }
    const outcome = contribution ? state.outcomes.find((item) => item.id === contribution?.outcomeId) ?? null : null;
    return <Shell message={message}>
      {error ? <InvalidLink message={error} /> : !contribution || !outcome ? <InvalidLink message="Open this response on the coordinator device that created the original contribution." /> : <ReviewSheet outcome={outcome} contribution={contribution} busy={busy} onSettle={() => settle(outcome, contribution!)} />}
    </Shell>;
  }

  const totalCommitted = state.outcomes.flatMap((outcome) => outcome.contributions).reduce((sum, item) => sum + item.amountNim, 0);
  const needsReview = state.outcomes.flatMap((outcome) => outcome.contributions).filter((item) => item.status === 'submitted').length;
  const settledCount = state.outcomes.flatMap((outcome) => outcome.contributions).filter((item) => item.status === 'settled').length;

  return <Shell message={message}>
    <section className="hero">
      <p className="eyebrow">PRIVATE CONTRIBUTION LEDGER</p>
      <h1>One outcome.<br />Private contributions.<br />Everyone settled.</h1>
      <p className="heroCopy">Define clear obligations, share role-scoped contribution rooms, verify evidence, and settle accepted work through Nimiq Pay.</p>
      <div className="actions">
        <button className="primary" onClick={() => setShowOutcomeForm(true)}>Create an outcome</button>
        <button className="secondary" onClick={() => { const value = window.prompt('Paste a PactPay invitation link'); if (value) window.location.href = value; }}>Open an invitation</button>
      </div>
    </section>

    <section className="metrics">
      <article><span>Active outcomes</span><strong>{state.outcomes.length}</strong></article>
      <article><span>Needs review</span><strong>{needsReview}</strong></article>
      <article><span>NIM committed</span><strong>{totalCommitted.toLocaleString()}</strong></article>
      <article><span>Settled</span><strong>{settledCount}</strong></article>
    </section>

    {showOutcomeForm && <form className="sheet darkSheet" onSubmit={createOutcome}>
      <div className="sheetHead"><div><p className="eyebrow">NEW OUTCOME</p><h2>Create the coordination room</h2></div><button type="button" className="textButton" onClick={() => setShowOutcomeForm(false)}>Close</button></div>
      <div className="formGrid">
        <label>Outcome name<input value={outcomeName} onChange={(event) => setOutcomeName(event.target.value)} placeholder="Summer product launch" /></label>
        <label>Contributor-visible alias<input value={outcomeLabel} onChange={(event) => setOutcomeLabel(event.target.value)} placeholder="Product launch programme" /></label>
        <label>Target date<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
      </div>
      <p className="hint">Contributors see the alias, not the full client identity.</p>
      <button className="primary" type="submit">Create outcome</button>
    </form>}

    <section className="ledgerLayout">
      <aside className="outcomeIndex">
        <div className="indexHead"><strong>Outcomes</strong><button onClick={() => setShowOutcomeForm(true)}>+</button></div>
        {state.outcomes.map((outcome) => <button key={outcome.id} className={outcome.id === activeOutcome?.id ? 'outcomeLink active' : 'outcomeLink'} onClick={() => persist({ ...state, activeOutcomeId: outcome.id })}>
          <strong>{outcome.name}</strong><small>{outcome.contributions.length} contributions</small>
        </button>)}
      </aside>

      <div className="ledger">
        {activeOutcome ? <>
          <div className="ledgerHead">
            <div><p className="eyebrow">ACTIVE OUTCOME</p><h2>{activeOutcome.name}</h2><p>{activeOutcome.privateLabel} · target {new Date(activeOutcome.targetDate).toLocaleDateString()}</p></div>
            <button className="primary" onClick={() => setShowContributionForm(true)}>Add contribution</button>
          </div>

          {showContributionForm && <form className="sheet contributionEditor" onSubmit={createContribution}>
            <div className="sheetHead"><div><p className="eyebrow">PRIVATE CONTRIBUTION</p><h3>Define the deal clearly</h3></div><button type="button" className="textButton" onClick={() => setShowContributionForm(false)}>Close</button></div>
            <div className="formGrid two">
              <label>Contributor role<input value={contributionForm.role} onChange={(event) => setContributionForm({ ...contributionForm, role: event.target.value })} placeholder="Launch designer" /></label>
              <label>NIM entitlement<input type="number" min="0.00001" step="0.00001" value={contributionForm.amountNim} onChange={(event) => setContributionForm({ ...contributionForm, amountNim: event.target.value })} /></label>
            </div>
            <label>What must be delivered?<textarea value={contributionForm.obligation} onChange={(event) => setContributionForm({ ...contributionForm, obligation: event.target.value })} placeholder="Final responsive landing-page design and editable source files" /></label>
            <label>What counts as accepted?<textarea value={contributionForm.criteria} onChange={(event) => setContributionForm({ ...contributionForm, criteria: event.target.value })} placeholder={'Desktop design approved\nMobile design approved\nEditable source included'} /></label>
            <div className="formGrid two">
              <label>Accept by<input type="datetime-local" value={contributionForm.acceptanceDeadline} onChange={(event) => setContributionForm({ ...contributionForm, acceptanceDeadline: event.target.value })} /></label>
              <label>Deliver by<input type="datetime-local" value={contributionForm.deliveryDeadline} onChange={(event) => setContributionForm({ ...contributionForm, deliveryDeadline: event.target.value })} /></label>
            </div>
            <p className="hint">Freezing locks the obligation, criteria, entitlement, and deadlines into the private invitation.</p>
            <button className="primary" disabled={busy}>Freeze terms and create invitation</button>
          </form>}

          <div className="contributionList">
            {activeOutcome.contributions.map((contribution, index) => <article className="sheet contributionSheet" key={contribution.id}>
              <div className="sheetHead"><span className="sequence">{String(index + 1).padStart(2, '0')}</span><span className={`status ${contribution.status}`}>{contribution.status}</span></div>
              <h3>{contribution.role}</h3>
              <p className="obligation">{contribution.obligation}</p>
              <div className="entitlement"><span>ENTITLEMENT</span><strong>{contribution.amountNim} NIM</strong></div>
              <div className="trustTrack"><span className="done">Terms frozen</span><span className={['accepted','submitted','settled'].includes(contribution.status) ? 'done' : ''}>Accepted</span><span className={['submitted','settled'].includes(contribution.status) ? 'done' : ''}>Evidence</span><span className={contribution.status === 'settled' ? 'done' : ''}>Settled</span></div>
              <div className="nextAction"><span>NEXT ACTION</span><strong>{getContributionNextAction(contribution)}</strong></div>
              {contribution.evidence && <div className="evidenceBox"><a href={contribution.evidence.link} target="_blank" rel="noreferrer">Open submitted evidence</a><small>Fingerprint {short(contribution.evidence.hash)}</small></div>}
              {contribution.receipt && <div className="receiptMini"><strong>{contribution.receipt.amountNim} NIM settled</strong><small>{short(contribution.receipt.transactionHash)}</small></div>}
              <div className="actions">
                {contribution.status === 'invited' && <button className="primary" onClick={() => shareInvite(activeOutcome, contribution)}>Share private invitation</button>}
                {contribution.status === 'submitted' && <button className="primary" disabled={busy} onClick={() => settle(activeOutcome, contribution)}>Approve and pay {contribution.amountNim} NIM</button>}
              </div>
            </article>)}
          </div>

          {activeOutcome.contributions.length === 0 && <div className="emptyState"><h3>No contributions yet</h3><p>Add the first role-scoped obligation to create a private invitation.</p><button className="primary" onClick={() => setShowContributionForm(true)}>Add first contribution</button></div>}
        </> : <div className="emptyState"><h2>Create your first outcome</h2><p>Start with one outcome and one independently settled contribution.</p><button className="primary" onClick={() => setShowOutcomeForm(true)}>Create outcome</button></div>}
      </div>
    </section>

    {state.outcomes.length > 0 && <button className="reset" onClick={() => { if (window.confirm('Delete all local PactPay data on this device?')) { resetState(); setState({ outcomes: [] }); setShowOutcomeForm(true); } }}>Reset local data</button>}
  </Shell>;
}

function Shell({ children, message }: { children: React.ReactNode; message?: string }) {
  return <main className="appShell">
    <header className="topbar"><button className="brand" onClick={() => { window.location.hash = '/'; }}><span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div></button><div className="network">Nimiq Pay Mini App</div></header>
    {message && <div className="notice" role="status">{message}</div>}
    {children}
    <footer><strong>PactPay</strong><span>Clear terms. Private fulfilment. Verifiable NIM settlement.</span></footer>
  </main>;
}

function InviteRoom({ payload, setMessage }: { payload: string; setMessage: (message: string) => void }) {
  let invite: InvitePayload;
  try {
    const decoded = decodePayload(payload);
    if (decoded.kind !== 'invite') throw new Error('This is not a contribution invitation.');
    invite = decoded;
  } catch (error) {
    return <InvalidLink message={error instanceof Error ? error.message : 'This invitation is invalid.'} />;
  }

  const [address, setAddress] = useState('');
  const [acceptedAt, setAcceptedAt] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [responseUrl, setResponseUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const contribution = invite.contribution;
  const expired = new Date(contribution.acceptanceDeadline).getTime() < Date.now() && !acceptedAt;

  async function accept() {
    setBusy(true);
    try {
      const account = await connectNimiq();
      setAddress(account);
      setAcceptedAt(new Date().toISOString());
      setMessage('Terms accepted. Submit the evidence when the contribution is ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nimiq connection failed.');
    } finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptedAt || !address) return;
    if (!link.trim()) { setMessage('Add a working evidence link.'); return; }
    if (new Date(contribution.deliveryDeadline).getTime() < Date.now()) { setMessage('The delivery deadline has passed. Contact the coordinator.'); return; }
    const submittedAt = new Date().toISOString();
    const hash = await fingerprintEvidence({ contributionId: contribution.id, termsHash: contribution.termsHash, link, note, submittedAt });
    const response: ResponsePayload = {
      version: 1,
      kind: 'response',
      contributionId: contribution.id,
      outcomeId: contribution.outcomeId,
      termsHash: contribution.termsHash,
      contributorAddress: address,
      acceptedAt,
      evidence: { link: link.trim(), note: note.trim(), hash, submittedAt },
    };
    setResponseUrl(routeUrl('response', encodePayload(response)));
    setMessage('Evidence packaged. Share the private response with the coordinator.');
  }

  return <Shell message="">
    <section className="inviteWrap">
      <article className="sheet inviteSheet">
        <p className="eyebrow">PRIVATE CONTRIBUTION</p>
        <p className="outcomeAlias">{invite.outcomeLabel}</p>
        <h1>{contribution.role}</h1>
        <div className="entitlement heroEntitlement"><span>YOUR ENTITLEMENT</span><strong>{contribution.amountNim} NIM</strong><small>Paid after the submitted contribution is reviewed and approved.</small></div>
        <section><h2>Your obligation</h2><p>{contribution.obligation}</p></section>
        <section><h2>Acceptance criteria</h2><ul>{contribution.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
        <div className="deadlineGrid"><div><span>Accept by</span><strong>{formatDate(contribution.acceptanceDeadline)}</strong></div><div><span>Deliver by</span><strong>{formatDate(contribution.deliveryDeadline)}</strong></div></div>
        <div className="privacyBox"><strong>Terms are frozen</strong><p>The obligation, criteria, entitlement, and deadlines are fingerprinted. The coordinator cannot silently change this invitation after acceptance.</p></div>
        {!acceptedAt ? <button className="primary wide" disabled={busy || expired} onClick={accept}>{expired ? 'Acceptance deadline passed' : busy ? 'Connecting…' : 'Connect Nimiq and accept'}</button> : <form className="evidenceForm" onSubmit={submit}>
          <div className="connected"><span>Payment address</span><strong>{short(address)}</strong></div>
          <label>Evidence link<input type="url" required value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" /></label>
          <label>Submission note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe what is included in the delivery." /></label>
          <button className="primary wide" type="submit">Submit contribution</button>
        </form>}
        {responseUrl && <div className="successBox"><h2>Contribution submitted</h2><p>Your evidence is ready for the coordinator.</p><button className="primary wide" onClick={async () => setMessage(await shareOrCopy('PactPay contribution response', `${contribution.role} evidence`, responseUrl))}>Share with coordinator</button><button className="secondary wide" onClick={async () => { await navigator.clipboard.writeText(responseUrl); setMessage('Response link copied.'); }}>Copy response link</button></div>}
      </article>
    </section>
  </Shell>;
}

function ReviewSheet({ outcome, contribution, busy, onSettle }: { outcome: Outcome; contribution: Contribution; busy: boolean; onSettle: () => void }) {
  return <section className="inviteWrap"><article className="sheet inviteSheet">
    <p className="eyebrow">CONTRIBUTION RECEIVED</p><h1>{contribution.role}</h1>
    <div className="verification"><span>✓ Contribution matched</span><span>✓ Frozen terms matched</span><span>✓ Recipient included</span><span>✓ Evidence fingerprint created</span></div>
    <section><h2>Evidence</h2><a href={contribution.evidence?.link} target="_blank" rel="noreferrer">{contribution.evidence?.link}</a><p>{contribution.evidence?.note}</p><small>{contribution.evidence?.hash}</small></section>
    <div className="deadlineGrid"><div><span>Recipient</span><strong>{short(contribution.contributorAddress ?? '')}</strong></div><div><span>Entitlement</span><strong>{contribution.amountNim} NIM</strong></div></div>
    <div className="paymentSummary"><span>You are paying</span><strong>{contribution.amountNim} NIM</strong><small>For {contribution.role} · {outcome.privateLabel}</small></div>
    <button className="primary wide" disabled={busy || contribution.status === 'settled'} onClick={onSettle}>{busy ? 'Waiting for Nimiq Pay…' : `Approve and pay ${contribution.amountNim} NIM`}</button>
  </article></section>;
}

function ReceiptPage({ payload }: { payload: string }) {
  let receipt: ReceiptPayload;
  try {
    const decoded = decodePayload(payload);
    if (decoded.kind !== 'receipt') throw new Error('This is not a settlement receipt.');
    receipt = decoded;
  } catch (error) {
    return <InvalidLink message={error instanceof Error ? error.message : 'This receipt is invalid.'} />;
  }
  return <Shell><section className="inviteWrap"><article className="sheet inviteSheet receiptSheet">
    <div className="settledSeal">✓</div><p className="eyebrow">SETTLED</p><h1>{receipt.amountNim} NIM sent</h1><p className="outcomeAlias">{receipt.role} · {receipt.outcomeLabel}</p>
    <dl><div><dt>Recipient</dt><dd>{receipt.recipient}</dd></div><div><dt>Evidence fingerprint</dt><dd>{receipt.evidenceHash}</dd></div><div><dt>Transaction</dt><dd>{receipt.transactionHash}</dd></div><div><dt>Settled</dt><dd>{formatDate(receipt.settledAt)}</dd></div></dl>
    <button className="primary wide" onClick={async () => { await shareOrCopy('PactPay settlement receipt', `${receipt.amountNim} NIM settled`, window.location.href); }}>Share receipt</button>
    <button className="secondary wide" onClick={() => { window.location.hash = '/'; }}>Return to PactPay</button>
  </article></section></Shell>;
}

function InvalidLink({ message }: { message: string }) {
  return <Shell><section className="inviteWrap"><div className="sheet invalid"><p className="eyebrow">LINK ERROR</p><h1>This private handoff cannot be opened.</h1><p>{message}</p><button className="primary" onClick={() => { window.location.hash = '/'; }}>Return to PactPay</button></div></section></Shell>;
}
