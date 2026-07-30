import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@nimiq/mini-app-sdk';
import './styles.css';

type Task = {
  id: string;
  role: string;
  description: string;
  recipient: string;
  amountNim: number;
  evidenceHash?: string;
  status: 'invited' | 'submitted' | 'paid';
  txHash?: string;
};

type Project = { id: string; name: string; deadline: string; tasks: Task[] };

const STORAGE_KEY = 'pactpay-projects-v1';
const luna = (nim: number) => Math.round(nim * 100_000);

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeId, setActiveId] = useState<string | null>(projects[0]?.id ?? null);
  const [wallet, setWallet] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => projects.find((p) => p.id === activeId) ?? null, [projects, activeId]);

  const persist = (next: Project[]) => { setProjects(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };

  async function connect() {
    setBusy(true); setMessage('');
    try {
      const nimiq = await init();
      const accounts = await nimiq.listAccounts();
      setWallet(accounts[0] || '');
      setMessage(accounts[0] ? 'Nimiq Pay connected.' : 'No Nimiq account returned.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Wallet connection failed.'); }
    finally { setBusy(false); }
  }

  async function createDemoProject() {
    const project: Project = {
      id: crypto.randomUUID(),
      name: 'Confidential Product Launch',
      deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      tasks: [
        { id: crypto.randomUUID(), role: 'Designer', description: 'Deliver landing-page design', recipient: '', amountNim: 120, status: 'invited' },
        { id: crypto.randomUUID(), role: 'Copywriter', description: 'Deliver launch copy', recipient: '', amountNim: 80, status: 'invited' },
        { id: crypto.randomUUID(), role: 'Video editor', description: 'Deliver 30-second product video', recipient: '', amountNim: 180, status: 'invited' }
      ]
    };
    persist([project, ...projects]); setActiveId(project.id); setMessage('Demo project created. Add contributor NIM addresses before paying.');
  }

  async function submitEvidence(taskId: string) {
    const raw = prompt('Paste the private deliverable link or a short evidence note. Only its hash is stored locally.');
    if (!raw || !active) return;
    const hash = await sha256Hex(`${active.id}:${taskId}:${raw}`);
    persist(projects.map((p) => p.id !== active.id ? p : ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, evidenceHash: hash, status: 'submitted' } : t) })));
    setMessage(`Evidence committed: ${hash.slice(0, 12)}…`);
  }

  function updateRecipient(taskId: string, recipient: string) {
    if (!active) return;
    persist(projects.map((p) => p.id !== active.id ? p : ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, recipient } : t) })));
  }

  async function approveAndPay(task: Task) {
    if (!active || !task.evidenceHash || !task.recipient) { setMessage('Add a recipient address and evidence first.'); return; }
    setBusy(true); setMessage('');
    try {
      const nimiq = await init();
      const data = `PACTPAY|${active.id.slice(0, 8)}|${task.id.slice(0, 8)}|${task.evidenceHash.slice(0, 16)}`.slice(0, 64);
      const txHash = await nimiq.sendBasicTransactionWithData({ recipient: task.recipient, value: luna(task.amountNim), data });
      persist(projects.map((p) => p.id !== active.id ? p : ({ ...p, tasks: p.tasks.map((t) => t.id === task.id ? { ...t, status: 'paid', txHash } : t) })));
      setMessage(`Payment sent: ${txHash}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Payment was not completed.'); }
    finally { setBusy(false); }
  }

  return <main>
    <header className="topbar"><div><span className="eyebrow">NIMIQ PAY MINI APP</span><h1>PactPay</h1></div><button className="ghost" onClick={connect} disabled={busy}>{wallet ? `${wallet.slice(0, 7)}…` : 'Connect Nimiq'}</button></header>
    <section className="hero"><p className="eyebrow">PRIVATE PROJECT SETTLEMENT</p><h2>Approve work.<br/>Pay the contributor.</h2><p>Create one private project, verify each deliverable, and settle contributors in NIM.</p><button className="primary" onClick={createDemoProject}>Create demo project</button></section>
    {message && <div className="notice">{message}</div>}
    <section className="workspace">
      <nav className="projects"><h3>Projects</h3>{projects.map((p) => <button key={p.id} className={p.id===activeId?'selected':''} onClick={()=>setActiveId(p.id)}><strong>{p.name}</strong><small>{p.tasks.filter(t=>t.status==='paid').length}/{p.tasks.length} settled</small></button>)}</nav>
      <div className="panel">{active ? <><div className="panelHead"><div><p className="eyebrow">ACTIVE PROJECT</p><h3>{active.name}</h3></div><span className="pill">Private room</span></div>
      <div className="taskList">{active.tasks.map((task) => <article className="task" key={task.id}><div className="taskTop"><div><strong>{task.role}</strong><p>{task.description}</p></div><span className={`status ${task.status}`}>{task.status}</span></div><label>Contributor NIM address<input value={task.recipient} onChange={(e)=>updateRecipient(task.id,e.target.value)} placeholder="NQ…"/></label><div className="evidence">{task.evidenceHash ? `Evidence ${task.evidenceHash.slice(0,18)}…` : 'No evidence submitted'}</div><div className="taskActions"><button className="secondary" onClick={()=>submitEvidence(task.id)} disabled={task.status==='paid'}>{task.evidenceHash?'Replace evidence':'Submit evidence'}</button><button className="primary compact" onClick={()=>approveAndPay(task)} disabled={busy || task.status!=='submitted'}>Approve & pay {task.amountNim} NIM</button></div>{task.txHash && <small className="tx">Transaction: {task.txHash}</small>}</article>)}</div></> : <div className="empty"><h3>No project yet</h3><p>Create the demo project to test the full flow.</p></div>}</div>
    </section>
    <footer>Project terms stay private in the app. NIM payments remain publicly verifiable.</footer>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
