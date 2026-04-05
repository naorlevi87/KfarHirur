// src/pages/admin/AdminDashboardPage.jsx
// Admin dashboard — entry point with navigation cards to subsections.

import { Link } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import './AdminDashboardPage.css';

export function AdminDashboardPage() {
  const { role } = useAuth();

  return (
    <div className="admin-dashboard" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__right">
          <h1 className="admin-header__title">כפר הירעור — ניהול</h1>
        </div>
      </header>

      <main className="admin-dashboard__main">
        <div className="admin-dashboard__grid">
          {role === 'admin' && (
            <Link to="/admin/users" className="admin-dashboard__card">
              <div className="admin-dashboard__card-icon">👥</div>
              <h2 className="admin-dashboard__card-title">משתמשים</h2>
              <p className="admin-dashboard__card-desc">ניהול משתמשים, הרשאות ותפקידים</p>
            </Link>
          )}
          <Link to="/admin/timeline" className="admin-dashboard__card">
            <div className="admin-dashboard__card-icon">📅</div>
            <h2 className="admin-dashboard__card-title">ציר זמן</h2>
            <p className="admin-dashboard__card-desc">עריכת פריטים בציר הזמן</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
