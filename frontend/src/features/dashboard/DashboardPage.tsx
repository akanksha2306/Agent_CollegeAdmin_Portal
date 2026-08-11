import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type DashboardData, type Priority } from '@amp/shared';
import { useAuth } from '../auth/AuthContext.js';
import { api } from '../../lib/api.js';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const PRIORITY_CLASS: Record<Priority, string> = {
  CRITICAL: 'pill--crit',
  HIGH: 'pill--warn',
  MEDIUM: 'pill--muted',
};
const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium' };

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div>
      <header className="page-head">
        <h1>{greeting()}, {firstName}</h1>
        <p className="muted">Here's what needs your attention today</p>
      </header>

      {error && <p className="error">Could not load dashboard: {error}</p>}
      {!data && !error && <p className="muted">Loading dashboard…</p>}

      {data && (
        <>
          <div className="stat-grid stat-grid--5">
            {data.stats.map((s) => (
              <div key={s.key} className="card stat">
                <span className="muted small">{s.label}</span>
                <strong className="stat-value">{s.value}</strong>
                {s.note && <span className="muted small">{s.note}</span>}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>My work queue</h3>
              <Link to="/applications" className="small">View all →</Link>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Agent</th>
                  <th>Required action</th>
                  <th>Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.workQueue.map((w) => (
                  <tr key={w.id}>
                    <td><span className={`pill ${PRIORITY_CLASS[w.priority]}`}>{PRIORITY_LABEL[w.priority]}</span></td>
                    <td><Link to={`/applications/${w.id}`}>{w.business}</Link><div className="muted small">{w.country}</div></td>
                    <td>{w.action}</td>
                    <td className={w.due === 'Overdue' ? 'due-urgent' : ''}>{w.due}</td>
                    <td className="col-action">
                      <Link to={`/applications/${w.id}`} className="cta-link">{w.cta} →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.workQueue.length === 0 && (
              <p className="muted center">Nothing in the queue — all caught up.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
