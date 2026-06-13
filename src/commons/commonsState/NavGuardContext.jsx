// src/commons/commonsState/NavGuardContext.jsx
// Protects in-progress work: a form registers an isDirty() predicate; every chrome navigation
// (tabs, ☰ menu, back chevron, switcher, back-to-site) goes through guardedNavigate(). If a dirty
// form is registered, the navigation is held and a confirm dialog ("changes won't be saved") is
// shown instead — Stay aborts, Discard proceeds. beforeunload (registered by the form via
// useUnsavedGuard) covers browser refresh / tab-close, which the router can't see.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';

const NavGuardContext = createContext(null);

export function NavGuardProvider({ children }) {
  const { locale } = useAppContext();
  const navigate = useNavigate();
  const dirtyRef = useRef(null);        // () => boolean, set by the active form
  const [pending, setPending] = useState(null); // { to } awaiting confirmation, or null

  const registerGuard = useCallback((predicate) => {
    dirtyRef.current = predicate;
    return () => { if (dirtyRef.current === predicate) dirtyRef.current = null; };
  }, []);

  const guardedNavigate = useCallback((to) => {
    if (dirtyRef.current?.()) setPending({ to });
    else navigate(to);
  }, [navigate]);

  const confirmLeave = () => {
    const to = pending?.to;
    dirtyRef.current = null; // leaving discards; don't re-prompt on the same navigation
    setPending(null);
    if (to !== undefined) navigate(to);
  };

  const value = useMemo(() => ({ registerGuard, guardedNavigate }), [registerGuard, guardedNavigate]);
  const g = resolveCommonsShellContent(locale).guard;

  return (
    <NavGuardContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          title={g.unsavedTitle}
          body={g.unsavedBody}
          confirmLabel={g.leave}
          cancelLabel={g.stay}
          onConfirm={confirmLeave}
          onCancel={() => setPending(null)}
        />
      )}
    </NavGuardContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavGuard() {
  const ctx = useContext(NavGuardContext);
  if (!ctx) throw new Error('useNavGuard must be used inside NavGuardProvider');
  return ctx;
}

// Used by a form: registers its dirty state with the guard and arms a beforeunload prompt while dirty.
// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedGuard(isDirty) {
  const { registerGuard } = useNavGuard();
  useEffect(() => registerGuard(() => isDirty), [registerGuard, isDirty]);
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
