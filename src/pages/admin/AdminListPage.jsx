// src/pages/admin/AdminListPage.jsx
// Admin: list of all timeline items with search + sort. Entry point of /admin/timeline.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllItems } from '../../data/admin/timelineAdminQueries.js';
import './AdminListPage.css';

const STATUS_LABELS  = { published: 'פורסם', draft: 'טיוטה' };
const SIZE_LABELS    = { small: 'קטן', standard: 'רגיל', key: 'מרכזי' };
const VIS_LABELS     = { both: 'שניהם', naor_only: 'נאור', shay_only: 'שי' };

export function AdminListPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [sortBy,  setSortBy]  = useState('date');
  const [sortDir, setSortDir] = useState('asc');

  function toggleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  }

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
      let cmp = 0;
      if (sortBy === 'date')       cmp = (a.date ?? '').localeCompare(b.date ?? '');
      else if (sortBy === 'title') cmp = (a.naor_title ?? '').localeCompare(b.naor_title ?? '', 'he');
      else if (sortBy === 'size')  cmp = (a.size ?? '').localeCompare(b.size ?? '');
      else if (sortBy === 'status') cmp = (a.status ?? '').localeCompare(b.status ?? '');
      else if (sortBy === 'visibility') cmp = (a.visibility ?? '').localeCompare(b.visibility ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="admin-list-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link to="/admin" className="admin-back-btn">→ חזרה</Link>
            <h1 className="admin-header__title">עריכת ציר זמן</h1>
          </div>
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
                {[
                  { key: 'title',      label: 'כותרת' },
                  { key: 'date',       label: 'תאריך' },
                  { key: 'size',       label: 'גודל' },
                  { key: 'status',     label: 'סטטוס' },
                  { key: 'visibility', label: 'נראות' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="admin-list-page__th--sortable"
                    onClick={() => toggleSort(key)}
                    aria-sort={sortBy === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {label}
                    {sortBy === key && (
                      <span className="admin-list-page__sort-arrow">
                        {sortDir === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                ))}
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
