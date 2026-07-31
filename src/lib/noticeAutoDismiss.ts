const DISMISS_AFTER_MS = 1_600;

export function installNoticeAutoDismiss(): () => void {
  const timers = new WeakMap<Element, number>();

  const arm = (notice: Element) => {
    const previous = timers.get(notice);
    if (previous) window.clearTimeout(previous);

    notice.classList.remove('notice--dismissed');
    const timer = window.setTimeout(() => {
      notice.classList.add('notice--dismissed');
      timers.delete(notice);
    }, DISMISS_AFTER_MS);

    timers.set(notice, timer);
  };

  const scan = (node: Node) => {
    if (node instanceof Element) {
      if (node.matches('.notice')) arm(node);
      node.querySelectorAll('.notice').forEach(arm);
      const parentNotice = node.closest('.notice');
      if (parentNotice) arm(parentNotice);
      return;
    }

    if (node.parentElement) {
      const parentNotice = node.parentElement.closest('.notice');
      if (parentNotice) arm(parentNotice);
    }
  };

  document.querySelectorAll('.notice').forEach(arm);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') scan(mutation.target);
      mutation.addedNodes.forEach(scan);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => observer.disconnect();
}
