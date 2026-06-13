// src/app/ProtectedRoute.jsx
// Route guard: redirects to /login if not authenticated or missing required role.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './appState/AuthContext.jsx';

// allowedRoles: array of roles that may access this route. If empty, any authenticated user passes.
export function ProtectedRoute({ allowedRoles = [] }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  // Carry the attempted path so /login can return the user here after sign-in (e.g. an invite link).
  if (!user)   return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
