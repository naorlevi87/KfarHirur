// src/pages/admin/AdminContentListPage.jsx
// Admin: list of editable content pages. Entry point of /admin/content.

import { Link } from 'react-router-dom';

const PAGES = [
  { key: 'home',      label: 'דף בית',     desc: 'פתיחה, כפר הירעור, ג׳וז ולוז, כפתורי ביקור, גיוס, הצטרפות' },
  { key: 'kenZeOved', label: 'כן זה עובד', desc: 'עמוד הגיוס — כותרות, כפתורים, פסקאות, יעדים' },
];

export function AdminContentListPage() {
  return (
    <div className="admin-dashboard" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link to="/admin" className="admin-back-btn">→ חזרה</Link>
            <h1 className="admin-header__title">עריכת תוכן</h1>
          </div>
        </div>
      </header>

      <main className="admin-dashboard__main">
        <div className="admin-dashboard__grid">
          {PAGES.map(page => (
            <Link
              key={page.key}
              to={`/admin/content/${page.key}`}
              className="admin-dashboard__card"
            >
              <div className="admin-dashboard__card-icon">📝</div>
              <h2 className="admin-dashboard__card-title">{page.label}</h2>
              <p className="admin-dashboard__card-desc">{page.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
