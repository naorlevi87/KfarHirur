// src/features/auth/AuthModal.jsx
// Auth modal: Google, Facebook, email+password. Consciousness-mode aware.

import { useEffect, useRef } from 'react';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { getText } from '../../utils/content/getText.js';
import { EmailAuthForm } from './EmailAuthForm.jsx';
import './AuthModal.css';

export function AuthModal({ isOpen, onClose, copy }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector('button,input,[tabindex]')?.focus();
  }, [isOpen]);

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function loginWithFacebook() {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
  }

  if (!isOpen) return null;

  return (
    <div className="auth-modal-root" role="dialog" aria-modal="true" aria-label={getText(copy, 'modalTitle')}>
      <div className="auth-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="auth-modal-panel" ref={panelRef}>
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label={getText(copy, 'closeModal')}>
          ✕
        </button>

        <h2 className="auth-modal-title">{getText(copy, 'modalTitle')}</h2>

        <div className="auth-modal-providers">
          <button className="auth-provider-btn auth-provider-btn--google" type="button" onClick={loginWithGoogle}>
            <GoogleIcon />
            {getText(copy, 'continueWithGoogle')}
          </button>
          <button className="auth-provider-btn auth-provider-btn--facebook" type="button" onClick={loginWithFacebook}>
            <FacebookIcon />
            {getText(copy, 'continueWithFacebook')}
          </button>
        </div>

        <div className="auth-modal-divider">
          <span>{getText(copy, 'orDivider')}</span>
        </div>

        <EmailAuthForm copy={copy} onSuccess={onClose} />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}
