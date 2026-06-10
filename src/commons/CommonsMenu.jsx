// src/commons/CommonsMenu.jsx
// Workspace-level action menu — a side drawer opened from the top-bar ☰ (slides from the start edge).
// Entries gate by permission: new task → manager/admin, new folder + member management → admin.
// "Switch workspace" is delegated to the parent so it can open the existing WorkspaceSwitcher.

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { useMemberships } from './commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { IconPlus, IconFolderPlus, IconSwap, IconUsers, IconGear } from './icons.jsx';
import kfarLogo from '../assets/images/kfar-hirur-logo-circleOnly.png';

export function CommonsMenu({ open, onClose, onSwitchWorkspace }) {
  const { locale } = useAppContext();
  const { permissionLevel } = useWorkspace();
  const { workspaces } = useMemberships();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const m = shell.menu;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canTask = ['admin', 'manager'].includes(permissionLevel);
  const canFolder = permissionLevel === 'admin';
  const base = `/commons/${workspaceSlug}`;
  const go = (path) => { onClose(); navigate(`${base}${path}`); };

  return (
    <div className="commons-drawerRoot" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-drawerBackdrop" role="presentation" aria-hidden="true" onClick={onClose} />
      <aside className="commons-drawer" ref={ref} role="dialog" aria-modal="true" aria-label={m.triggerAria}>
        <ul className="commons-menu">
          {canTask && <li><button type="button" className="commons-menu__item" onClick={() => go('/task/new')}><IconPlus size={20} /> {m.newTask}</button></li>}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/task/new?kind=container')}><IconFolderPlus size={20} /> {m.newFolder}</button></li>}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/members')}><IconUsers size={20} /> {m.members}</button></li>}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/roles')}><IconGear size={20} /> {m.roles}</button></li>}
          {workspaces.length > 1 && (
            <li><button type="button" className="commons-menu__item" onClick={() => { onClose(); onSwitchWorkspace(); }}><IconSwap size={20} /> {m.switchWorkspace}</button></li>
          )}
          <li><button type="button" className="commons-menu__item commons-menu__item--back" onClick={() => { onClose(); navigate('/'); }}>
            <img className="commons-menu__logo" src={kfarLogo} alt="" /> {m.backToSite}
          </button></li>
        </ul>
      </aside>
    </div>
  );
}
