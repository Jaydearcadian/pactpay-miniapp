import { useState } from 'react';
import { decodePayload, encodePayload, type InvitePayload, type ResponsePayload } from '../handoff/payload';
import { fingerprintEvidence } from '../lib/fingerprint';
import { signContributionAcceptance } from '../nimiq/client';
import type { AcceptanceRecord } from '../domain/model';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function routeUrl(kind: 'response', payload: string): string {
  return `${window.location.origin}${window.location.pathname}#/${kind}/${payload}`;
}

async function shareOrCopy(title: string, text: string, url: string): Promise<string> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'Response shared.';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'Sharing cancelled.';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'Response link copied.';
}

function decodeInvite(payload: string): InvitePayload {
  const decoded = decodePayload(payload);
  if (decoded.kind !== 'invite') throw new Error('This is not a contribution invitation.');
  return decoded;
}

export function SignedInviteRoom({ payload }: { payload: string }) {
  let invite: InvitePayload;
  try {
    invite = decodeInvite(payload);
  } catch (error) {
    return <main className="appShell"><section className="inviteWrap"><article className="sheet inviteSheet invalid"><p className="eyebrow">LINK ERROR</p><h1>This invitation cannot be opened.</h1><p>{error instanceof Error ? error.message : 'This invitation is invalid.'}</p></article></section></main>;
  }

  const contribution = invite.contribution;
  const [acceptance, setAcceptance] = useState<AcceptanceRecord | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [responseUrl, setResponseUrl] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const expired = new Date(contribution.acceptanceDeadline).getTime() < Date.now() && !acceptance;

  async function accept() {
    setBusy(true);
    setMessage('Waiting for Nimiq Pay approval…');
    try {
      const signed = await signContributionAcceptance({
        contributionId: contribution.id,
        outcomeId: contribution.outcomeId,
        termsHash: contribution.termsHash,
      });
      setAcceptance(signed);
      setMessage('Acceptance signed. PactPay bound your Nimiq account to this exact terms fingerprint.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The contribution was not accepted.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptance) return;
    if (!link.trim()) {
      setMessage('Add a working evidence link.');
      return;
    }
    if (new Date(contribution.deliveryDeadline).getTime() < Date.now()) {
      setMessage('The delivery deadline has passed. Contact the coordinator.');
      return;
    }

    const submittedAt = new Date().toISOString();
    const hash = await fingerprintEvidence({
      contributionId: contribution.id,
      termsHash: contribution.termsHash,
      link,
      note,
      submittedAt,
    });
    const response: ResponsePayload = {
      version: 1,
      kind: 'response',
      contributionId: contribution.id,
      outcomeId: contribution.outcomeId,
      termsHash: contribution.termsHash,
      contributorAddress: acceptance.contributorAddress,
      acceptedAt: acceptance.acceptedAt,
      acceptance,
      evidence: { link: link.trim(), note: note.trim(), hash, submittedAt },
    };
    setResponseUrl(routeUrl('response', encodePayload(response)));
    setMessage('Evidence packaged with the signed acceptance. Share it with the coordinator.');
  }

  return <main className="appShell">
    <header className="topbar"><button className="brand" onClick={() => { window.location.hash = '/'; }}><span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div></button><div className="network">Nimiq Pay Mini App</div></header>
    {message && <div className="notice" role="status">{message}</div>}
    <section className="inviteWrap">
      <article className="sheet inviteSheet">
        <p className="eyebrow">SIGNED PRIVATE CONTRIBUTION</p>
        <p className="outcomeAlias">{invite.outcomeLabel}</p>
        <h1>{contribution.role}</h1>
        <div className="entitlement heroEntitlement"><span>YOUR ENTITLEMENT</span><strong>{contribution.amountNim} NIM</strong><small>Paid after the submitted contribution is reviewed and approved.</small></div>
        <section><h2>Your obligation</h2><p>{contribution.obligation}</p></section>
        <section><h2>Acceptance criteria</h2><ul>{contribution.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
        <div className="deadlineGrid"><div><span>Accept by</span><strong>{formatDate(contribution.acceptanceDeadline)}</strong></div><div><span>Deliver by</span><strong>{formatDate(contribution.deliveryDeadline)}</strong></div></div>
        <div className="privacyBox"><strong>Exact terms fingerprint</strong><p>{short(contribution.termsHash)}</p><p>Nimiq Pay signs a canonical acceptance message containing this fingerprint, the contribution, your payment address, and the acceptance time.</p></div>

        {!acceptance ? <button className="primary wide" disabled={busy || expired} onClick={accept}>{expired ? 'Acceptance deadline passed' : busy ? 'Waiting for Nimiq Pay…' : 'Sign terms with Nimiq Pay'}</button> : <>
          <div className="successBox"><h2>Acceptance signed</h2><p>Your Nimiq account is bound to this terms fingerprint.</p><small>Address: {short(acceptance.contributorAddress)}</small><small>Signature: {short(acceptance.signature)}</small></div>
          <form className="evidenceForm" onSubmit={submit}>
            <label>Evidence link<input type="url" required value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" /></label>
            <label>Submission note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe what is included in the delivery." /></label>
            <button className="primary wide" type="submit">Submit signed contribution</button>
          </form>
        </>}

        {responseUrl && <div className="successBox"><h2>Contribution submitted</h2><p>The response contains your signed acceptance and evidence fingerprint.</p><button className="primary wide" onClick={async () => setMessage(await shareOrCopy('PactPay signed contribution response', `${contribution.role} evidence`, responseUrl))}>Share with coordinator</button><button className="secondary wide" onClick={async () => { await navigator.clipboard.writeText(responseUrl); setMessage('Response link copied.'); }}>Copy response link</button></div>}
      </article>
    </section>
    <footer><strong>PactPay</strong><span>Clear terms. Signed acceptance. Verifiable NIM settlement.</span></footer>
  </main>;
}
