// src/app/appState/AuthContext.jsx
// The COMMUNITY SITE's projection of the account. It consumes the neutral account layer
// (AccountContext) and layers the site-only `role` (user_roles: admin | editor | member) on top.
// `role` is a community-site fact, NOT part of the account — Commons must not read it (it uses
// useAccount instead). useAuth() keeps its original shape so every existing site/admin consumer works
// unchanged. See docs/superpowers/specs/2026-06-14-account-and-products-model-design.md.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from './AccountContext.jsx';
import { fetchUserRole } from '../../data/auth/authQueries.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const account = useAccount();
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const loadedFor = useRef(null); // user id whose role is already loaded

  const userId = account.user?.id ?? null;

  useEffect(() => {
    if (userId === loadedFor.current) return;
    loadedFor.current = userId;

    // Deferred so no setState runs synchronously in the effect body (avoids cascading renders).
    let cancelled = false;
    setTimeout(async () => {
      if (cancelled) return;
      if (!userId) { setRole(null); setRoleLoading(false); return; }
      setRoleLoading(true);
      const r = await fetchUserRole(userId);
      if (!cancelled) { setRole(r); setRoleLoading(false); }
    }, 0);
    return () => { cancelled = true; };
  }, [userId]);

  const value = useMemo(
    () => ({
      user: account.user,
      profile: account.profile,
      role,
      loading: account.loading || roleLoading,
      refreshProfile: account.refreshProfile,
    }),
    [account.user, account.profile, account.loading, account.refreshProfile, role, roleLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
