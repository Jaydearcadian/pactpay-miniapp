import { useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { DemoPage } from './app/DemoPage';
import { InvitationDialog } from './app/InvitationDialog';
import { InvitationEntryPage } from './app/InvitationEntryPage';
import { LandingPage } from './app/LandingPage';
import { ResponseApp } from './app/ResponseApp';
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
import './invitation-dialog.css';
import './mobile-fixes.css';

installShareFallback();

function RootRouter() {
  const [hash, setHash] = useState(window.location.hash);
  useOutcomeFormFocus();
  useProductCopyRefinement();

  useEffect(() => installNoticeAutoDismiss(), []);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  let page: React.ReactNode;
  if (hash.startsWith('#/response/')) page = <ResponseApp />;
  else if (hash === '#/wallet') page = <WalletPage />;
  else if (hash === '#/demo') page = <DemoPage />;
  else if (hash === '#/open-invitation') page = <InvitationEntryPage />;
  else if (hash === '#/app') page = <><App /><WalletLauncher /></>;
  else if (hash.startsWith('#/invite/') || hash.startsWith('#/receipt/')) page = <App />;
  else page = <LandingPage />;

  return <>{page}<InvitationDialog /></>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter /></React.StrictMode>,
);
