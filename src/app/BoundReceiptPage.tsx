import { decodePayload, type ReceiptPayload } from '../handoff/payload';

function receiptPayloadFromHash(): string {
  const match = window.location.hash.match(/^#\/receipt\/(.+)$/u);
  if (!match) throw new Error('This settlement receipt link is incomplete.');
  return match[1];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function short(value: string): string {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

async function copyReceipt(receipt: ReceiptPayload): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
}

export function BoundReceiptPage() {
  let receipt: ReceiptPayload;
  try {
    const decoded = decodePayload(receiptPayloadFromHash());
    if (decoded.kind !== 'receipt') throw new Error('This is not a settlement receipt.');
    receipt = decoded;
  } catch (error) {
    return <main className="appShell">
      <section className="inviteWrap">
        <article className="sheet inviteSheet invalid">
          <p className="eyebrow">RECEIPT ERROR</p>
          <h1>This settlement receipt cannot be opened.</h1>
          <p>{error instanceof Error ? error.message : 'The receipt is invalid.'}</p>
          <button className="primary" onClick={() => { window.location.hash = '/'; }}>Return to PactPay</button>
        </article>
      </section>
    </main>;
  }

  return <main className="appShell">
    <header className="topbar">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div>
      </button>
      <div className="network">Nimiq Pay Mini App</div>
    </header>

    <section className="inviteWrap">
      <article className="sheet inviteSheet receiptSheet">
        <div className="settledSeal">↗</div>
        <p className="eyebrow">PAYMENT BROADCAST</p>
        <h1>{receipt.amountNim} NIM sent</h1>
        <p className="outcomeAlias">{receipt.role} · {receipt.outcomeLabel}</p>

        <div className="privacyBox">
          <strong>Receipt-bound transaction</strong>
          <p>The Nimiq transaction carries <code>{receipt.transactionData}</code>, a deterministic reference binding the frozen terms, signed acceptance, evidence, recipient, and exact amount.</p>
        </div>

        <dl>
          <div><dt>Receipt ID</dt><dd>{receipt.receiptId}</dd></div>
          <div><dt>Transaction data</dt><dd>{receipt.transactionData}</dd></div>
          <div><dt>Transaction hash</dt><dd>{receipt.transactionHash}</dd></div>
          <div><dt>Recipient</dt><dd>{receipt.recipient}</dd></div>
          <div><dt>Amount</dt><dd>{receipt.amountLuna.toLocaleString()} luna</dd></div>
          <div><dt>Terms fingerprint</dt><dd>{short(receipt.termsHash)}</dd></div>
          <div><dt>Acceptance signature</dt><dd>{short(receipt.acceptanceSignature)}</dd></div>
          <div><dt>Evidence fingerprint</dt><dd>{short(receipt.evidenceHash)}</dd></div>
          <div><dt>Broadcast at</dt><dd>{formatDate(receipt.settledAt)}</dd></div>
        </dl>

        <div className="nextAction">
          <span>VERIFICATION STATE</span>
          <strong>Broadcast recorded — onchain inclusion verification follows in Phase 3</strong>
        </div>

        <button className="primary wide" onClick={async () => { await copyReceipt(receipt); }}>Copy receipt JSON</button>
        <button className="secondary wide" onClick={() => { window.location.hash = '/app'; }}>Return to workspace</button>
      </article>
    </section>

    <footer><strong>PactPay</strong><span>Clear terms. Signed acceptance. Receipt-bound NIM settlement.</span></footer>
  </main>;
}
