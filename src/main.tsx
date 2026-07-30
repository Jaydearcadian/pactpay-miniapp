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

function providerErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'description']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return 'Nimiq Pay returned an unexpected response.';
}

function loadProjects(): Project[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    return Array.isArray(stored) ? stored as Project[] : [];
  } catch {
    return [];
  }
}

function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeId, setActiveId] = useState<string | null>(projects[0]?.id ?? null);
  const [wallet, setWallet] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => projects.find((p) => p.id === activeId) ?? null, [projects, activeId]);

  const persist = (next: Project[]) => {
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  async function connect() {
    setBusy(true);
    setMessage('');
    try {
      const nimiq = await init();
      const response = await nimiq.listAccounts();
      if (!Array.isArray(response)) throw new Error(providerErrorMessage(response));

      const firstAccount = response[0] ?? '';
      setWallet(firstAccount);
      setMessage(firstAccount ? 'Nimiq Pay connected.' : 'No Nimiq account returned.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Wallet connection failed.');
    } finally {
      setBusy(false);
    }
  }

  function createDemoProject() {
    const project: Project = {
      id: crypto.randomUUID(),
      name: 'Confidential Product Launch',
      deadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      tasks: [
        { id: crypto.randomUUID(), role: 'Designer', description: 'Deliver landing-page design', recipient: '', amountNim: 120, status: 'invited' },
        { id: crypto.randomUUID(), role: 'Copywriter', description: 'Deliver launch copy', recipient: '', amountNim: 80, status: 'invited' },
        { id: crypto.randomUUID(), role: 'Video editor', description: 'Deliver 30-second product video', recipient: '', amountNim: 180, status: 'invited' },
      ],
    };

    persist([project, ...projects]);
    setActiveId(project.id);
    setMessage('Demo project created. Add contributor NIM addresses before paying.');
  }

  async function submitEvidence(taskId: string) {
    const raw = prompt('Paste the private deliverable link or a short evidence note. Only its hash is stored locally.');
    if (!raw || !active) return;

    const hash = await sha256Hex(`${active.id}:${taskId}:${raw}`);
    persist(projects.map((project) => project.id !== active.id
      ? project
      : {
          ...project,
          tasks: project.tasks.map((task) => task.id === taskId
            ? { ...task, evidenceHash: hash, status: 'submitted' as const }
            : task),
        }));
    setMessage(`Evidence committed: ${hash.slice(0, 12)}…`);
  }

  function updateRecipient(taskId: string, recipient: string) {
    if (!active) return;
    persist(projects.map((project) => project.id !== active.id
      ? project
      : {
          ...project,
          tasks: project.tasks.map((task) => task.id === taskId ? { ...task, recipient } : task),
        }));
  }

  async function approveAndPay(task: Task) {
    if (!active || !task.evidenceHash || !task.recipient) {
      setMessage('Add a recipient address and evidence first.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const nimiq = await init();
      const data = `PACTPAY|${active.id.slice(0, 8)}|${task.id.slice(0, 8)}|${task.evidenceHash.slice(0, 16)}`.slice(0, 64);
      const response = await nimiq.sendBasicTransactionWithData({
        recipient: task.recipient,
        value: luna(task.amountNim),
        data,
      });
      if (typeof response !== 'string') throw new Error(providerErrorMessage(response));

      const txHash = response;
      persist(projects.map((project) => project.id !== active.id
        ? project
        : {
            ...project,
            tasks: project.tasks.map((projectTask) => projectTask.id === task.id
              ? { ...projectTask, status: 'paid' as const, txHash }
              : projectTask),
          }));
      setMessage(`Payment sent: ${txHash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment was not completed.');
    } finally {
      setBusy(false);
    }
  }

  return <main>
    <header className="topbar">
      <div><span className="eyebrow">NIMIQ PAY MINI APP</span><h1>PactPay</h1></div>
      <button className="ghost" onClick={connect} disabled={busy}>{wallet ? `${wallet.slice(0, 7)}…` : 'Connect Nimiq'}</button>
    </header>

    <section className="hero">
      <p className="eyebrow">PRIVATE PROJECT SETTLEMENT</p>
      <h2>Approve work.<br />Pay the contributor.</h2>
      <p>Create one private project, verify each deliverable, and settle contributors in NIM.</p>
      <button className="primary" onClick={createDemoProject}>Create demo project</button>
    </section>

    {message && <div className="notice" role="status">{message}</div>}

    <section className="workspace">
      <nav className="projects">
        <h3>Projects</h3>
        {projects.map((project) => <button
          key={project.id}
          className={project.id === activeId ? 'selected' : ''}
          onClick={() => setActiveId(project.id)}
        >
          <strong>{project.name}</strong>
          <small>{project.tasks.filter((task) => task.status === 'paid').length}/{project.tasks.length} settled</small>
        </button>)}
      </nav>

      <div className="panel">{active ? <>
        <div className="panelHead">
          <div><p className="eyebrow">ACTIVE PROJECT</p><h3>{active.name}</h3></div>
          <span className="pill">Private room</span>
        </div>

        <div className="taskList">{active.tasks.map((task) => <article className="task" key={task.id}>
          <div className="taskTop">
            <div><strong>{task.role}</strong><p>{task.description}</p></div>
            <span className={`status ${task.status}`}>{task.status}</span>
          </div>

          <label>
            Contributor NIM address
            <input
              value={task.recipient}
              onChange={(event) => updateRecipient(task.id, event.target.value)}
              placeholder="NQ…"
              disabled={task.status === 'paid'}
            />
          </label>

          <div className="evidence">{task.evidenceHash
            ? `Evidence ${task.evidenceHash.slice(0, 18)}…`
            : 'No evidence submitted'}</div>

          <div className="taskActions">
            <button className="secondary" onClick={() => submitEvidence(task.id)} disabled={task.status === 'paid'}>
              {task.evidenceHash ? 'Replace evidence' : 'Submit evidence'}
            </button>
            <button className="primary compact" onClick={() => approveAndPay(task)} disabled={busy || task.status !== 'submitted'}>
              Approve & pay {task.amountNim} NIM
            </button>
          </div>

          {task.txHash && <small className="tx">Transaction: {task.txHash}</small>}
        </article>)}</div>
      </> : <div className="empty"><h3>No project yet</h3><p>Create the demo project to test the full flow.</p></div>}</div>
    </section>

    <footer>Project terms stay private in the app. NIM payments remain publicly verifiable.</footer>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
