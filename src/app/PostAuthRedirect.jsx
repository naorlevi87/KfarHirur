// src/app/PostAuthRedirect.jsx
// Fallback for an OAuth round-trip that ignores redirectTo (e.g. the destination isn't in the
// provider's allowlist) and dumps the user on the home page. LoginPage stashes the intended path
// before launching OAuth; once auth resolves, this sends the user there and clears the stash.
// Renders nothing — mounted once inside the router, above the route tree.

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './appState/AuthContext.jsx';

export const RETURN_TO_KEY = 'auth:returnTo';

export function PostAuthRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    let dest;
    try { dest = localStorage.getItem(RETURN_TO_KEY); } catch { /* ignore */ }
    if (!dest) return;
    try { localStorage.removeItem(RETURN_TO_KEY); } catch { /* ignore */ }
    if (location.pathname + location.search !== dest) navigate(dest, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
