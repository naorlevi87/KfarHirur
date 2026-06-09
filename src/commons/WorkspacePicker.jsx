// src/commons/WorkspacePicker.jsx
// Workspace selection screen at /commons (shown only when the user has 2+ workspaces;
// a single membership auto-enters upstream). Exports a presentational WorkspaceList
// reused by the top-bar switcher sheet. Mobile-first, RTL-aware.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useMemberships } from './commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';

export function WorkspaceList({ workspaces, currentSlug, onPick }) {
  return (
    <ul className="commons-wsList">
      {workspaces.map(ws => {
        const active = ws.slug === currentSlug;
        return (
          <li key={ws.id}>
            <button
              type="button"
              className={active ? 'commons-wsCard commons-wsCard--active' : 'commons-wsCard'}
              onClick={() => onPick(ws)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="commons-wsCard__avatar" aria-hidden="true">{[...ws.name][0] ?? '·'}</span>
              <span className="commons-wsCard__name">{ws.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkspacePicker() {
  const { locale } = useAppContext();
  const { workspaces } = useMemberships();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);

  return (
    <div className="commons-root commons-pickerScreen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-picker">
        <h1>{shell.picker.title}</h1>
        <p>{shell.picker.subtitle}</p>
        <nav aria-label={shell.picker.chooseAria}>
          <WorkspaceList workspaces={workspaces} onPick={ws => navigate(`/commons/${ws.slug}`)} />
        </nav>
      </div>
    </div>
  );
}
