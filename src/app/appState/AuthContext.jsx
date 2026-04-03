// src/app/appState/AuthContext.jsx
// Auth context: current user session + role.
// Subscribes to Supabase auth state changes. Components never import supabase directly.

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { fetchUserRole } from '../../data/auth/authQueries.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION — handles both
    // the initial load and all subsequent auth changes (sign in, sign out, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        // Defer DB call to next tick — avoids deadlock with Supabase's internal lock
        // that is held during the onAuthStateChange callback.
        setTimeout(async () => {
          if (nextUser) {
            const r = await fetchUserRole(nextUser.id);
            console.log('[AuthContext] role:', r);
            setRole(r);
          } else {
            setRole(null);
          }
          setLoading(false);
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
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
