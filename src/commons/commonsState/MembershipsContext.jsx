// src/commons/commonsState/MembershipsContext.jsx
// Resolves the full set of workspaces the signed-in user is an active member of.
// Drives the picker (/commons) and the top-bar switcher. Components read useMemberships(),
// never Supabase. Scoped above the per-workspace WorkspaceContext.

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchMyWorkspaces } from '../../data/commons/workspaceQueries.js';

const MembershipsContext = createContext(null);

export function MembershipsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, workspaces: [] });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function resolve() {
      const workspaces = user ? await fetchMyWorkspaces(user.id) : [];
      if (!cancelled) setState({ loading: false, workspaces });
    }

    resolve();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return <MembershipsContext.Provider value={state}>{children}</MembershipsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMemberships() {
  const ctx = useContext(MembershipsContext);
  if (!ctx) throw new Error('useMemberships must be used inside MembershipsProvider');
  return ctx;
}
