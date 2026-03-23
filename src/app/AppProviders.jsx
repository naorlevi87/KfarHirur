// src/app/AppProviders.jsx
// Root provider wrapper: injects AppContext only.

import { AppContext } from './appState/AppContext.jsx';

export function AppProviders({ locale, mode, setMode, children }) {
  return (
    <AppContext.Provider value={{ locale, mode, setMode }}>{children}</AppContext.Provider>
  );
}
