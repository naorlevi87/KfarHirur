// src/pages/admin/AdminPage.jsx
// Admin shell — Phase 2 placeholder. Phase 3 will add full CRUD UI here.

import { useAuth } from '../../app/appState/AuthContext.jsx';
import { supabase } from '../../data/timeline/supabaseClient.js';
import './AdminPage.css';

export function AdminPage() {
  const { user, role } = useAuth();

  function handleSignOut() {
    supabase.auth.signOut();
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-title">כפר הירעור — ניהול</h1>
        <div className="admin-user">
          <span className="admin-role">{role}</span>
          <span className="admin-email">{user?.email}</span>
          <button className="admin-signout" onClick={handleSignOut}>יציאה</button>
        </div>
      </header>
      <main className="admin-main">
        <p className="admin-placeholder">ממשק הניהול יגיע בקרוב.</p>
      </main>
    </div>
  );
}
