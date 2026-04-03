// src/data/timeline/useTimelineItems.js
// React hook: fetches timeline items from Supabase, attaches geometry, resolves for current mode.
// Returns { items, loading, error } — items are fully resolved, ready to render.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { evaluateAtDate } from '../../features/timeline/timelinePath.js';
import { fetchTimelineItems } from './timelineQueries.js';
import { resolveTimelineItem } from './resolveTimelineItem.js';

export function useTimelineItems() {
  const { mode } = useAppContext();
  const [rawItems, setRawItems]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTimelineItems()
      .then(data => { if (!cancelled) { setRawItems(data); setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err);   setLoading(false); } });

    return () => { cancelled = true; };
  }, []); // fetch once — items don't change during a session

  // Re-resolve when mode changes (visibility + naor/shay content).
  const items = rawItems
    .map(raw => {
      const geometry = evaluateAtDate(raw.date);
      return resolveTimelineItem(raw, mode, geometry);
    })
    .filter(Boolean); // resolveTimelineItem returns null for visibility-filtered items

  return { items, loading, error };
}
