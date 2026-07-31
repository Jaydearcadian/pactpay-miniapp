import { useEffect } from 'react';

const INVITATION_ACTION_RE = /^open(?: private)? invitation$/i;

export function useInvitationEntry(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button) return;

      const label = button.textContent?.trim() ?? '';
      if (!INVITATION_ACTION_RE.test(label)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.hash = '/open-invitation';
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
