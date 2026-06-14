// src/app/appState/AccountContext.jsx
// The neutral ACCOUNT layer — the identity trunk both products sit on (community site + Commons).
// Owns the Supabase auth session and the product-agnostic profile (display name, avatar) + the
// account-level operations (sign out, delete account). It knows NOTHING about any product's roles or
// memberships. The community site's role lives one layer up, in AuthContext (the site projection).
// See docs/superpowers/specs/2026-06-14-account-and-products-model-design.md.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../data/core/supabaseClient.js';
import { fetchUserProfile, deleteAccount as deleteAccountQuery } from '../../data/auth/profileQueries.js';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadedFor = useRef(null); // user id whose profile is already loaded

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        const nextId = nextUser?.id ?? null;

        // Supabase emits TOKEN_REFRESHED on every tab refocus with a fresh user object. Keep the
        // SAME reference when the id is unchanged so the whole app doesn't re-render on each refresh.
        setUser(prev => (prev?.id === nextId ? prev : nextUser));

        // Only (re)load the profile when the signed-in identity actually changes.
        if (nextId === loadedFor.current) { setLoading(false); return; }
        loadedFor.current = nextId;

        if (!nextId) { setProfile(null); setLoading(false); return; }
        setTimeout(async () => {
          const p = await fetchUserProfile(nextId);
          setProfile(p ? { displayName: p.display_name, avatarUrl: p.avatar_url } : {});
          setLoading(false);
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  // Returns null on success, an error string on failure (delegates to the account-level Edge Function).
  const deleteAccount = useCallback(
    () => (user ? deleteAccountQuery(user.id) : Promise.resolve('No signed-in account')),
    [user],
  );

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile, signOut, deleteAccount }),
    [user, profile, loading, refreshProfile, signOut, deleteAccount],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
