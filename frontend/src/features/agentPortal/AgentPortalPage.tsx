import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DOCUMENT_KEY_LABELS, type DocumentKey, type MyApplication } from '@amp/shared';
import { useAuth } from '../auth/AuthContext.js';
import { api } from '../../lib/api.js';

// Documents the agent must provide (education agent). MARN would be added for dual.
const REQUIRED_KEYS: DocumentKey[] = ['REG', 'ASIC', 'ID', 'PIER'];

export function AgentPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<MyApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<DocumentKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    api.getMyApplication().then(setApp).catch((e: Error) => setError(e.message));
  }, []);

  function signOut() {
    logout().then(() => navigate('/login', { replace: true }));
  }

  // Non-agents don't belong here.
  if (user && user.role !== 'AGENT') return <Navigate to="/" replace />;
  if (error) return <div className="agent-wrap"><p className="error">{error}</p></div>;
  if (!app) return <div className="agent-wrap"><p className="muted">Loading…</p></div>;

  const docFor = (key: DocumentKey) => app.documents.find((d) => d.key === key);
  const uploadedCount = REQUIRED_KEYS.filter((k) => docFor(k)?.hasFile).length;
  const allUploaded = uploadedCount === REQUIRED_KEYS.length;
  const submitted = app.status !== 'DRAFT';

  async function onPick(key: DocumentKey, file: File | undefined) {
    if (!file) return;
    setBusyKey(key);
    setError(null);
    try {
      setApp(await api.uploadMyDocument(key, file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function onRemove(key: DocumentKey) {
    setBusyKey(key);
    try {
      setApp(await api.removeMyDocument(key));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      setApp(await api.submitApplication());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onAcknowledge() {
    setSubmitting(true);
    setError(null);
    try {
      setApp(await api.acknowledgeReceipt());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="agent-wrap">
      <header className="agent-head">
        <div>
          <div className="brand" style={{ marginBottom: 4 }}>
            <span className="brand-mark">A</span>
            <span>Agent Portal</span>
          </div>
          <p className="muted small">Signed in as {user?.name} · {app.business}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={signOut}>Sign out</button>
      </header>

      {submitted ? (
        <div>
          <div className="card">
            <span className="stub-badge">Submitted</span>
            <h2 style={{ margin: '10px 0 4px' }}>Thank you — your application is in review.</h2>
            <p className="muted" style={{ marginBottom: 18 }}>The college is reviewing your documents. You'll be contacted by email with the outcome.</p>
            <button className="btn btn-secondary" onClick={signOut}>← Back to login</button>
          </div>

          {app.ackSent && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Acknowledgement from the college</h3>
              {app.ackReplied ? (
                <div className="banner banner--ok">✓ You've confirmed receipt — thank you. The college will continue your review.</div>
              ) : (
                <>
                  <p className="muted">The college has sent you an acknowledgement &amp; information-collection request. Please confirm you've received it so your reference checks can proceed.</p>
                  {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
                  <button className="btn btn-primary" disabled={submitting} onClick={onAcknowledge}>
                    {submitting ? 'Confirming…' : 'Confirm receipt & respond'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Submit your documents</h2>
          <p className="muted">Upload each document (PNG, JPG or PDF), then submit your application.</p>

          <div className="agent-doclist">
            {REQUIRED_KEYS.map((key) => {
              const doc = docFor(key);
              const busy = busyKey === key;
              return (
                <div key={key} className="agent-docrow">
                  <div className="agent-docmeta">
                    <strong>{DOCUMENT_KEY_LABELS[key]}</strong>
                    {doc?.hasFile
                      ? <span className="doc-file doc-file--ok"><span className="doc-file-tick">✓</span><span className="doc-file-name">{doc.fileName}</span></span>
                      : <span className="muted small">Not uploaded</span>}
                  </div>
                  <div className="agent-docactions">
                    <input
                      ref={(el) => { inputs.current[key] = el; }}
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => onPick(key, e.target.files?.[0])}
                    />
                    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => inputs.current[key]?.click()}>
                      {busy ? 'Uploading…' : doc?.hasFile ? 'Replace' : 'Upload'}
                    </button>
                    {doc?.hasFile && (
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onRemove(key)}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

          <div className="agent-submit">
            <span className="muted small">{uploadedCount} of {REQUIRED_KEYS.length} uploaded</span>
            <button className="btn btn-primary" disabled={!allUploaded || submitting} onClick={onSubmit}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
          {!allUploaded && <p className="muted small" style={{ marginTop: 8 }}>Upload all documents to enable submit.</p>}
        </div>
      )}
    </div>
  );
}
