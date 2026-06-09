// src/commons/workState/WorkspaceContext.jsx
// Resolves the current workspace + the signed-in user's membership & roles.
// "Workspace" is the tenant/org domain object — kept distinct from the Commons module name.
// Increment 1: a single workspace, resolved by a fixed slug. CommonsModule reads this
// context to enforce the loading / no-access gate. Components never see Supabase or RLS.

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import {
  fetchWorkspaceBySlug,
  fetchMyMembership,
  fetchMemberRoles,
} from '../../data/commons/workspaceQueries.js';

// Increment 1 targets the single seeded workspace. Multi-workspace selection comes later.
const WORKSPACE_SLUG = 'joz-ve-loz';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, workspace: null, membership: null, roles: [] });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function resolve() {
      if (!user) {
        if (!cancelled) setState({ loading: false, workspace: null, membership: null, roles: [] });
        return;
      }
      const workspace  = await fetchWorkspaceBySlug(WORKSPACE_SLUG);
      const membership = workspace ? await fetchMyMembership(workspace.id, user.id) : null;
      const roles      = membership ? await fetchMemberRoles(membership.id) : [];
      if (!cancelled) setState({ loading: false, workspace, membership, roles });
    }

    setState(s => ({ ...s, loading: true }));
    resolve();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const value = {
    loading: state.loading,
    workspace: state.workspace,
    membership: state.membership,
    roles: state.roles,
    isMember: !!state.membership,
    permissionLevel: state.membership?.permission_level ?? null,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
