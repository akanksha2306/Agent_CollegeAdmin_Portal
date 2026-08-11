import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.js';

/** Gate for authenticated routes — redirects to /login when signed out. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
