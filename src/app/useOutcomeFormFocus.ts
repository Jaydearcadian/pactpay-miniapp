import { useEffect } from 'react';

export function useOutcomeFormFocus(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button || !/create (an )?outcome/i.test(button.textContent ?? '')) return;

      window.setTimeout(() => {
        const form = document.querySelector<HTMLFormElement>('form.darkSheet');
        if (!form) return;

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        form.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
      }, 0);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
