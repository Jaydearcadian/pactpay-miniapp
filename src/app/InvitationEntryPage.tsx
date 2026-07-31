import { useState } from 'react';

function normalizeInvitation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Paste a PactPay invitation link.');

  let url: URL;
  try {
    url = new URL(trimmed, window.location.href);
  } catch {
    throw new Error('This does not look like a valid link.');
  }

  if (!url.hash.startsWith('#/invite/')) {
    throw new Error('This link is not a PactPay private invitation.');
  }

  return url.toString();
}

export function InvitationEntryPage() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function openInvitation(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError('');
      window.location.href = normalizeInvitation(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The invitation could not be opened.');
    }
  }

  return <main className="handoffPage">
    <nav className="siteNav handoffNav">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div>
      </button>
      <button className="secondary" onClick={() => { window.location.hash = '/app'; }}>Back to workspace</button>
    </nav>

    <section className="handoffStage">
      <div className="handoffGlow" aria-hidden="true" />
      <article className="handoffCard">
        <div className="handoffMark">P</div>
        <p className="eyebrow">PRIVATE HANDOFF</p>
        <h1>Open your contribution room.</h1>
        <p className="handoffCopy">Paste the private invitation sent by your coordinator. PactPay will open only the terms intended for you.</p>

        <form onSubmit={openInvitation}>
          <label>Private invitation link
            <textarea
              autoFocus
              rows={4}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://…#/invite/…"
              spellCheck={false}
            />
          </label>
          {error && <div className="handoffError" role="alert">{error}</div>}
          <button className="primary wide" type="submit">Open private invitation</button>
        </form>

        <div className="handoffTrust">
          <span>Role-scoped terms</span>
          <span>Wallet approval in Nimiq Pay</span>
          <span>No public profile required</span>
        </div>
      </article>
    </section>

    <footer className="siteFooter handoffFooter">
      <div><strong>PactPay</strong><p>Clear terms. Private fulfilment. Verifiable NIM settlement.</p></div>
      <div className="footerLinks"><button onClick={() => { window.location.hash = '/'; }}>Overview</button><button onClick={() => { window.location.hash = '/demo'; }}>Demo</button><button onClick={() => { window.location.hash = '/wallet'; }}>Wallet</button></div>
    </footer>
  </main>;
}
