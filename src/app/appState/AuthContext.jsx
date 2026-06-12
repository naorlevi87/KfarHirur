// src/app/appState/AuthContext.jsx
// Auth context: current user session, role, and profile (display_name, avatar_url).
// Subscribes to Supabase auth state changes.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { fetchUserRole } from '../../data/auth/authQueries.js';
import { fetchUserProfile } from '../../data/auth/profileQueries.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadedFor = useRef(null); // user id whose role/profile are already loaded

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        const nextId = nextUser?.id ?? null;

        // Supabase emits TOKEN_REFRESHED on every tab refocus with a fresh user object. Keep the
        // SAME reference when the id is unchanged so the whole app doesn't re-render on each refresh.
        setUser(prev => (prev?.id === nextId ? prev : nextUser));

        // Only (re)load role + profile when the signed-in identity actually changes.
        if (nextId === loadedFor.current) { setLoading(false); return; }
        loadedFor.current = nextId;

        if (!nextId) { setRole(null); setProfile(null); setLoading(false); return; }
        setTimeout(async () => {
          const [r, p] = await Promise.all([fetchUserRole(nextId), fetchUserProfile(nextId)]);
          setRole(r);
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

  const value = useMemo(
    () => ({ user, role, profile, loading, refreshProfile }),
    [user, role, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
