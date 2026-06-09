// src/commons/WorkspaceSwitcher.jsx
// Bottom-sheet workspace switcher, opened from the top-bar workspace name.
// Reuses WorkspaceList. Mobile-first, RTL, focus-trapped, Escape/backdrop to close.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useMemberships } from './commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { WorkspaceList } from './WorkspacePicker.jsx';

export function WorkspaceSwitcher({ open, currentSlug, onClose }) {
  const { locale } = useAppContext();
  const { workspaces } = useMemberships();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    sheetRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function pick(ws) {
    onClose();
    if (ws.slug !== currentSlug) navigate(`/commons/${ws.slug}`);
  }

  return (
    <div className="commons-sheetRoot" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-sheetBackdrop" role="presentation" onClick={onClose} aria-hidden="true" />
      <div
        className="commons-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={shell.switcher.title}
      >
        <div className="commons-sheet__grip" aria-hidden="true" />
        <h2 className="commons-sheet__title">{shell.switcher.title}</h2>
        <WorkspaceList workspaces={workspaces} currentSlug={currentSlug} onPick={pick} />
      </div>
    </div>
  );
}
