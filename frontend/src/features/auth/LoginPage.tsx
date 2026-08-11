import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';

type Portal = 'admin' | 'agent';

const DEMO: Record<Portal, { username: string; password: string }> = {
  admin: { username: 'robin.admin', password: 'AgentPortal26' },
  agent: { username: 'arunima', password: 'AgentPortal26' },
};

export function LoginPage() {
  const { user, loading, login, ssoLogin } = useAuth();
  const navigate = useNavigate();

  const [portal, setPortal] = useState<Portal | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the login screen (agents go to their portal).
  if (!loading && user) return <Navigate to={user.role === 'AGENT' ? '/agent' : '/'} replace />;

  const landing = (u: { role: string }) => (u.role === 'AGENT' ? '/agent' : '/');

  function choose(p: Portal) {
    setPortal(p);
    setError(null);
    // Prefill the demo credentials for the chosen portal (one-click demo).
    setUsername(DEMO[p].username);
    setPassword(DEMO[p].password);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(username, password);
      navigate(landing(u), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSso() {
    setError(null);
    setSubmitting(true);
    try {
      const u = await ssoLogin();
      navigate(landing(u), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-hero">
        <div className="login-hero-logo">
          <span className="brand-mark">A</span>
          <span>Australian College</span>
        </div>
        <div>
          <h1>Agent Management Portal</h1>
          <p>Review, verify and onboard your education agents in one compliant place.</p>
        </div>
        <div className="login-tags">
          <span>ESOS Act</span>
          <span>National Code 2018</span>
          <span>PRISMS · ASQAnet</span>
        </div>
      </aside>

      <div className="login-panel">
        {portal === null ? (
          /* ── Portal chooser ── */
          <div className="login-form">
            <p className="kicker">Choose your portal</p>
            <h2>How would you like to sign in?</h2>
            <p className="muted">Select the portal that applies to you.</p>

            <div className="portal-choice">
              <button type="button" className="portal-card" onClick={() => choose('admin')}>
                <span className="portal-ico">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                </span>
                <span className="portal-title">College Admin</span>
                <span className="portal-sub">Review, verify &amp; onboard agents</span>
              </button>

              <button type="button" className="portal-card" onClick={() => choose('agent')}>
                <span className="portal-ico">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></svg>
                </span>
                <span className="portal-title">Agent Portal</span>
                <span className="portal-sub">Submit your application &amp; documents</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Sign-in form for the chosen portal ── */
          <form className="login-form" onSubmit={onSubmit} autoComplete="off">
            <button type="button" className="portal-back" onClick={() => setPortal(null)}>← Choose a different portal</button>
            <p className="kicker">{portal === 'admin' ? 'College Admin Sign-in' : 'Agent Portal Sign-in'}</p>
            <h2>{portal === 'admin' ? 'Welcome back' : 'Sign in to apply'}</h2>
            <p className="muted">
              {portal === 'admin'
                ? 'Sign in to manage your agent partnerships.'
                : 'Sign in to submit and track your application.'}
            </p>

            {portal === 'admin' && (
              <>
                <button type="button" className="btn btn-secondary btn-block" onClick={onSso} disabled={submitting}>
                  Continue with University SSO
                </button>
                <div className="divider"><span>OR</span></div>
              </>
            )}

            {error && <div className="form-error">{error}</div>}

            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </label>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="muted small hint">Demo · {DEMO[portal].username} / {DEMO[portal].password}</p>
          </form>
        )}
      </div>
    </div>
  );
}
