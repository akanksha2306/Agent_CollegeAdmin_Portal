import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AGENT_STATUS_LABELS,
  DOCUMENT_KEY_LABELS,
  gateNote,
  stageGateMet,
  type Agent,
  type AgentDocument,
  type AuditEventDTO,
  type DocumentKey,
  type ProvisioningInfo,
} from '@amp/shared';

const AUDIT_LABEL: Record<string, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REQUEST_INFO: 'Requested more information',
  AGREEMENT_SIGNED: 'Written agreement signed',
  ACCOUNT_CREATED: 'Portal account created',
};
import { Modal } from '../../components/Modal.js';
import { api } from '../../lib/api.js';

const STAGES = ['Business Registration', 'Certification', 'References', 'Final Review'];

const REG_KEYS: DocumentKey[] = ['REG', 'ASIC', 'ID'];

function statusSub(d: AgentDocument): string {
  if (d.status === 'VERIFIED') return 'Uploaded · matched';
  if (d.status === 'PENDING') return `${d.fileName ?? 'Uploaded'} · needs verification`;
  return 'Not provided';
}

/** Client-side "official record" shown in the View dialog (mirrors the prototype). */
function documentRecord(agent: Agent, key: DocumentKey): { title: string; rows: [string, string][] } {
  const dash = '—';
  switch (key) {
    case 'REG':
      return {
        title: 'Certificate of Registration',
        rows: [
          ['Company name', `${agent.business.toUpperCase()} PTY LTD`],
          ['ACN', agent.acn ?? dash],
          ['Company type', 'Australian proprietary company, limited by shares'],
          ['Status', 'Registered'],
        ],
      };
    case 'ASIC':
      return {
        title: 'Current Company Extract',
        rows: [
          ['ABN', agent.abn ?? dash],
          ['ACN', agent.acn ?? dash],
          ['Registered office', `${agent.city}, ${agent.country}`],
          ['Officeholder / Director', agent.contactName],
          ['Company status', 'Active — good standing'],
        ],
      };
    case 'ID':
      return {
        title: 'Identity Verification',
        rows: [
          ['Full name', agent.contactName],
          ['Document type', 'Passport'],
          ['Nationality', agent.country],
          ['Role', 'Director / authorised contact'],
        ],
      };
    case 'PIER':
      return {
        title: 'QEAC / PIER Certificate',
        rows: [
          ['Certified counsellor', agent.contactName],
          ['Status', 'Current'],
          ['Expiry', agent.certExpiry ?? '01 Mar 2027'],
        ],
      };
    case 'MARN':
      return {
        title: 'MARN Registration',
        rows: [
          ['Registered migration agent', agent.contactName],
          ['MARN', agent.marn ?? dash],
          ['Status', 'Registered'],
        ],
      };
    default:
      return { title: DOCUMENT_KEY_LABELS[key], rows: [] };
  }
}

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewKey, setViewKey] = useState<DocumentKey | null>(null);
  const [uploadKey, setUploadKey] = useState<DocumentKey | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [decision, setDecision] = useState<'request' | 'reject' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [provisioning, setProvisioning] = useState<ProvisioningInfo | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEventDTO[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getAgent(id).then(setAgent).catch((e: Error) => setError(e.message));
  }, [id]);

  // Refresh the audit trail whenever the agent's meaningful state changes.
  useEffect(() => {
    if (!id) return;
    api.getAudit(id).then(setAudit).catch(() => setAudit([]));
  }, [id, agent?.status, agent?.stage, agent?.agreementSigned, agent?.ackSent, agent?.ackReplied]);

  if (error) return <p className="error">{error}</p>;
  if (!agent) return <p className="muted">Loading…</p>;

  const docByKey = (key: DocumentKey) => agent.documents?.find((d) => d.key === key);
  const dv = (key: DocumentKey) => docByKey(key)?.status === 'VERIFIED';
  const dual = agent.type === 'DUAL';
  const gateMet = stageGateMet(agent);
  // The staged review only applies while the application is still under review.
  const inReview = ['NEW_REQUEST', 'IN_REVIEW', 'PENDING_DOCUMENTS'].includes(agent.status);

  /** Run an API call that returns the updated agent, with busy + error handling. */
  async function run(fn: () => Promise<Agent>) {
    setBusy(true);
    try {
      setAgent(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmUpload() {
    if (!id || !uploadKey || !uploadName.trim()) return;
    const key = uploadKey;
    const name = uploadName.trim();
    await run(() => api.uploadDocument(id, key, name));
    setUploadKey(null);
    setUploadName('');
  }

  async function doDecision() {
    if (!id || !decision) return;
    setBusy(true);
    try {
      if (decision === 'request') {
        const updated = await api.requestInfo(id, decisionNote.trim() || undefined);
        setAgent(updated);
        setDecision(null);
        setInfoMsg(`Information request emailed to ${updated.email}`);
        window.setTimeout(() => setInfoMsg(null), 6000);
      } else {
        await api.reject(id, decisionNote.trim() || undefined);
        navigate('/applications', { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!id) return;
    setBusy(true);
    try {
      setAgent(await api.approve(id)); // → Approved; activation panel takes over
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function provision() {
    if (!id) return;
    setBusy(true);
    try {
      const result = await api.provisionAccount(id);
      setAgent(result.agent);
      setProvisioning(result.provisioning);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const record = viewKey ? documentRecord(agent, viewKey) : null;

  // Reusable document row (Stage 1 & 2).
  const docRow = (key: DocumentKey) => {
    const doc = docByKey(key);
    if (!doc) return null;
    return (
      <div key={key} className={`doc-row doc-row--${doc.status.toLowerCase()}`}>
        <span className="doc-icon">📄</span>
        <div className="doc-meta">
          <strong>{DOCUMENT_KEY_LABELS[key]}</strong>
          <span className="muted small">{statusSub(doc)}</span>
        </div>
        <div className="doc-actions">
          {doc.status !== 'MISSING' && (
            <button className="btn btn-ghost" onClick={() => setViewKey(key)}>View</button>
          )}
          {doc.status === 'PENDING' && (
            <button className="btn btn-secondary" disabled={busy} onClick={() => id && run(() => api.verifyDocument(id, key))}>
              Verify
            </button>
          )}
          {doc.status === 'VERIFIED' && <span className="pill pill--ok">Verified</span>}
          {doc.status === 'MISSING' && (
            <button className="btn btn-secondary" onClick={() => { setUploadKey(key); setUploadName(''); }}>
              Upload
            </button>
          )}
        </div>
      </div>
    );
  };

  // Stage 4 compliance checklist.
  const realRefs = (agent.references ?? []).filter((r) => r.refereeName !== '—');
  const refsPassed = realRefs.length > 0 && realRefs.every((r) => r.outcome === 'PASSED');
  const checklist: { label: string; met: boolean }[] = [
    { label: 'Legal entity & identity verified', met: dv('REG') && dv('ID') },
    { label: 'Business registration (ASIC)', met: dv('REG') && dv('ASIC') },
    { label: 'QEAC / PIER certification', met: dv('PIER') },
    { label: 'MARN (dual agents only)', met: !dual || dv('MARN') },
    { label: 'Reference checks completed', met: refsPassed },
  ];

  return (
    <div>
      <Link to="/applications" className="back">← Back to applications</Link>

      <header className="review-head">
        <div className="review-avatar">{agent.business.charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <div className="review-title">
            <h1>{agent.business}</h1>
            <span className="pill">{AGENT_STATUS_LABELS[agent.status]}</span>
            {dual && <span className="pill pill--line">Dual agent · COI required</span>}
          </div>
          <p className="muted">{agent.appId} · {agent.city}, {agent.country} · {agent.contactName}</p>
        </div>
        <div className="review-decisions">
          <button className="btn btn-secondary" disabled={busy} onClick={() => { setDecision('request'); setDecisionNote(''); }}>Request info</button>
          <button className="btn btn-secondary btn-danger" disabled={busy} onClick={() => { setDecision('reject'); setDecisionNote(''); }}>Reject</button>
        </div>
      </header>

      {infoMsg && <div className="banner banner--ok">✓ {infoMsg}</div>}

      <div className="stepper">
        {STAGES.map((label, idx) => (
          <div
            key={label}
            className={`step${idx + 1 === agent.stage ? ' step--active' : ''}${idx + 1 < agent.stage ? ' step--done' : ''}`}
          >
            <span className="step-n">{idx + 1 < agent.stage ? '✓' : idx + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── STAGE 1 · Business Registration ── */}
      {inReview && agent.stage === 1 && (
        <div className="review-grid">
          <section className="card">
            <h3>Business &amp; contact</h3>
            <dl className="field-grid">
              <dt>Business name</dt><dd>{agent.business}</dd>
              <dt>ABN</dt><dd>{agent.abn ?? '—'}</dd>
              <dt>ACN</dt><dd>{agent.acn ?? '—'}</dd>
              <dt>Contact person</dt><dd>{agent.contactName}</dd>
              <dt>Email</dt><dd>{agent.email}</dd>
              <dt>Phone</dt><dd>{agent.phone}</dd>
              <dt>Agent type</dt><dd>{dual ? 'Dual (Migration)' : 'Education'}</dd>
              <dt>MARN</dt><dd>{dual ? (agent.marn ?? '—') : 'Not applicable'}</dd>
            </dl>
            <div className="channel">
              <span className="kicker">Recruitment channel</span>
              <div className="toggle">
                <button className={`toggle-opt${agent.onshore ? ' toggle-opt--active' : ''}`} onClick={() => id && agent.onshore !== true && run(() => api.updateAgent(id, { onshore: true }))}>Onshore</button>
                <button className={`toggle-opt${!agent.onshore ? ' toggle-opt--active' : ''}`} onClick={() => id && agent.onshore !== false && run(() => api.updateAgent(id, { onshore: false }))}>Offshore</button>
              </div>
              <p className="muted small">
                {agent.onshore
                  ? 'Recruits students already in Australia — verify education-agent registration and ABN/ACN with ASIC.'
                  : 'Recruits students overseas — verify overseas business registration alongside the ABN/ACN.'}
              </p>
            </div>
          </section>
          <section className="card">
            <h3>Registration documents</h3>
            <p className="muted small">Verify each item to confirm the legal entity.</p>
            <div className="doc-list">{REG_KEYS.map(docRow)}</div>
          </section>
        </div>
      )}

      {/* ── STAGE 2 · Certification ── */}
      {inReview && agent.stage === 2 && (
        <div className="review-grid">
          <section className="card">
            <h3>Certification documents</h3>
            <p className="muted small">QEAC / PIER{dual ? ', and MARN for this dual agent.' : '.'}</p>
            <div className="doc-list">
              {docRow('PIER')}
              {dual && docRow('MARN')}
            </div>
          </section>
          <section className="card">
            <h3>Certification register</h3>
            <div className="register">
              <div className="register-row"><span className="muted">QEAC / PIER agent</span><span className={`pill${dv('PIER') ? ' pill--ok' : ''}`}>{dv('PIER') ? 'Verified' : 'Pending'}</span></div>
              <div className="register-row"><span className="muted">ICEF / ICF membership</span><span className="pill pill--ok">Current</span></div>
              <div className="register-row"><span className="muted">MARN (migration advice)</span><span>{dual ? (agent.marn ?? '—') : 'Not applicable'}</span></div>
            </div>
          </section>
        </div>
      )}

      {/* ── STAGE 3 · References + acknowledgement loop ── */}
      {inReview && agent.stage === 3 && (
        <div className="review-stack">
          <section className="card">
            <h3>Acknowledgement &amp; information collection</h3>
            {!agent.ackSent && (
              <>
                <p className="muted">Send the acknowledgement email to {agent.contactName} to formally begin reference verification. References can only be approved once the agent has replied.</p>
                <button className="btn btn-primary" disabled={busy} onClick={() => id && run(() => api.sendAck(id))}>Send acknowledgement email</button>
              </>
            )}
            {agent.ackSent && !agent.ackReplied && (
              <>
                <div className="banner banner--wait">⏳ Acknowledgement email sent to {agent.email} · awaiting reply</div>
                <button className="btn btn-secondary" disabled={busy} onClick={() => id && run(() => api.markAckReplied(id))}>Mark reply received</button>
              </>
            )}
            {agent.ackReplied && (
              <div className="banner banner--ok">✓ Acknowledgement reply received — you can now approve references.</div>
            )}
          </section>
          <section className="card">
            <h3>Reference checks</h3>
            <table className="table">
              <thead><tr><th>Referee</th><th>CRICOS provider</th><th>Outcome</th><th></th></tr></thead>
              <tbody>
                {(agent.references ?? []).map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.refereeName}</strong></td>
                    <td className="muted">{r.cricosProvider}</td>
                    <td><span className={`pill${r.outcome === 'PASSED' ? ' pill--ok' : ''}`}>{r.outcome === 'PASSED' ? 'Passed' : 'Pending'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {agent.ackReplied && r.outcome !== 'PASSED' && r.refereeName !== '—' && (
                        <button className="btn btn-ghost" disabled={busy} onClick={() => id && run(() => api.approveReference(id, r.id))}>Approve reference</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── STAGE 4 · Final Review ── */}
      {inReview && agent.stage === 4 && (
        <div className="review-grid">
          <section className="card">
            <h3>Compliance checklist</h3>
            <div className="register">
              {checklist.map((c) => (
                <div key={c.label} className="register-row">
                  <span className="check">
                    <span className={`check-badge${c.met ? ' check-badge--ok' : ''}`}>{c.met ? '✓' : '○'}</span>
                    {c.label}
                  </span>
                  <span className={`pill${c.met ? ' pill--ok' : ''}`}>{c.met ? 'Met' : 'Pending'}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>Final internal review</h3>
            <p className="muted">All prior stages are complete. Confirm the compliance checklist, then approve to send the approval email and provision {agent.business}'s portal access.</p>
          </section>
        </div>
      )}

      {/* ── Stage footer (only while under review) ── */}
      {inReview && (
        <div className="stage-footer">
          <div>{agent.stage > 1 && <button className="btn btn-ghost" disabled={busy} onClick={() => id && run(() => api.backStage(id))}>Back</button>}</div>
          <div className="stage-footer-right">
            {!gateMet && <span className="muted small gate-note">{gateNote(agent)}</span>}
            {agent.stage < 4 ? (
              <button className="btn btn-primary" disabled={busy || !gateMet} onClick={() => id && run(() => api.advanceStage(id))}>Continue</button>
            ) : (
              <button className="btn btn-primary" disabled={busy || !gateMet} onClick={approve}>Approve agent</button>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVATION STATE (post-approval, PRD §09) ── */}
      {agent.status === 'APPROVED' && (
        <div className="review-stack">
          <section className="card">
            <h3>Activation</h3>
            <p className="muted small">Approved. Complete the written agreement, then create the agent's portal account.</p>
            <div className="register">
              <div className="register-row">
                <span className="check">
                  <span className={`check-badge${agent.agreementSigned ? ' check-badge--ok' : ''}`}>{agent.agreementSigned ? '✓' : '1'}</span>
                  Written agreement (ESOS) signed &amp; accepted
                </span>
                {agent.agreementSigned
                  ? <span className="pill pill--ok">Signed</span>
                  : <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => id && run(() => api.markAgreementSigned(id))}>Mark agreement signed</button>}
              </div>
              <div className="register-row">
                <span className="check">
                  <span className="check-badge">2</span>
                  Create portal account &amp; send login
                </span>
                <button className="btn btn-primary btn-sm" disabled={busy || !agent.agreementSigned} onClick={provision}>
                  Create account &amp; send login
                </button>
              </div>
            </div>
            {!agent.agreementSigned && <p className="muted small" style={{ marginTop: 10 }}>The account can be created once the signed agreement is received.</p>}
          </section>
        </div>
      )}

      {/* ── ACTIVE (onboarded) ── */}
      {agent.status === 'ACTIVE' && (
        <div className="banner banner--ok">✓ Agent is active — portal account created and login access sent.</div>
      )}

      {/* ── Closed states ── */}
      {(agent.status === 'REJECTED' || agent.status === 'TERMINATED') && (
        <div className="banner banner--wait">This application is {AGENT_STATUS_LABELS[agent.status].toLowerCase()}. No further review actions.</div>
      )}

      {/* ── Activity / audit log (PRD §13) ── */}
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Activity log</h3>
        {audit.length === 0 ? (
          <p className="muted small">No activity recorded yet.</p>
        ) : (
          <ul className="audit-list">
            {audit.map((e) => (
              <li key={e.id} className="audit-item">
                <span className="audit-dot" />
                <div>
                  <div className="audit-action">{AUDIT_LABEL[e.action] ?? e.action}</div>
                  <div className="muted small">
                    {e.actorName ?? 'System'} · {new Date(e.createdAt).toLocaleString()}
                    {e.recipient ? ` · to ${e.recipient}` : ''}
                  </div>
                  {e.reason && <div className="audit-reason">“{e.reason}”</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* View dialog */}
      {viewKey && record && (
        <Modal title={record.title} subtitle="Official record" onClose={() => setViewKey(null)}>
          <table className="record">
            <tbody>
              {record.rows.map(([k, v]) => (
                <tr key={k}><td className="muted">{k}</td><td><strong>{v}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Upload dialog */}
      {uploadKey && (
        <Modal
          title={`Upload ${DOCUMENT_KEY_LABELS[uploadKey]}`}
          subtitle="Agents email their documents; upload the file here so it can be viewed and verified."
          onClose={() => setUploadKey(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setUploadKey(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!uploadName.trim() || busy} onClick={confirmUpload}>Upload document</button>
            </>
          }
        >
          <label className="field">
            <span>File name</span>
            <input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g. registration-certificate.pdf" />
          </label>
          <div className="sample-hint muted small">Samples: registration-certificate.pdf · asic-company-extract.pdf · passport-scan.jpg</div>
        </Modal>
      )}

      {/* Decision dialog */}
      {decision && (
        <Modal
          title={decision === 'request' ? 'Request more information' : 'Reject application'}
          subtitle={decision === 'request' ? 'Status changes to Pending Documents and the agent is emailed the requested items.' : 'The agent receives a rejection email with your reason.'}
          onClose={() => setDecision(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDecision(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={doDecision}>
                {decision === 'request' ? 'Send request' : 'Send rejection'}
              </button>
            </>
          }
        >
          <div className="mail-to">
            <span className="muted">To</span>
            <strong>{agent.email}</strong>
            <span className="muted small">· from Business &amp; contact</span>
          </div>
          <label className="field">
            <span>{decision === 'request' ? 'Message to agent' : 'Reason for rejection'}</span>
            <textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={3}
              placeholder={decision === 'request' ? 'Please re-upload a clear ASIC extract.' : 'e.g. QEAC certification could not be verified.'} />
          </label>
        </Modal>
      )}

      {/* Provisioning dialog (post-approval, mock) */}
      {provisioning && (
        <Modal
          title="Agent approved · portal access provisioned"
          subtitle="Credentials generated. (Mock — real delivery via email/SMS/WhatsApp is Phase 2.)"
          onClose={() => setProvisioning(null)}
          footer={<button className="btn btn-primary" onClick={() => setProvisioning(null)}>Done</button>}
        >
          <dl className="field-grid">
            <dt>Portal username</dt><dd className="mono">{provisioning.username}</dd>
            <dt>Temp password</dt><dd className="mono">{provisioning.tempPassword}</dd>
          </dl>
          <div className="banner banner--ok" style={{ marginTop: 12 }}>✓ Approval email sent · agent must reset password on first sign-in.</div>
        </Modal>
      )}
    </div>
  );
}
