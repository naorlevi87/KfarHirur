// src/commons/CommonsLayout.jsx
// Commons shell: top bar (☰ menu + workspace name) + content Outlet + bottom tab nav.
// The hamburger holds workspace-level actions; the switcher opens from it. Mobile-first, RTL.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.jsx';
import { CommonsMenu } from './CommonsMenu.jsx';
import { IconMenu, IconMine, IconBoard, IconActivity } from './icons.jsx';

const TABS = [
  { path: '',          Icon: IconMine,     key: 'myTasks',  end: true },
  { path: '/board',    Icon: IconBoard,    key: 'board' },
  { path: '/overview', Icon: IconActivity, key: 'overview' },
];

export function CommonsLayout() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const shell = resolveCommonsShellContent(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const name = workspace?.name ?? shell.appName;

  return (
    <div className="commons-root commons-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-topbar">
        <button
          type="button"
          className="commons-topbar__menuBtn"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-label={shell.menu.triggerAria}
        >
          <IconMenu />
        </button>
        <span className="commons-topbar__name">{name}</span>
        <span style={{ width: 38 }} aria-hidden="true" />
      </header>

      <main className="commons-content">
        <Outlet />
      </main>

      <nav className="commons-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map((tab) => {
          const TabIcon = tab.Icon;
          return (
            <NavLink key={tab.key} to={`/commons/${workspaceSlug}${tab.path}`} end={tab.end} className="commons-tab">
              <span className="commons-tab__icon"><TabIcon size={22} /></span>
              {shell.nav[tab.key]}
            </NavLink>
          );
        })}
      </nav>

      <CommonsMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSwitchWorkspace={() => setSwitcherOpen(true)}
      />
      <WorkspaceSwitcher
        open={switcherOpen}
        currentSlug={workspaceSlug}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
}
