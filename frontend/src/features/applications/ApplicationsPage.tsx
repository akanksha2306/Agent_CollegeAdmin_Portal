import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AGENT_STATUS,
  AGENT_STATUS_LABELS,
  DOCUMENT_KEY_LABELS,
  type Agent,
  type AgentStatus,
  type DocumentKey,
} from '@amp/shared';
import { Modal } from '../../components/Modal.js';
import { api } from '../../lib/api.js';

type Filter = 'ALL' | AgentStatus;

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');

  // Row click opens the review — but ignore clicks that land on an interactive
  // element (Upload button, remove ×, business-name link) so they behave normally.
  function onRowClick(e: MouseEvent<HTMLTableRowElement>, agentId: string) {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    navigate(`/applications/${agentId}`);
  }

  // Upload modal state
  const [uploadAgent, setUploadAgent] = useState<Agent | null>(null);
  const [docKey, setDocKey] = useState<DocumentKey | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .listAgents()
      .then(setAgents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading applications…</p>;
  if (error) return <p className="error">Could not load applications: {error}</p>;

  function openUpload(agent: Agent) {
    setUploadAgent(agent);
    setDocKey(agent.documents?.[0]?.key ?? '');
    setFile(null);
    setUploadError(null);
  }

  function docSummary(agent: Agent) {
    const docs = agent.documents ?? [];
    const verified = docs.filter((d) => d.status === 'VERIFIED').length;
    const uploaded = docs.filter((d) => d.status !== 'MISSING').length;
    return { verified, uploaded, total: docs.length };
  }

  async function removeDoc(agent: Agent, key: DocumentKey) {
    try {
      const updated = await api.removeDocumentFile(agent.id, key);
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function confirmUpload() {
    if (!uploadAgent || !docKey || !file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const updated = await api.uploadDocumentFile(uploadAgent.id, docKey, file);
      // Replace the row in-place with the fresh agent (includes new doc status).
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setUploadAgent(null);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filters: Filter[] = ['ALL', ...AGENT_STATUS];
  const countFor = (f: Filter) => (f === 'ALL' ? agents.length : agents.filter((a) => a.status === f).length);
  const visibleAgents = filter === 'ALL' ? agents : agents.filter((a) => a.status === filter);

  return (
    <div>
      <header className="page-head">
        <h1>Agent Applications</h1>
        <p className="muted">Review, verify and process incoming agents</p>
      </header>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-chip${filter === f ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : AGENT_STATUS_LABELS[f]}
            <span className="filter-count">{countFor(f)}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>App ID</th>
              <th>Business / Contact</th>
              <th>Country</th>
              <th>Type</th>
              <th>Status</th>
              <th>Documents</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleAgents.map((a) => {
              const s = docSummary(a);
              return (
                <tr key={a.id} className="amp-row" onClick={(e) => onRowClick(e, a.id)}>
                  <td className="mono">{a.appId}</td>
                  <td>
                    <Link to={`/applications/${a.id}`}>{a.business}</Link>
                    <div className="muted small">{a.contactName} · {a.email}</div>
                  </td>
                  <td>{a.country}</td>
                  <td>{a.type === 'DUAL' ? 'Dual (Migration)' : 'Education'}</td>
                  <td><span className="pill">{AGENT_STATUS_LABELS[a.status]}</span></td>
                  <td>
                    <div className="doc-cell">
                      <div className="doc-files">
                        {(a.documents ?? [])
                          .filter((d) => d.status !== 'MISSING')
                          .map((d) => (
                            <span
                              key={d.key}
                              className={`doc-file${d.status === 'VERIFIED' ? ' doc-file--ok' : ''}`}
                              title={`${DOCUMENT_KEY_LABELS[d.key]} — ${d.fileName ?? 'uploaded'}${d.status === 'VERIFIED' ? ' (verified)' : ' (awaiting verification)'}`}
                            >
                              <span className="doc-file-tick">✓</span>
                              <span className="doc-file-name">{d.fileName ?? DOCUMENT_KEY_LABELS[d.key]}</span>
                              <button
                                className="doc-file-remove"
                                title={`Remove ${DOCUMENT_KEY_LABELS[d.key]}`}
                                aria-label={`Remove ${DOCUMENT_KEY_LABELS[d.key]}`}
                                onClick={() => removeDoc(a, d.key)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        {s.uploaded === 0 && <span className="muted small">No documents yet</span>}
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => openUpload(a)}>
                        Upload
                      </button>
                    </div>
                  </td>
                  <td className="col-action">
                    <Link to={`/applications/${a.id}`} className="btn btn-primary btn-sm">Review →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleAgents.length === 0 && <p className="muted center">No applications in this view.</p>}
      </div>

      {uploadAgent && (
        <Modal
          title={`Upload document — ${uploadAgent.business}`}
          subtitle="Agents email their documents; attach the file to the right document type here."
          onClose={() => setUploadAgent(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setUploadAgent(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!docKey || !file || busy} onClick={confirmUpload}>
                {busy ? 'Uploading…' : 'Upload document'}
              </button>
            </>
          }
        >
          <label className="field">
            <span>Document type</span>
            <select value={docKey} onChange={(e) => setDocKey(e.target.value as DocumentKey)}>
              {(uploadAgent.documents ?? []).map((d) => (
                <option key={d.key} value={d.key}>
                  {DOCUMENT_KEY_LABELS[d.key]}
                  {d.status === 'VERIFIED' ? ' · verified' : d.status === 'PENDING' ? ' · uploaded' : ' · missing'}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>File</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="sample-hint muted small">PDF, JPG or PNG · up to 10 MB</div>

          {uploadError && <div className="form-error" style={{ marginTop: 12 }}>{uploadError}</div>}
        </Modal>
      )}
    </div>
  );
}
