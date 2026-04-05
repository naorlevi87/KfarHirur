// src/pages/login/LoginPage.jsx
// Standalone login page — renders the auth modal immediately, redirects home after login.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { AuthModal } from '../../features/auth/AuthModal.jsx';
import { resolveSiteShellContent } from '../../app/resolveSiteShellContent.js';

export function LoginPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(true);

  const shell    = resolveSiteShellContent('he');
  const authCopy = shell.auth ?? {};

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  function handleClose() {
    setOpen(false);
    navigate(-1);
  }

  return (
    <AuthModal isOpen={open} onClose={handleClose} copy={authCopy} />
  );
}
