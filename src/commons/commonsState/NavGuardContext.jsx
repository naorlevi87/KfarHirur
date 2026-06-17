// src/commons/commonsState/NavGuardContext.jsx
// Protects in-progress work: a form registers an isDirty() predicate (and optionally a save handler).
// A single React Router useBlocker then intercepts EVERY navigation while dirty — in-app pushes (tabs,
// ☰ menu, back chevron, switcher, back-to-site) AND the browser / phone hardware back (a POP) — and
// shows a Save / Discard / Stay dialog. This needs a data router (see src/app/App.jsx). beforeunload
// (armed by useUnsavedGuard) still covers a real page refresh / tab-close, which the router can't see.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';

const NavGuardContext = createContext(null);

export function NavGuardProvider({ children }) {
  const { locale } = useAppContext();
  const navigate = useNavigate();
  const dirtyRef = useRef(null);        // () => boolean, set by the active form
  const saveRef = useRef(null);         // optional () => Promise<boolean>, lets the dialog offer "Save"
  const [saving, setSaving] = useState(false);
  const [canSave, setCanSave] = useState(false); // does the active form expose a save handler?

  const registerGuard = useCallback((predicate, onSave) => {
    dirtyRef.current = predicate;
    saveRef.current = onSave ?? null;
    setCanSave(!!onSave);
    return () => {
      if (dirtyRef.current === predicate) { dirtyRef.current = null; saveRef.current = null; setCanSave(false); }
    };
  }, []);

  // Block any real navigation while the active form is dirty (skip same-path updates).
  const blocker = useBlocker(useCallback(
    ({ currentLocation, nextLocation }) =>
      !!dirtyRef.current?.() && currentLocation.pathname !== nextLocation.pathname,
    []
  ));
  const blocked = blocker.state === 'blocked';

  // guardedNavigate is now a plain navigate — the blocker decides whether to intercept. Kept so call
  // sites (chrome, menu, switcher) don't change.
  const guardedNavigate = useCallback((to) => navigate(to), [navigate]);

  const proceed = () => { dirtyRef.current = null; blocker.proceed?.(); };   // discard + leave
  const stay = () => blocker.reset?.();
  const saveAndProceed = async () => {
    setSaving(true);
    let ok = false;
    try { ok = await saveRef.current?.(); } finally { setSaving(false); }
    if (ok) { dirtyRef.current = null; blocker.proceed?.(); }  // saved → leave
    else blocker.reset?.();                                    // couldn't save (e.g. empty title) → stay to fix
  };

  const value = useMemo(() => ({ registerGuard, guardedNavigate }), [registerGuard, guardedNavigate]);
  const g = resolveCommonsShellContent(locale).guard;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <NavGuardContext.Provider value={value}>
      {children}
      {blocked && (canSave ? (
        <ConfirmDialog
          title={g.unsavedTitle}
          body={g.unsavedBody}
          dir={dir}
          dismissable={!saving}
          onCancel={stay}
          actions={[
            { label: g.save, variant: 'primary', disabled: saving, onClick: saveAndProceed },
            { label: g.discard, variant: 'discard', disabled: saving, onClick: proceed },
            { label: g.stay, variant: 'ghost', disabled: saving, onClick: stay },
          ]}
        />
      ) : (
        <ConfirmDialog
          title={g.unsavedTitle}
          body={g.unsavedBody}
          dir={dir}
          confirmLabel={g.leave}
          cancelLabel={g.stay}
          destructive={false}
          onConfirm={proceed}
          onCancel={stay}
        />
      ))}
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
// `isDirty` is a **synchronous getter** `() => boolean` (a ref read), so a form that clears its dirty
// flag and navigates in the same tick isn't blocked by stale state. An optional async `onSave` lets
// the dialog offer "Save" (returns true on success). Both are read through refs so the latest closures
// run without re-registering every render.
// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedGuard(isDirty, onSave) {
  const { registerGuard } = useNavGuard();
  const getterRef = useRef(isDirty);
  const saveRef = useRef(onSave);
  useEffect(() => { getterRef.current = isDirty; saveRef.current = onSave; }); // keep latest closures
  const hasSave = !!onSave;
  useEffect(
    () => registerGuard(() => !!getterRef.current?.(), hasSave ? () => saveRef.current?.() : null),
    [registerGuard, hasSave]
  );
  useEffect(() => {
    const handler = (e) => { if (getterRef.current?.()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
