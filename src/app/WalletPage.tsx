import { useState } from 'react';
import { connectNimiq, getConnectedNimiqAccount } from '../nimiq/client';

function short(value: string): string {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function openInNimiqPayUrl(): string {
  const target = `${window.location.origin}${window.location.pathname}#/wallet`;
  return `nimiqpay://miniapp?url=${encodeURIComponent(target)}`;
}

export function WalletPage() {
  const [account, setAccount] = useState(getConnectedNimiqAccount);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

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
      <div className="navActions"><button className="secondary" onClick={() => { window.location.hash = '/'; }}>Home</button><button className="primary" onClick={() => { window.location.hash = '/app'; }}>Open app</button></div>
    </header>

    {status && <div className="notice" role="status">{status}</div>}

    <section className="inviteWrap">
      <article className="sheet inviteSheet walletPage">
        <p className="eyebrow">NIMIQ PAY</p>
        <h1>Your settlement wallet</h1>
        <p className="outcomeAlias">Connect once for this session. Nimiq Pay still asks for explicit approval when an account is shared or a NIM payment is sent.</p>

        <div className="privacyBox"><strong>Your keys never enter PactPay</strong><p>PactPay receives only the account you approve and the transaction hash returned after an approved payment.</p></div>

        {account ? <div className="connected"><span>Connected account</span><strong>{short(account)}</strong><button className="secondary" onClick={connect} disabled={busy}>Choose another account</button></div> : <>
          <button className="primary wide" disabled={busy} onClick={connect}>{busy ? 'Waiting for Nimiq Pay…' : 'Connect Nimiq account'}</button>
          <p className="walletHint">Inside Nimiq Pay, this opens the native account approval. In a normal browser, PactPay will explain that the wallet provider is unavailable.</p>
          <a className="secondary wide linkButton" href={openInNimiqPayUrl()}>Open this page in Nimiq Pay</a>
        </>}

        <ol className="walletSteps"><li><strong>Open PactPay in Nimiq Pay</strong><span>Use the Mini Apps area or the button above.</span></li><li><strong>Connect your account</strong><span>Choose the address used for accepting contributions or sending settlements.</span></li><li><strong>Approve every payment</strong><span>Nimiq Pay shows the recipient and amount before anything is sent.</span></li></ol>
      </article>
    </section>
  </main>;
}

export function WalletLauncher() {
  return <button className="walletLauncher" onClick={() => { window.location.hash = '/wallet'; }}><span className="walletDot" /> Wallet & Nimiq Pay</button>;
}
