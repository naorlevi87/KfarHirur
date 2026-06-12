// src/commons/commonsState/WorkspaceContext.jsx
// Resolves a single workspace (by the slug from the route) + the signed-in user's membership
// & roles for it. "Workspace" is the tenant/org domain object — distinct from the Commons module.
// Resolves independently of MembershipsContext so deep links to /commons/:slug work on their own.
// Components never see Supabase or RLS.

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import {
  fetchWorkspaceBySlug,
  fetchMyMembership,
  fetchMemberRoles,
} from '../../data/commons/workspaceQueries.js';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ slug, children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState({ loading: true, workspace: null, membership: null, roles: [] });

  // Key off the user *id*, not the user object: Supabase hands back a fresh user object on every
  // token refresh (e.g. when the tab regains focus). Depending on it would re-flip to "loading" and
  // remount the whole screen — wiping any open dialog. The id only changes on a real sign-in/out.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function resolve() {
      if (!cancelled) setState(s => ({ ...s, loading: true }));
      if (!userId || !slug) {
        if (!cancelled) setState({ loading: false, workspace: null, membership: null, roles: [] });
        return;
      }
      const workspace  = await fetchWorkspaceBySlug(slug);
      const membership = workspace ? await fetchMyMembership(workspace.id, userId) : null;
      const roles      = membership ? await fetchMemberRoles(membership.id) : [];
      if (!cancelled) setState({ loading: false, workspace, membership, roles });
    }

    resolve();
    return () => { cancelled = true; };
  }, [userId, authLoading, slug]);

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
