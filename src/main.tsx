import { useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { ResponseApp } from './app/ResponseApp';
import './styles.css';

function RootRouter() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash.startsWith('#/response/') ? <ResponseApp /> : <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter /></React.StrictMode>,
);
