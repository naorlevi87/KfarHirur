// src/commons/CommonsLayout.jsx
// Commons shell — a TWO-BAND sticky header (docs/commons-standards.md §1.1), owned here, on EVERY screen:
//   ① app header  — persistent: ☰ + workspace name (screen titles never overwrite it).
//   ② screen bar  — per screen: back chevron + screen title (reading-start) · one action (reading-end).
// Below: content Outlet + fixed bottom tab nav. Focused screens declare band ② via useCommonsChrome;
// tab pages fall back to the active tab's label. All chrome navigations route through the nav guard so
// a dirty form prompts before it's abandoned. Mobile-first, RTL.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { NavGuardProvider, useNavGuard } from './commonsState/NavGuardContext.jsx';
import { CommonsChromeProvider, useChrome } from './commonsState/CommonsChromeContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.jsx';
import { CommonsMenu } from './CommonsMenu.jsx';
import { IconMenu, IconMine, IconBoard, IconActivity, IconChevronStart } from './icons.jsx';

const TABS = [
  { path: '',          Icon: IconMine,     key: 'myTasks',  end: true },
  { path: '/board',    Icon: IconBoard,    key: 'board' },
  { path: '/overview', Icon: IconActivity, key: 'overview' },
];

export function CommonsLayout() {
  // Providers wrap the shell so both the bar (chrome) and the tabs/menu (guard) can be set by the
  // screens rendered in the Outlet and read by the bar rendered here.
  return (
    <NavGuardProvider>
      <CommonsChromeProvider>
        <CommonsLayoutInner />
      </CommonsChromeProvider>
    </NavGuardProvider>
  );
}

function CommonsLayoutInner() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const { guardedNavigate } = useNavGuard();
  const chrome = useChrome();
  const { pathname } = useLocation();
  const shell = resolveCommonsShellContent(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const base = `/commons/${workspaceSlug}`;
  const workspaceName = workspace?.name || shell.appName;

  function isTabActive(tab) {
    if (tab.end) return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(`${base}${tab.path}`);
  }

  // Band ② title: a focused screen's chrome title, else the active tab's label.
  const activeTab = TABS.find(isTabActive);
  const screenTitle = chrome?.title || (activeTab ? shell.nav[activeTab.key] : '');

  return (
    <div className="commons-root commons-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      {/* Band ① — app identity, persistent. Sits ABOVE the hamburger drawer (the ☰ stays reachable). */}
      <header className="commons-appbar">
        <button
          type="button"
          className="commons-topbar__menuBtn"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-label={shell.menu.triggerAria}
        >
          <IconMenu />
        </button>
        <span className="commons-appbar__name">{workspaceName}</span>
      </header>

      {/* Band ② — current screen: back + title (reading-start) · action (reading-end). The drawer
          opens OVER this band but UNDER band ①. */}
      <div className="commons-screenbar">
        <div className="commons-screenbar__lead">
          {chrome?.showBack && (
            <button
              type="button"
              className="commons-topbar__back"
              onClick={() => guardedNavigate(-1)}
              aria-label={shell.nav.backAria}
            >
              <IconChevronStart size={20} />
            </button>
          )}
          <span className="commons-screenbar__title">{screenTitle}</span>
        </div>
        {chrome?.action && <div className="commons-screenbar__end">{chrome.action}</div>}
      </div>

      <main className="commons-content">
        <Outlet />
      </main>

      <nav className="commons-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map((tab) => {
          const TabIcon = tab.Icon;
          return (
            <button
              type="button"
              key={tab.key}
              className={isTabActive(tab) ? 'commons-tab active' : 'commons-tab'}
              aria-current={isTabActive(tab) ? 'page' : undefined}
              onClick={() => guardedNavigate(`${base}${tab.path}`)}
            >
              <span className="commons-tab__icon"><TabIcon size={22} /></span>
              {shell.nav[tab.key]}
            </button>
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
