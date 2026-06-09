// src/data/commons/useCommonsMembership.js
// Lightweight check used by the SITE menu (outside the Commons providers) to decide whether
// to show the Commons entry: does the user belong to at least one workspace? Cached per user.

import { useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchMyWorkspaces } from './workspaceQueries.js';

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
      const list = await fetchMyWorkspaces(user.id);
      cache = { userId: user.id, isMember: list.length > 0 };
      if (!cancelled) setIsMember(list.length > 0);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return isMember;
}
