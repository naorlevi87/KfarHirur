// src/app/appState/AuthContext.jsx
// Auth context: current user session, role, and profile (display_name, avatar_url).
// Subscribes to Supabase auth state changes.

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { fetchUserRole } from '../../data/auth/authQueries.js';
import { fetchUserProfile } from '../../data/auth/profileQueries.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        setTimeout(async () => {
          if (nextUser) {
            const [r, p] = await Promise.all([
              fetchUserRole(nextUser.id),
              fetchUserProfile(nextUser.id),
            ]);
            setRole(r);
            setProfile(p ? { displayName: p.display_name, avatarUrl: p.avatar_url } : {});
          } else {
            setRole(null);
            setProfile(null);
          }
          setLoading(false);
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function refreshProfile(updates) {
    setProfile(prev => ({ ...prev, ...updates }));
  }

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
