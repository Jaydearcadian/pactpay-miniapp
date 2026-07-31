function legacyCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Automatic copy is unavailable. Select and copy the private link manually.');
}

export function installShareFallback(): void {
  const originalClipboard = navigator.clipboard;

  try {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        ...originalClipboard,
        writeText: async (text: string) => {
          if (originalClipboard?.writeText) {
            try {
              await originalClipboard.writeText(text);
              return;
            } catch {
              // HTTP development origins commonly reject the Clipboard API.
            }
          }
          legacyCopy(text);
        },
      },
    });
  } catch {
    // Some WebViews expose a non-configurable clipboard getter.
  }

  if (!navigator.share) {
    try {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async ({ url, text }: ShareData) => {
          legacyCopy(url || text || '');
        },
      });
    } catch {
      // The existing application still exposes a visible copy fallback.
    }
  }
}
