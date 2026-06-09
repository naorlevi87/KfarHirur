// src/data/commons/useCommonsMembership.js
// Lightweight check used by the SITE menu (outside the Commons providers) to decide whether
// to show the Commons entry: does the user belong to at least one workspace? Cached per user.

import { useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchMyWorkspaces } from './workspaceQueries.js';

let cache = { userId: null, isMember: false };

export function useCommonsMembership() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [isMember, setIsMember] = useState(
    userId && cache.userId === userId ? cache.isMember : false
  );

  useEffect(() => {
    if (authLoading || !userId || cache.userId === userId) return;
    let cancelled = false;
    (async () => {
      const list = await fetchMyWorkspaces(userId);
      cache = { userId, isMember: list.length > 0 };
      if (!cancelled) setIsMember(list.length > 0);
    })();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  return authLoading || !userId ? false : isMember;
}
