// src/app/AppProviders.jsx
// Root provider wrapper: AppContext + AuthProvider.

import { AppContext } from './appState/AppContext.jsx';
import { AuthProvider } from './appState/AuthContext.jsx';

export function AppProviders({ locale, mode, setMode, children }) {
  return (
    <AppContext.Provider value={{ locale, mode, setMode }}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppContext.Provider>
  );
}
