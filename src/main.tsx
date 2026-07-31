import { useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { DemoPage } from './app/DemoPage';
import { InvitationEntryPage } from './app/InvitationEntryPage';
import { LandingPage } from './app/LandingPage';
import { ResponseApp } from './app/ResponseApp';
import { useInvitationEntry } from './app/useInvitationEntry';
import { useOutcomeFormFocus } from './app/useOutcomeFormFocus';
import { useProductCopyRefinement } from './app/useProductCopyRefinement';
import { WalletLauncher, WalletPage } from './app/WalletPage';
import { installNoticeAutoDismiss } from './lib/noticeAutoDismiss';
import { installShareFallback } from './lib/shareFallback';
import './styles.css';
import './landing.css';
import './demo.css';
import './feedback.css';
import './handoff.css';
import './mobile-fixes.css';

installShareFallback();

function RootRouter() {
  const [hash, setHash] = useState(window.location.hash);
  useOutcomeFormFocus();
  useInvitationEntry();
  useProductCopyRefinement();

  useEffect(() => installNoticeAutoDismiss(), []);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash.startsWith('#/response/')) return <ResponseApp />;
  if (hash === '#/wallet') return <WalletPage />;
  if (hash === '#/demo') return <DemoPage />;
  if (hash === '#/open-invitation') return <InvitationEntryPage />;
  if (hash === '#/app') return <><App /><WalletLauncher /></>;
  if (hash.startsWith('#/invite/') || hash.startsWith('#/receipt/')) return <App />;

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter /></React.StrictMode>,
);
