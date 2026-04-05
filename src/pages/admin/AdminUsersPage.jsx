// src/pages/admin/AdminUsersPage.jsx
// Admin: list all users and allow changing their role.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllUsers, updateUserRole } from '../../data/admin/usersAdminQueries.js';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import './AdminUsersPage.css';

const ROLES = ['member', 'editor', 'admin'];
const ROLE_LABELS = { member: 'משתמש', editor: 'עורך תוכן', admin: 'אדמין' };

export function AdminUsersPage() {
  const { user } = useAuth(); // needed to disable own-row role select
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(null); // userId being saved

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId, newRole) {
    setSaving(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="admin-users-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__right">
          <Link to="/admin" className="admin-back-btn">← חזרה</Link>
          <h1 className="admin-header__title">ניהול משתמשים</h1>
        </div>
      </header>

      <div className="admin-users-page__content">
        {loading && <p className="admin-users-page__msg">טוען...</p>}
        {error   && <p className="admin-users-page__msg admin-users-page__msg--error">{error}</p>}

        {!loading && !error && (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>משתמש</th>
                <th>אימייל</th>
                <th>תפקיד</th>
                <th>הצטרף</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.id === user?.id ? 'admin-users-table__row--self' : ''}>
                  <td className="admin-users-table__avatar-cell">
                    {u.avatar_url ? (
                      <img className="admin-users-table__avatar" src={u.avatar_url} alt={u.display_name ?? u.email} />
                    ) : (
                      <span className="admin-users-table__initials">
                        {(u.display_name ?? u.email ?? '?')[0].toUpperCase()}
                      </span>
                    )}
                    <span>{u.display_name ?? '—'}</span>
                  </td>
                  <td className="admin-users-table__email">{u.email}</td>
                  <td>
                    <select
                      className="admin-users-table__role-select"
                      value={u.role ?? 'member'}
                      disabled={saving === u.id || u.id === user?.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    {saving === u.id && <span className="admin-users-table__saving">שומר...</span>}
                  </td>
                  <td className="admin-users-table__date">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : '—'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="admin-users-page__msg">אין משתמשים.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
