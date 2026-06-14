// src/commons/commonsState/WorkspaceContext.jsx
// Resolves a single workspace (by the slug from the route) + the signed-in user's membership
// & roles for it. "Workspace" is the tenant/org domain object — distinct from the Commons module.
// Resolves independently of MembershipsContext so deep links to /commons/:slug work on their own.
// Components never see Supabase or RLS.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from '../../app/appState/AccountContext.jsx';
import {
  fetchWorkspaceBySlug,
  fetchMyMembership,
  fetchMemberRoles,
} from '../../data/commons/workspaceQueries.js';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ slug, children }) {
  const { user, loading: authLoading } = useAccount();
  const userId = user?.id ?? null;
  const [state, setState] = useState({ loading: true, workspace: null, membership: null, roles: [] });
  const runRef = useRef(0); // newest run wins — a superseded fetch (slug change / refresh) never applies

  // Pure fetch (no setState) so it can be shared by the mount effect and refresh() without tripping
  // the no-setState-in-effect rule.
  const fetchState = useCallback(async () => {
    if (!userId || !slug) return { loading: false, workspace: null, membership: null, roles: [] };
    const workspace  = await fetchWorkspaceBySlug(slug);
    const membership = workspace ? await fetchMyMembership(workspace.id, userId) : null;
    const roles      = membership ? await fetchMemberRoles(membership.id) : [];
    return { loading: false, workspace, membership, roles };
  }, [userId, slug]);

  // Exposed so accepting an invite can re-fetch the now-active membership without a page reload —
  // the provider for this slug resolved while the user wasn't yet a member.
  const refresh = useCallback(async () => {
    const run = ++runRef.current;
    const next = await fetchState();
    if (run === runRef.current) setState(next);
  }, [fetchState]);

  // Key off the user *id*, not the user object: Supabase hands back a fresh user object on every
  // token refresh (e.g. when the tab regains focus). Depending on it would re-flip to "loading" and
  // remount the whole screen — wiping any open dialog. The id only changes on a real sign-in/out.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const run = ++runRef.current;
      const next = await fetchState();
      if (!cancelled && run === runRef.current) setState(next);
    })();
    return () => { cancelled = true; };
  }, [authLoading, fetchState]);

  const value = {
    loading: state.loading,
    workspace: state.workspace,
    membership: state.membership,
    roles: state.roles,
    isMember: !!state.membership,
    permissionLevel: state.membership?.permission_level ?? null,
    refresh,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
