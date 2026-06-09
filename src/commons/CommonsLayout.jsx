// src/commons/CommonsLayout.jsx
// Commons Engine shell: sticky top bar (workspace name) + content Outlet + bottom tab nav.
// Its own look — no consciousness mode, not under MainLayout. Mobile-first, RTL-aware.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';

const TABS = [
  { to: '/commons',          icon: '✓',  key: 'myTasks',  end: true },
  { to: '/commons/board',    icon: '▦',  key: 'board' },
  { to: '/commons/overview', icon: '◉',  key: 'overview' },
  { to: '/commons/alerts',   icon: '🔔', key: 'alerts' },
];

export function CommonsLayout() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);

  return (
    <div className="commons-root commons-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-topbar">
        <span className="commons-topbar__name">{workspace?.name ?? shell.appName}</span>
      </header>

      <main className="commons-content">
        <Outlet />
      </main>

      <nav className="commons-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map(({ to, icon, key, end }) => (
          <NavLink key={to} to={to} end={end} className="commons-tab">
            <span className="commons-tab__icon" aria-hidden="true">{icon}</span>
            {shell.nav[key]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
