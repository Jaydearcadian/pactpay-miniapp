import { useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { ResponseApp } from './app/ResponseApp';
import { useOutcomeFormFocus } from './app/useOutcomeFormFocus';
import { WalletLauncher, WalletPage } from './app/WalletPage';
import { installShareFallback } from './lib/shareFallback';
import './styles.css';

installShareFallback();

function RootRouter() {
  const [hash, setHash] = useState(window.location.hash);
  useOutcomeFormFocus();

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash.startsWith('#/response/')) return <ResponseApp />;
  if (hash === '#/wallet') return <WalletPage />;

  return <><App /><WalletLauncher /></>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter /></React.StrictMode>,
);
