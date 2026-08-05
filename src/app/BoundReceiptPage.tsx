import { useEffect, useState } from 'react';
import { decodePayload, isBoundReceiptPayload, type BoundReceiptPayload } from '../handoff/payload';
import { verifyNimiqSettlement, type VerifySettlementResult } from '../nimiq/rpc';
import { assertReceiptTransactionData } from '../settlement/receipt';

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

function readReceipt(): BoundReceiptPayload {
  const decoded = decodePayload(receiptPayloadFromHash());
  if (decoded.kind !== 'receipt') throw new Error('This is not a settlement receipt.');
  if (!isBoundReceiptPayload(decoded)) {
    throw new Error('This legacy receipt does not contain a PactPay transaction binding.');
  }
  assertReceiptTransactionData(decoded.receiptId, decoded.transactionData);
  return decoded;
}

export function BoundReceiptPage() {
  let receipt: BoundReceiptPayload;
  try {
    receipt = readReceipt();
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

  return <VerifiedReceipt receipt={receipt} />;
}

function VerifiedReceipt({ receipt }: { receipt: BoundReceiptPayload }) {
  const [result, setResult] = useState<VerifySettlementResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [rpcError, setRpcError] = useState('');

  async function verify() {
    setChecking(true);
    setRpcError('');
    try {
      const next = await verifyNimiqSettlement({
        transactionHash: receipt.transactionHash,
        recipient: receipt.recipient,
        amountLuna: receipt.amountLuna,
        transactionData: receipt.transactionData,
      });
      setResult(next);
    } catch (error) {
      setRpcError(error instanceof Error ? error.message : 'Nimiq verification is temporarily unavailable.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void verify();
  }, [receipt.transactionHash]);

  const confirmed = result?.state === 'confirmed';
  const failed = result?.state === 'verification-failed';
  const pending = result?.state === 'pending';
  const exportReceipt = {
    ...receipt,
    settlementState: confirmed ? 'confirmed' : failed ? 'verification-failed' : 'confirming',
    confirmedAt: confirmed ? result.verification.checkedAt : undefined,
    confirmedBlockHeight: confirmed ? result.verification.blockHeight : undefined,
    verification: result?.verification,
    verificationError: failed ? result.error : rpcError || undefined,
  };

  async function copyReceipt(): Promise<void> {
    await navigator.clipboard.writeText(JSON.stringify(exportReceipt, null, 2));
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
        <div className="settledSeal">{confirmed ? '✓' : failed ? '!' : '↗'}</div>
        <p className="eyebrow">{confirmed ? 'SETTLED · VERIFIED ON NIMIQ' : failed ? 'VERIFICATION FAILED' : 'VERIFYING SETTLEMENT'}</p>
        <h1>{receipt.amountNim} NIM {confirmed ? 'verified' : 'sent'}</h1>
        <p className="outcomeAlias">{receipt.role} · {receipt.outcomeLabel}</p>

        <div className="privacyBox">
          <strong>Receipt-bound transaction</strong>
          <p>The transaction carries <code>{receipt.transactionData}</code>, binding the frozen terms, signed acceptance, evidence, recipient, and exact amount.</p>
        </div>

        {checking && <div className="nextAction"><span>VERIFICATION STATE</span><strong>Checking Nimiq transaction inclusion and settlement fields…</strong></div>}
        {!checking && rpcError && <div className="nextAction"><span>VERIFICATION UNAVAILABLE</span><strong>{rpcError}</strong></div>}
        {!checking && pending && <div className="nextAction"><span>AWAITING CONFIRMATION</span><strong>{result.verification.transactionFound ? 'Transaction found but not yet included.' : 'Transaction is not indexed yet.'}</strong></div>}
        {!checking && failed && <div className="nextAction"><span>VERIFICATION FAILED</span><strong>{result.error}</strong></div>}
        {!checking && confirmed && <div className="verification">
          <span>✓ Transaction found</span>
          <span>✓ Included on Nimiq</span>
          <span>✓ Recipient matched</span>
          <span>✓ Amount matched</span>
          <span>✓ PP1 reference matched</span>
        </div>}

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
          {result?.verification.blockHeight !== undefined && <div><dt>Block height</dt><dd>{result.verification.blockHeight.toLocaleString()}</dd></div>}
          {result && <div><dt>Last checked</dt><dd>{formatDate(result.verification.checkedAt)}</dd></div>}
        </dl>

        {!checking && !confirmed && <button className="primary wide" onClick={() => { void verify(); }}>Retry verification</button>}
        <button className={confirmed ? 'primary wide' : 'secondary wide'} onClick={() => { void copyReceipt(); }}>Copy verified receipt JSON</button>
        <button className="secondary wide" onClick={() => { window.location.hash = '/app'; }}>Return to workspace</button>
      </article>
    </section>

    <footer><strong>PactPay</strong><span>Clear terms. Signed acceptance. Verified NIM settlement.</span></footer>
  </main>;
}
