// src/data/commons/useCommonsMembership.js
// Lightweight check used by the SITE menu (outside the Commons providers) to decide whether
// to show the Commons entry. True when the user belongs to a workspace OR has a pending invite —
// so someone who signed up via an invite link (and was bounced to the site home by the OAuth
// redirect) can still reach /commons to accept it.
// Cached in-memory per session AND in localStorage, so the menu button renders instantly on a
// fresh page load (optimistic) and the real value is revalidated in the background — no pop-in.

import { useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchMyWorkspaces } from './workspaceQueries.js';
import { myPendingInvites } from './memberQueries.js';

const LS_KEY = 'commons:isMember';
let cache = { userId: null, isMember: false };

// Last known answer for this user (memory first, then localStorage), or null if unknown.
function knownFor(userId) {
  if (!userId) return null;
  if (cache.userId === userId) return cache.isMember;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && saved.userId === userId) return saved.isMember;
  } catch { /* ignore unparseable/unavailable storage */ }
  return null;
}

export function useCommonsMembership() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  // Server truth once known, tagged with its user so a stale answer never leaks across a switch.
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (authLoading || !userId) return;
    let cancelled = false;
    (async () => {
      const [list, invites] = await Promise.all([fetchMyWorkspaces(userId), myPendingInvites()]);
      const next = list.length > 0 || invites.length > 0;
      cache = { userId, isMember: next };
      try { localStorage.setItem(LS_KEY, JSON.stringify({ userId, isMember: next })); } catch { /* ignore */ }
      if (!cancelled) setFetched({ userId, isMember: next });
    })();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  if (authLoading || !userId) return false;
  if (fetched && fetched.userId === userId) return fetched.isMember; // revalidated server truth
  return knownFor(userId) ?? false;                                 // optimistic cached answer
}
