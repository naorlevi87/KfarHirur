// src/pages/admin/AdminListPage.jsx
// Admin: list of all timeline items with search + sort. Entry point of /admin/timeline.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllItems } from '../../data/admin/timelineAdminQueries.js';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { supabase } from '../../data/timeline/supabaseClient.js';
import './AdminListPage.css';

const STATUS_LABELS  = { published: 'פורסם', draft: 'טיוטה' };
const SIZE_LABELS    = { small: 'קטן', standard: 'רגיל', key: 'מרכזי' };
const VIS_LABELS     = { both: 'שניהם', naor_only: 'נאור', shay_only: 'שי' };

export function AdminListPage() {
  const { user, role } = useAuth();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [sortBy,  setSortBy]  = useState('date');

  useEffect(() => {
    fetchAllItems()
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (item.naor_title ?? '').toLowerCase().includes(q) ||
             (item.slug ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'date')  return a.date.localeCompare(b.date);
      if (sortBy === 'title') return (a.naor_title ?? '').localeCompare(b.naor_title ?? '', 'he');
      return 0;
    });

  return (
    <div className="admin-list-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__right">
          <h1 className="admin-header__title">כפר הירעור — ניהול</h1>
          <span className="admin-header__section">ציר הזמן</span>
        </div>
        <div className="admin-header__user">
          <span className="admin-role-badge">{role}</span>
          <span className="admin-email">{user?.email}</span>
          <button className="admin-signout" onClick={() => supabase.auth.signOut()}>יציאה</button>
        </div>
      </header>

      <div className="admin-list-page__toolbar">
        <input
          className="admin-list-page__search"
          type="search"
          placeholder="חיפוש לפי שם..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="admin-list-page__sort"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="date">מיון: תאריך</option>
          <option value="title">מיון: שם</option>
        </select>
        <Link className="admin-list-page__new-btn" to="/admin/timeline/items/new">
          + פריט חדש
        </Link>
      </div>

      {loading && <p className="admin-list-page__msg">טוען...</p>}
      {error   && <p className="admin-list-page__msg admin-list-page__msg--error">{error}</p>}

      {!loading && !error && (
        <div className="admin-list-page__table-wrap">
          <table className="admin-list-page__table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>תאריך</th>
                <th>גודל</th>
                <th>סטטוס</th>
                <th>נראות</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="admin-list-page__title-cell">
                    <span>{item.naor_title ?? item.slug}</span>
                    <small className="admin-list-page__slug">{item.slug}</small>
                  </td>
                  <td dir="ltr">{item.date?.slice(0, 10)}</td>
                  <td>{SIZE_LABELS[item.size] ?? item.size}</td>
                  <td>
                    <span className={`admin-status admin-status--${item.status}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td>{VIS_LABELS[item.visibility] ?? item.visibility}</td>
                  <td>
                    <Link
                      className="admin-list-page__edit-btn"
                      to={`/admin/timeline/items/${item.slug}`}
                    >
                      עריכה
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-list-page__empty">אין פריטים.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
