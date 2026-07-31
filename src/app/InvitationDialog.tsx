import { useEffect, useRef, useState } from 'react';

const INVITATION_ACTION_RE = /^open(?: a)?(?: private)? invitation$/i;
const HANDOFF_HASH_RE = /^#\/(invite|response|receipt)\/.+/u;

function resolveHandoffHash(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (HANDOFF_HASH_RE.test(value)) return value;

  try {
    const url = new URL(value, window.location.href);
    return HANDOFF_HASH_RE.test(url.hash) ? url.hash : null;
  } catch {
    return null;
  }
}

export function InvitationDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interceptInvitationAction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const control = target.closest('button, a');
      if (!control) return;

      const label = (control.textContent ?? '').replace(/\s+/gu, ' ').trim();
      if (!INVITATION_ACTION_RE.test(label)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setError('');
      setOpen(true);
    };

    window.addEventListener('click', interceptInvitationAction, true);
    return () => window.removeEventListener('click', interceptInvitationAction, true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function closeDialog() {
    setOpen(false);
    setError('');
  }

  function openInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextHash = resolveHandoffHash(value);

    if (!nextHash) {
      setError('Paste a complete PactPay invitation link.');
      return;
    }

    closeDialog();
    setValue('');
    window.location.hash = nextHash;
  }

  if (!open) return null;

  return (
    <div
      className="invitationDialogBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        className="invitationDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-dialog-title"
      >
        <div className="invitationDialogTopline">
          <div className="invitationDialogBrand" aria-label="PactPay">
            <span className="invitationDialogMark">P</span>
            <div>
              <strong>PactPay</strong>
              <small>Private contribution handoff</small>
            </div>
          </div>
          <button className="invitationDialogClose" type="button" onClick={closeDialog} aria-label="Close invitation dialog">
            Close
          </button>
        </div>

        <div className="invitationDialogIntro">
          <p className="invitationDialogEyebrow">OPEN PRIVATE INVITATION</p>
          <h2 id="invitation-dialog-title">Enter a contribution room.</h2>
          <p>Paste the private PactPay link shared by your coordinator. Only the contribution encoded in that link is opened.</p>
        </div>

        <form onSubmit={openInvitation} noValidate>
          <label htmlFor="pactpay-invitation-link">Invitation link</label>
          <input
            ref={inputRef}
            id="pactpay-invitation-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError('');
            }}
            placeholder="https://pactpay-miniapp.pages.dev/#/invite/…"
            aria-describedby={error ? 'invitation-dialog-error invitation-dialog-trust' : 'invitation-dialog-trust'}
            aria-invalid={Boolean(error)}
          />
          {error && <p id="invitation-dialog-error" className="invitationDialogError" role="alert">{error}</p>}

          <div id="invitation-dialog-trust" className="invitationDialogTrust">
            <span aria-hidden="true">●</span>
            <p><strong>Role-scoped by design.</strong> PactPay opens only the obligation, terms, deadlines, and entitlement carried by this private link.</p>
          </div>

          <div className="invitationDialogActions">
            <button className="invitationDialogPrimary" type="submit">Open contribution room</button>
            <button className="invitationDialogSecondary" type="button" onClick={closeDialog}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
