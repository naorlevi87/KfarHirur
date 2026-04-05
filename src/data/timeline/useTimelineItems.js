// src/data/timeline/useTimelineItems.js
// React hook: fetches timeline items from Supabase, attaches geometry, resolves for current mode.
// Returns { items, loading, error } — items are fully resolved, ready to render.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { evaluateAtDate } from '../../features/timeline/timelinePath.js';
import { fetchTimelineItems } from './timelineQueries.js';
import { resolveTimelineItem } from './resolveTimelineItem.js';

// Module-level cache — survives remounts within the same session.
let cachedRaw = null;
let cacheError = null;

export function useTimelineItems() {
  const { mode } = useAppContext();
  const [rawItems, setRawItems] = useState(() => cachedRaw ?? []);
  const [loading,  setLoading]  = useState(cachedRaw === null);
  const [error,    setError]    = useState(cacheError);

  useEffect(() => {
    if (cachedRaw !== null) return; // already cached — skip fetch
    let cancelled = false;
    fetchTimelineItems()
      .then(data => {
        if (!cancelled) {
          cachedRaw = data;
          setRawItems(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          cacheError = err;
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Re-resolve when mode changes (visibility + naor/shay content).
  const items = rawItems
    .map(raw => {
      const geometry = evaluateAtDate(raw.date);
      return resolveTimelineItem(raw, mode, geometry);
    })
    .filter(Boolean); // resolveTimelineItem returns null for visibility-filtered items

  return { items, loading, error };
}
