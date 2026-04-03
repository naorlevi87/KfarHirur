// src/pages/login/LoginPage.jsx
// Login page: magic link via email. No external UI library — avoids React version conflicts.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import './LoginPage.css';

export function LoginPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">כפר הירעור</h1>

        {sent ? (
          <p className="login-sent">בדוק את האימייל — שלחנו לינק כניסה.</p>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="login-email">אימייל</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
            {error && <p className="login-error">{error}</p>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'שולח...' : 'שלח לינק כניסה'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
