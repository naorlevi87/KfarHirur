// src/data/commons/useCommonsMembership.js
// Lightweight check used by the SITE menu (outside the WorkspaceProvider) to decide
// whether to show the Commons entry. Caches the result per user for the session.

import { useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchWorkspaceBySlug, fetchMyMembership } from './workspaceQueries.js';

const WORKSPACE_SLUG = 'joz-ve-loz';
let cache = { userId: null, isMember: false };

export function useCommonsMembership() {
  const { user, loading: authLoading } = useAuth();
  const [isMember, setIsMember] = useState(
    user && cache.userId === user.id ? cache.isMember : false
  );

  useEffect(() => {
    if (authLoading || !user) { setIsMember(false); return; }
    if (cache.userId === user.id) { setIsMember(cache.isMember); return; }

    let cancelled = false;
    (async () => {
      const ws = await fetchWorkspaceBySlug(WORKSPACE_SLUG);
      const m  = ws ? await fetchMyMembership(ws.id, user.id) : null;
      cache = { userId: user.id, isMember: !!m };
      if (!cancelled) setIsMember(!!m);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return isMember;
}
