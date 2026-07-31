import { useState } from 'react';
import { connectNimiq } from '../nimiq/client';

function short(value: string): string {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function openInNimiqPayUrl(): string {
  return `nimiqpay://miniapp?url=${encodeURIComponent(window.location.href.replace(window.location.hash, '#/wallet'))}`;
}

export function WalletPage() {
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const insideNimiqPay = 'nimiqPay' in window;

  async function connect() {
    setBusy(true);
    setStatus('Waiting for Nimiq Pay approval…');
    try {
      const address = await connectNimiq();
      setAccount(address);
      setStatus('Nimiq account connected for this session.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The Nimiq account could not be connected.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="appShell">
    <header className="topbar">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div>
      </button>
      <button className="secondary" onClick={() => { window.location.hash = '/'; }}>Back to outcomes</button>
    </header>

    {status && <div className="notice" role="status">{status}</div>}

    <section className="inviteWrap">
      <article className="sheet inviteSheet walletPage">
        <p className="eyebrow">NIMIQ PAY</p>
        <h1>Your settlement wallet</h1>
        <p className="outcomeAlias">PactPay asks Nimiq Pay for an account only when you accept a contribution or approve a settlement.</p>

        <div className="privacyBox">
          <strong>Your keys never enter PactPay</strong>
          <p>Nimiq Pay shows a native confirmation for account access and every NIM payment. PactPay receives only the approved address or transaction hash.</p>
        </div>

        {account ? <div className="connected">
          <span>Connected account</span>
          <strong>{short(account)}</strong>
        </div> : insideNimiqPay ? <button className="primary wide" disabled={busy} onClick={connect}>
          {busy ? 'Waiting for approval…' : 'Connect Nimiq account'}
        </button> : <>
          <div className="paymentSummary">
            <span>Wallet provider unavailable</span>
            <strong>Open PactPay inside Nimiq Pay</strong>
            <small>A normal desktop browser does not inject the Nimiq wallet provider.</small>
          </div>
          <a className="primary wide linkButton" href={openInNimiqPayUrl()}>Open in Nimiq Pay</a>
        </>}

        <ol className="walletSteps">
          <li><strong>Open Nimiq Pay</strong><span>Use the Mini Apps section and enter the PactPay URL during development.</span></li>
          <li><strong>Approve account access</strong><span>Nimiq Pay lets you choose the address used for acceptance or settlement.</span></li>
          <li><strong>Approve each payment</strong><span>The native wallet confirmation shows recipient and NIM amount before sending.</span></li>
        </ol>
      </article>
    </section>
  </main>;
}

export function WalletLauncher() {
  return <button className="walletLauncher" onClick={() => { window.location.hash = '/wallet'; }}>
    <span className="walletDot" /> Wallet & Nimiq Pay
  </button>;
}
