import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';

export function LoginPage() {
  const { user, loading, login, ssoLogin } = useAuth();
  const navigate = useNavigate();

  // Prefilled with the demo credentials so the stakeholder demo is one-click and
  // can't be blocked by the browser autofilling a stale saved password.
  const [username, setUsername] = useState('robin.admin');
  const [password, setPassword] = useState('AgentPortal26');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the login screen.
  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
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
      await ssoLogin();
      navigate('/', { replace: true });
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
        <form className="login-form" onSubmit={onSubmit} autoComplete="off">
          <p className="kicker">College Admin Sign-in</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to manage your agent partnerships.</p>

          <button type="button" className="btn btn-secondary btn-block" onClick={onSso} disabled={submitting}>
            Continue with University SSO
          </button>

          <div className="divider"><span>OR</span></div>

          {error && <div className="form-error">{error}</div>}

          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="robin.admin"
              autoComplete="off"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="muted small hint">Demo · robin.admin / AgentPortal26</p>
        </form>
      </div>
    </div>
  );
}
