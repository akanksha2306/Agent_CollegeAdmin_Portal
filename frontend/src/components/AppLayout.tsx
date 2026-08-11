import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.js';
import { api } from '../lib/api.js';

const ico = (path: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-ico">
    {path}
  </svg>
);

const nav: { to: string; label: string; end?: boolean; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', end: true, icon: ico(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>) },
  { to: '/applications', label: 'Applications', icon: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>) },
  { to: '/agents', label: 'Active Agents', icon: ico(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>) },
  { to: '/collateral', label: 'Marketing Collateral', icon: ico(<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />) },
  { to: '/compliance', label: 'Compliance', icon: ico(<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>) },
  { to: '/reports', label: 'Reports', icon: ico(<><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></>) },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    api
      .listAgents('NEW_REQUEST')
      .then((a) => setNewCount(a.length))
      .catch(() => setNewCount(0));
  }, []);

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Agents don't belong in the admin app.
  if (user?.role === 'AGENT') return <Navigate to="/agent" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>AMP</span>
        </div>
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `navitem${isActive ? ' navitem--active' : ''}`}
            >
              {item.icon}
              <span className="navitem-label">{item.label}</span>
              {item.to === '/applications' && newCount > 0 && <span className="nav-badge">{newCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user?.name?.charAt(0) ?? '?'}</div>
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            <span className="muted small">College Admin</span>
          </div>
          <button className="btn-icon" onClick={onLogout} title="Sign out" aria-label="Sign out">
            ⎋
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
