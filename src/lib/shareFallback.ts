function showManualCopy(text: string): void {
  window.prompt('Copy this private PactPay link and send it to the intended person:', text);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  return copied;
}

async function guaranteedCopy(text: string, originalClipboard?: Clipboard): Promise<void> {
  if (originalClipboard?.writeText) {
    try {
      await originalClipboard.writeText(text);
      return;
    } catch {
      // Some Mini App WebViews expose Clipboard but reject writes.
    }
  }

  if (legacyCopy(text)) return;
  showManualCopy(text);
}

export function installShareFallback(): void {
  const originalClipboard = navigator.clipboard;
  const originalShare = typeof navigator.share === 'function'
    ? navigator.share.bind(navigator)
    : null;

  const writeText = async (text: string): Promise<void> => {
    await guaranteedCopy(text, originalClipboard);
  };

  try {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  } catch {
    // The share override below still performs its own guaranteed fallback.
  }

  const resilientShare = async ({ title, text, url }: ShareData): Promise<void> => {
    if (originalShare) {
      try {
        await originalShare({ title, text, url });
        return;
      } catch {
        // Fall through to copy/manual handoff even when Web Share exists.
      }
    }

    const value = url || text || '';
    if (!value) throw new Error('No private link was available to share.');
    await guaranteedCopy(value, originalClipboard);
  };

  try {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: resilientShare,
    });
  } catch {
    // Last resort: the app will call clipboard.writeText after share fails.
  }
}
