// src/features/auth/EmailAuthForm.jsx
// Email + password form: sign-in and sign-up modes, email confirmation state.

import { useState } from 'react';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { getText } from '../../utils/content/getText.js';

export function EmailAuthForm({ copy, onSuccess }) {
  const [mode,     setMode]     = useState('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
      onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setMode('sent');
    }
  }

  if (mode === 'sent') {
    return (
      <div className="auth-email-sent">
        <p className="auth-email-sent__title">{getText(copy, 'emailSentTitle')}</p>
        <p className="auth-email-sent__body">{getText(copy, 'emailSentBody')}</p>
      </div>
    );
  }

  return (
    <form className="auth-email-form" onSubmit={handleSubmit} noValidate>
      <label className="auth-field__label" htmlFor="auth-email">
        {getText(copy, 'emailLabel')}
      </label>
      <input
        id="auth-email"
        className="auth-field__input"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <label className="auth-field__label" htmlFor="auth-password">
        {getText(copy, 'passwordLabel')}
      </label>
      <input
        id="auth-password"
        className="auth-field__input"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        required
        minLength={6}
      />

      {error && <p className="auth-field__error" role="alert">{error}</p>}

      <button className="auth-submit-btn" type="submit" disabled={loading}>
        {loading ? '...' : getText(copy, mode === 'signin' ? 'signInButton' : 'signUpButton')}
      </button>

      <button
        type="button"
        className="auth-switch-btn"
        onClick={() => { setError(''); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
      >
        {getText(copy, mode === 'signin' ? 'switchToSignUp' : 'switchToSignIn')}
      </button>
    </form>
  );
}
