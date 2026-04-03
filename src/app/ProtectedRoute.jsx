// src/app/ProtectedRoute.jsx
// Route guard: redirects to /login if not authenticated or missing required role.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './appState/AuthContext.jsx';

// allowedRoles: array of roles that may access this route. If empty, any authenticated user passes.
export function ProtectedRoute({ allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
