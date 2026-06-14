// src/commons/commonsState/MembershipsContext.jsx
// Resolves the full set of workspaces the signed-in user is an active member of.
// Drives the picker (/commons) and the top-bar switcher. Components read useMemberships(),
// never Supabase. Scoped above the per-workspace WorkspaceContext.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from '../../app/appState/AccountContext.jsx';
import { fetchMyWorkspaces } from '../../data/commons/workspaceQueries.js';

const MembershipsContext = createContext(null);

export function MembershipsProvider({ children }) {
  const { user, loading: authLoading } = useAccount();
  const userId = user?.id ?? null;
  const [state, setState] = useState({ loading: true, workspaces: [] });
  const runRef = useRef(0); // newest run wins — a superseded fetch never applies

  const fetchWorkspaces = useCallback(() => (userId ? fetchMyWorkspaces(userId) : Promise.resolve([])), [userId]);

  // Exposed as refresh() so accepting an invite can pick up the new workspace without a reload.
  const refresh = useCallback(async () => {
    const run = ++runRef.current;
    const workspaces = await fetchWorkspaces();
    if (run === runRef.current) setState({ loading: false, workspaces });
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const run = ++runRef.current;
      const workspaces = await fetchWorkspaces();
      if (!cancelled && run === runRef.current) setState({ loading: false, workspaces });
    })();
    return () => { cancelled = true; };
  }, [authLoading, fetchWorkspaces]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);

  return <MembershipsContext.Provider value={value}>{children}</MembershipsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMemberships() {
  const ctx = useContext(MembershipsContext);
  if (!ctx) throw new Error('useMemberships must be used inside MembershipsProvider');
  return ctx;
}
