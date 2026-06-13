// src/pages/login/LoginPage.jsx
// Standalone login page — renders the auth modal immediately, then returns the user to wherever
// they were headed (ProtectedRoute passes it as location.state.from), defaulting home. For OAuth,
// that destination is both the redirectTo (so the round-trip lands there directly) and stashed in
// localStorage as a fallback (PostAuthRedirect) in case the provider ignores redirectTo.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { AuthModal } from '../../features/auth/AuthModal.jsx';
import { resolveSiteShellContent } from '../../app/resolveSiteShellContent.js';
import { RETURN_TO_KEY } from '../../app/PostAuthRedirect.jsx';

export function LoginPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(true);

  const from = location.state?.from ?? '/';

  const shell    = resolveSiteShellContent('he');
  const authCopy = shell.auth ?? {};

  // Stash the destination so an OAuth round-trip that ignores redirectTo still lands there.
  useEffect(() => {
    if (from !== '/') { try { localStorage.setItem(RETURN_TO_KEY, from); } catch { /* ignore */ } }
  }, [from]);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  function handleClose() {
    setOpen(false);
    navigate(-1);
  }

  return (
    <AuthModal isOpen={open} onClose={handleClose} copy={authCopy} redirectTo={window.location.origin + from} />
  );
}
