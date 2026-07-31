import { useEffect } from 'react';

export function useInvitationEntry(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!button) return;
      if (!/^open an invitation$/i.test(button.textContent?.trim() ?? '')) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.hash = '/open-invitation';
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
