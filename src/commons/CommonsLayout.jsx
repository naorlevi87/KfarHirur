// src/commons/CommonsLayout.jsx
// Commons Engine shell: top bar (workspace name → switcher when 2+) + content Outlet +
// bottom tab nav scoped to the active :workspaceSlug. No consciousness mode. Mobile-first, RTL.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { useMemberships } from './commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.jsx';

const TABS = [
  { path: '',          icon: '✓',  key: 'myTasks',  end: true },
  { path: '/board',    icon: '▦',  key: 'board' },
  { path: '/overview', icon: '◉',  key: 'overview' },
  { path: '/alerts',   icon: '🔔', key: 'alerts' },
];

export function CommonsLayout() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaces } = useMemberships();
  const { workspaceSlug } = useParams();
  const shell = resolveCommonsShellContent(locale);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const canSwitch = workspaces.length > 1;
  const name = workspace?.name ?? shell.appName;

  return (
    <div className="commons-root commons-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-topbar">
        {canSwitch ? (
          <button
            type="button"
            className="commons-topbar__name commons-topbar__name--btn"
            onClick={() => setSwitcherOpen(true)}
            aria-haspopup="dialog"
            aria-label={shell.switcher.triggerAria}
          >
            {name}
            <span className="commons-topbar__chev" aria-hidden="true">⌄</span>
          </button>
        ) : (
          <span className="commons-topbar__name">{name}</span>
        )}
      </header>

      <main className="commons-content">
        <Outlet />
      </main>

      <nav className="commons-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map(({ path, icon, key, end }) => (
          <NavLink key={key} to={`/commons/${workspaceSlug}${path}`} end={end} className="commons-tab">
            <span className="commons-tab__icon" aria-hidden="true">{icon}</span>
            {shell.nav[key]}
          </NavLink>
        ))}
      </nav>

      <WorkspaceSwitcher
        open={switcherOpen}
        currentSlug={workspaceSlug}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
}
