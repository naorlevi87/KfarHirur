// src/app/AppProviders.jsx
// Root provider wrapper: AppContext + the identity stack.
// AccountProvider is the neutral trunk (shared by every product); AuthProvider is the community
// site's projection of it (account + site `role`). Both products read the account; only the site
// reads `role`. See docs/superpowers/specs/2026-06-14-account-and-products-model-design.md.

import { AppContext } from './appState/AppContext.jsx';
import { AccountProvider } from './appState/AccountContext.jsx';
import { AuthProvider } from './appState/AuthContext.jsx';

export function AppProviders({ locale, mode, setMode, children }) {
  return (
    <AppContext.Provider value={{ locale, mode, setMode }}>
      <AccountProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </AccountProvider>
    </AppContext.Provider>
  );
}
