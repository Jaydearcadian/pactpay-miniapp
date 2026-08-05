import { useEffect, useState } from 'react';
import {
  decodePayload,
  encodePayload,
  isBoundReceiptPayload,
  type BoundReceiptPayload,
} from '../handoff/payload';
import { verifyNimiqSettlement, type VerifySettlementResult } from '../nimiq/rpc';
import { assertReceiptTransactionData } from '../settlement/receipt';
import { loadState, saveState } from '../storage/repository';

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

function persistReceipt(receipt: BoundReceiptPayload): void {
  const state = loadState();
  let changed = false;
  const outcomes = state.outcomes.map((outcome) => {
    if (outcome.id !== receipt.outcomeId) return outcome;
    const contributions = outcome.contributions.map((contribution) => {
      if (contribution.id !== receipt.contributionId || !contribution.receipt) return contribution;
      if (contribution.receipt.transactionHash !== receipt.transactionHash) return contribution;
      changed = true;
      return {
        ...contribution,
        status: receipt.settlementState === 'confirmed' ? 'settled' as const : 'payment-broadcast' as const,
        receipt: {
          ...contribution.receipt,
          settlementState: receipt.settlementState,
          confirmedAt: receipt.confirmedAt,
          confirmedBlockHeight: receipt.confirmedBlockHeight,
          verification: receipt.verification,
          verificationError: receipt.verificationError,
        },
      };
    });
    return { ...outcome, contributions };
  });
  if (changed) saveState({ ...state, outcomes });
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

  return <VerifiedReceipt initialReceipt={receipt} />;
}

function VerifiedReceipt({ initialReceipt }: { initialReceipt: BoundReceiptPayload }) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [result, setResult] = useState<VerifySettlementResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [rpcError, setRpcError] = useState('');

  function store(next: BoundReceiptPayload): void {
    setReceipt(next);
    persistReceipt(next);
    window.history.replaceState(null, '', `#/receipt/${encodePayload(next)}`);
  }

  async function verify() {
    setChecking(true);
    setRpcError('');
    try {
      const nextResult = await verifyNimiqSettlement({
        transactionHash: receipt.transactionHash,
        recipient: receipt.recipient,
        amountLuna: receipt.amountLuna,
        transactionData: receipt.transactionData,
      });
      setResult(nextResult);

      const nextReceipt: BoundReceiptPayload = {
        ...receipt,
        settlementState: nextResult.state === 'pending' ? 'confirming' : nextResult.state,
        verification: nextResult.verification,
        verificationError: nextResult.error,
        ...(nextResult.state === 'confirmed'
          ? {
              confirmedAt: nextResult.verification.checkedAt,
              confirmedBlockHeight: nextResult.verification.blockHeight,
            }
          : {}),
      };
      store(nextReceipt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nimiq verification is temporarily unavailable.';
      setRpcError(message);
      store({
        ...receipt,
        settlementState: 'confirming',
        verificationError: message,
      });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void verify();
    // Verification runs once on receipt open. Further attempts are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReceipt.transactionHash]);

  const confirmed = receipt.settlementState === 'confirmed';
  const failed = receipt.settlementState === 'verification-failed';
  const pending = receipt.settlementState === 'confirming';

  async function copyReceipt(): Promise<void> {
    await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
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
        {!checking && pending && !rpcError && <div className="nextAction"><span>AWAITING CONFIRMATION</span><strong>{receipt.verification?.transactionFound ? 'Transaction found but not yet included.' : 'Transaction is not indexed yet.'}</strong></div>}
        {!checking && failed && <div className="nextAction"><span>VERIFICATION FAILED</span><strong>{receipt.verificationError}</strong></div>}

        {receipt.verification && <div className="verification">
          <span>{receipt.verification.transactionFound ? '✓' : '○'} Transaction found</span>
          <span>{receipt.verification.included ? '✓' : '○'} Included on Nimiq</span>
          <span>{receipt.verification.recipientMatches ? '✓' : '×'} Recipient matched</span>
          <span>{receipt.verification.amountMatches ? '✓' : '×'} Amount matched</span>
          <span>{receipt.verification.dataMatches ? '✓' : '×'} PP1 reference matched</span>
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
          {receipt.confirmedBlockHeight !== undefined && <div><dt>Block height</dt><dd>{receipt.confirmedBlockHeight.toLocaleString()}</dd></div>}
          {receipt.confirmedAt && <div><dt>Verified at</dt><dd>{formatDate(receipt.confirmedAt)}</dd></div>}
        </dl>

        {!checking && !confirmed && <button className="primary wide" onClick={() => { void verify(); }}>Retry verification</button>}
        <button className={confirmed ? 'primary wide' : 'secondary wide'} onClick={() => { void copyReceipt(); }}>Copy verified receipt JSON</button>
        <button className="secondary wide" onClick={() => { window.location.hash = '/app'; }}>Return to workspace</button>
      </article>
    </section>

    <footer><strong>PactPay</strong><span>Clear terms. Signed acceptance. Verified NIM settlement.</span></footer>
  </main>;
}
