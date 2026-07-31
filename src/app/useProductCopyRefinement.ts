import { useEffect } from 'react';

const COPY_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Shared successfully.', 'Invitation shared.'],
  ['Terms frozen. The private invitation is ready to share.', 'Terms fingerprint created. Private invitation ready.'],
  ['The returned terms do not match the frozen contribution.', 'Returned terms do not match the original contribution fingerprint.'],
  ['Freezing locks the obligation, criteria, entitlement, and deadlines into the private invitation.', 'The fingerprint records the obligation, criteria, entitlement, and deadlines included in this invitation.'],
  ['Freeze terms and create invitation', 'Create fingerprint and invitation'],
  ['Terms frozen', 'Terms fingerprinted'],
  ['Terms are frozen', 'Terms fingerprinted'],
  ['The obligation, criteria, entitlement, and deadlines are fingerprinted. The coordinator cannot silently change this invitation after acceptance.', 'PactPay records these terms in a fingerprint and checks the returned contribution against the original invitation.'],
  ['Frozen terms matched', 'Returned terms matched'],
  ['TERMS FROZEN', 'TERMS FINGERPRINTED'],
  ['See one private contribution move from frozen terms to NIM settlement.', 'See one private contribution move from clear terms to NIM settlement.'],
  ['The coordinator freezes the role, obligation, acceptance criteria, deadlines, and entitlement.', 'The coordinator records the role, obligation, criteria, deadlines, and entitlement in one terms fingerprint.'],
  ['The contributor connects through Nimiq Pay, accepts, and submits evidence against the frozen terms.', 'The contributor connects through Nimiq Pay, accepts, and submits evidence against the original terms fingerprint.'],
  ['Open an invitation', 'Open private invitation'],
] as const;

function refineTextNode(node: Text): void {
  const current = node.nodeValue;
  if (!current) return;

  let next = current;
  for (const [from, to] of COPY_REPLACEMENTS) {
    if (next.includes(from)) next = next.replaceAll(from, to);
  }

  if (next !== current) node.nodeValue = next;
}

function refineTree(root: Node): void {
  if (root instanceof Text) {
    refineTextNode(root);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    refineTextNode(node as Text);
    node = walker.nextNode();
  }
}

export function useProductCopyRefinement(): void {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    refineTree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') refineTree(mutation.target);
        mutation.addedNodes.forEach(refineTree);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);
}
