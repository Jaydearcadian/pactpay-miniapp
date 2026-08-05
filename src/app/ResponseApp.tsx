import { useEffect, useState } from 'react';
import type { Contribution, Outcome, PactPayState } from '../domain/model';
import { transitionContribution } from '../domain/lifecycle';
import { decodePayload, encodePayload, type ReceiptPayload, type ResponsePayload } from '../handoff/payload';
import { fingerprintEvidence } from '../lib/fingerprint';
import { assertAcceptanceRecordMatches } from '../nimiq/acceptance';
import { sendNim } from '../nimiq/client';
import { createReceiptBinding } from '../settlement/receipt';
import { loadState, saveState } from '../storage/repository';

type ReviewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; outcome: Outcome; contribution: Contribution };

function responsePayloadFromHash(): string {
  const match = window.location.hash.match(/^#\/response\/(.+)$/u);
  if (!match) throw new Error('This contribution response link is incomplete.');
  return match[1];
}

function replaceContribution(
  state: PactPayState,
  outcomeId: string,
  contribution: Contribution,
): PactPayState {
  return {
    ...state,
    activeOutcomeId: outcomeId,
    outcomes: state.outcomes.map((outcome) => outcome.id === outcomeId
      ? {
          ...outcome,
          contributions: outcome.contributions.map((item) => item.id === contribution.id
            ? contribution
            : item),
        }
      : outcome),
  };
}

function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function ResponseApp() {
  const [review, setReview] = useState<ReviewState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function importResponse() {
      try {
        const decoded = decodePayload(responsePayloadFromHash());
        if (decoded.kind !== 'response') throw new Error('This is not a contribution response.');
        const response: ResponsePayload = decoded;

        const state = loadState();
        const outcome = state.outcomes.find((item) => item.id === response.outcomeId);
        const original = outcome?.contributions.find((item) => item.id === response.contributionId);

        if (!outcome || !original) {
          throw new Error('Open this response on the coordinator device that created the original contribution.');
        }
        if (original.termsHash !== response.termsHash) {
          throw new Error('The returned terms do not match the original contribution fingerprint.');
        }

        const acceptance = assertAcceptanceRecordMatches(response.acceptance, {
          contributionId: response.contributionId,
          outcomeId: response.outcomeId,
          termsHash: response.termsHash,
          contributorAddress: response.contributorAddress,
          acceptedAt: response.acceptedAt,
        });

        const expectedEvidenceHash = await fingerprintEvidence({
          contributionId: response.contributionId,
          termsHash: response.termsHash,
          link: response.evidence.link,
          note: response.evidence.note,
          submittedAt: response.evidence.submittedAt,
        });
        if (expectedEvidenceHash !== response.evidence.hash) {
          throw new Error('The evidence package was changed after it was created.');
        }

        if (original.status === 'settled') {
          if (active) setReview({ kind: 'ready', outcome, contribution: original });
          return;
        }
        if (original.status === 'draft') {
          throw new Error('This contribution was never issued as a private invitation.');
        }

        const accepted = original.status === 'invited'
          ? transitionContribution(original, 'accepted', {
              contributorAddress: response.contributorAddress,
              acceptedAt: response.acceptedAt,
              acceptance,
            })
          : {
              ...original,
              contributorAddress: response.contributorAddress,
              acceptedAt: response.acceptedAt,
              acceptance,
            };

        const submitted = accepted.status === 'accepted'
          ? transitionContribution(accepted, 'submitted', { evidence: response.evidence })
          : { ...accepted, evidence: response.evidence, status: 'submitted' as const };

        saveState(replaceContribution(state, outcome.id, submitted));
        if (active) setReview({ kind: 'ready', outcome, contribution: submitted });
      } catch (error) {
        if (active) {
          setReview({
            kind: 'error',
            message: error instanceof Error ? error.message : 'The contribution response could not be verified.',
          });
        }
      }
    }

    void importResponse();
    return () => { active = false; };
  }, []);

  async function settle(outcome: Outcome, contribution: Contribution) {
    if (contribution.status !== 'submitted' || !contribution.evidence || !contribution.contributorAddress) {
      setMessage('This contribution is not ready for settlement.');
      return;
    }
    if (!contribution.acceptance) {
      setMessage('This contribution is missing its signed acceptance record.');
      return;
    }
    if (contribution.receipt) {
      setMessage('This contribution already has a settlement receipt.');
      return;
    }

    setBusy(true);
    setMessage('Creating the PactPay receipt reference…');
    try {
      const binding = await createReceiptBinding({
        contributionId: contribution.id,
        outcomeId: contribution.outcomeId,
        termsHash: contribution.termsHash,
        acceptance: contribution.acceptance,
        evidenceHash: contribution.evidence.hash,
        recipient: contribution.contributorAddress,
        amountNim: contribution.amountNim,
      });

      setMessage('Waiting for Nimiq Pay approval. The transaction includes the PactPay receipt ID.');
      const transactionHash = await sendNim({
        recipient: contribution.contributorAddress,
        amountLuna: binding.amountLuna,
        transactionData: binding.transactionData,
      });
      const settledAt = new Date().toISOString();
      const settled = transitionContribution(contribution, 'settled', {
        receipt: {
          version: 1,
          receiptId: binding.receiptId,
          transactionData: binding.transactionData,
          transactionHash,
          settlementState: 'broadcast',
          settledAt,
          amountNim: contribution.amountNim,
          amountLuna: binding.amountLuna,
          recipient: contribution.contributorAddress,
        },
      });

      const latestState = loadState();
      saveState(replaceContribution(latestState, outcome.id, settled));

      const receipt: ReceiptPayload = {
        version: 1,
        kind: 'receipt',
        contributionId: contribution.id,
        outcomeId: contribution.outcomeId,
        outcomeLabel: outcome.privateLabel,
        role: contribution.role,
        termsHash: contribution.termsHash,
        acceptanceSignature: contribution.acceptance.signature,
        amountNim: contribution.amountNim,
        amountLuna: binding.amountLuna,
        recipient: contribution.contributorAddress,
        evidenceHash: contribution.evidence.hash,
        receiptId: binding.receiptId,
        transactionData: binding.transactionData,
        transactionHash,
        settlementState: 'broadcast',
        settledAt,
      };
      window.location.hash = `/receipt/${encodePayload(receipt)}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settlement was not completed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="appShell">
    <header className="topbar">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div>
      </button>
      <div className="network">Nimiq Pay Mini App</div>
    </header>

    {message && <div className="notice" role="status">{message}</div>}

    {review.kind === 'loading' && <section className="inviteWrap">
      <article className="sheet inviteSheet invalid">
        <p className="eyebrow">VERIFYING RESPONSE</p>
        <h1>Checking the private contribution.</h1>
        <p>PactPay is matching the original contribution, signed acceptance fields, recipient, and evidence fingerprint.</p>
      </article>
    </section>}

    {review.kind === 'error' && <section className="inviteWrap">
      <article className="sheet inviteSheet invalid">
        <p className="eyebrow">LINK ERROR</p>
        <h1>This private response cannot be opened.</h1>
        <p>{review.message}</p>
        <button className="primary" onClick={() => { window.location.hash = '/'; }}>Return to PactPay</button>
      </article>
    </section>}

    {review.kind === 'ready' && <section className="inviteWrap">
      <article className="sheet inviteSheet">
        <p className="eyebrow">SIGNED CONTRIBUTION RECEIVED</p>
        <h1>{review.contribution.role}</h1>
        <div className="verification">
          <span>✓ Contribution matched</span>
          <span>✓ Terms fingerprint matched</span>
          <span>✓ Signed acceptance fields matched</span>
          <span>✓ Evidence fingerprint verified</span>
        </div>
        <section>
          <h2>Signed acceptance</h2>
          <p>The contributor approved a canonical PactPay acceptance message through Nimiq Pay.</p>
          <small>Address: {short(review.contribution.acceptance?.contributorAddress ?? '')}</small><br />
          <small>Public key: {short(review.contribution.acceptance?.publicKey ?? '')}</small><br />
          <small>Signature: {short(review.contribution.acceptance?.signature ?? '')}</small>
        </section>
        <section>
          <h2>Evidence</h2>
          <a href={review.contribution.evidence?.link} target="_blank" rel="noreferrer">
            {review.contribution.evidence?.link}
          </a>
          <p>{review.contribution.evidence?.note}</p>
          <small>{review.contribution.evidence?.hash}</small>
        </section>
        <div className="deadlineGrid">
          <div><span>Recipient</span><strong>{short(review.contribution.contributorAddress ?? '')}</strong></div>
          <div><span>Entitlement</span><strong>{review.contribution.amountNim} NIM</strong></div>
        </div>
        <div className="paymentSummary">
          <span>You are paying</span>
          <strong>{review.contribution.amountNim} NIM</strong>
          <small>For {review.contribution.role} · {review.outcome.privateLabel}</small>
          <small>The NIM transaction will carry a deterministic <code>PP1:</code> receipt reference.</small>
        </div>
        {review.contribution.status === 'settled'
          ? <div className="successBox"><h2>Payment broadcast</h2><p>This contribution has a receipt-bound NIM transaction.</p><small>{review.contribution.receipt?.transactionData}</small></div>
          : <button
              className="primary wide"
              disabled={busy}
              onClick={() => settle(review.outcome, review.contribution)}
            >
              {busy ? 'Preparing receipt-bound payment…' : `Approve and pay ${review.contribution.amountNim} NIM`}
            </button>}
      </article>
    </section>}

    <footer><strong>PactPay</strong><span>Clear terms. Signed acceptance. Receipt-bound NIM settlement.</span></footer>
  </main>;
}
