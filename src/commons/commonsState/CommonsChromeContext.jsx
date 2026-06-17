// src/commons/commonsState/CommonsChromeContext.jsx
// Lets a focused screen (task form/view, members, roles) declare what the persistent top bar shows:
// a back chevron, a title, and an optional single action button. Tab pages leave it default, so the
// bar falls back to the workspace name with no back. This is how the shell stays present on every
// screen without each screen rendering (and duplicating) its own bar.
//
// The chrome VALUE and the SETTER live in two separate contexts on purpose. A screen that declares
// chrome consumes only the (stable) setter, so updating the chrome never re-renders the declaring
// screen. Bundling both in one value caused an infinite loop: setChrome → value changes → the screen
// (a consumer) re-renders → it passes a fresh `action` element → the declare-effect re-runs → setChrome…

import { createContext, useContext, useEffect, useState } from 'react';

const ChromeStateContext = createContext(undefined); // current chrome | null (= default bar)
const ChromeSetContext = createContext(undefined);   // setChrome (stable identity)

export function CommonsChromeProvider({ children }) {
  const [chrome, setChrome] = useState(null);
  return (
    <ChromeSetContext.Provider value={setChrome}>
      <ChromeStateContext.Provider value={chrome}>{children}</ChromeStateContext.Provider>
    </ChromeSetContext.Provider>
  );
}

// Read by CommonsLayout to render the adaptive top bar.
// eslint-disable-next-line react-refresh/only-export-components
export function useChrome() {
  const chrome = useContext(ChromeStateContext);
  if (chrome === undefined) throw new Error('useChrome must be used inside CommonsChromeProvider');
  return chrome; // null = default bar
}

// Declared by a focused screen. Because this consumes only the stable setter, a fresh `action`
// element per render no longer feeds back into a re-render of this screen — so it cannot loop.
// eslint-disable-next-line react-refresh/only-export-components
export function useCommonsChrome({ title, showBack = false, action = null }) {
  const setChrome = useContext(ChromeSetContext);
  if (setChrome === undefined) throw new Error('useCommonsChrome must be used inside CommonsChromeProvider');
  useEffect(() => {
    setChrome({ title, showBack, action });
    return () => setChrome(null);
  }, [setChrome, title, showBack, action]);
}
