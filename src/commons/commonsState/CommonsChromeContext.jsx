// src/commons/commonsState/CommonsChromeContext.jsx
// Lets a focused screen (task form/view, members, roles) declare what the persistent top bar shows:
// a back chevron, a title, and an optional single action button. Tab pages leave it default, so the
// bar falls back to the workspace name with no back. This is how the shell stays present on every
// screen without each screen rendering (and duplicating) its own bar.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ChromeContext = createContext(null);

export function CommonsChromeProvider({ children }) {
  const [chrome, setChrome] = useState(null); // { title, showBack, action } | null (= default bar)
  const value = useMemo(() => ({ chrome, setChrome }), [chrome]);
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

// Read by CommonsLayout to render the adaptive top bar.
// eslint-disable-next-line react-refresh/only-export-components
export function useChrome() {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('useChrome must be used inside CommonsChromeProvider');
  return ctx.chrome;
}

// Declared by a focused screen. `action` should be a stable element (memoize it in the caller if it
// closes over changing values) so the bar doesn't reset every render.
// eslint-disable-next-line react-refresh/only-export-components
export function useCommonsChrome({ title, showBack = false, action = null }) {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('useCommonsChrome must be used inside CommonsChromeProvider');
  const { setChrome } = ctx;
  useEffect(() => {
    setChrome({ title, showBack, action });
    return () => setChrome(null);
  }, [setChrome, title, showBack, action]);
}
