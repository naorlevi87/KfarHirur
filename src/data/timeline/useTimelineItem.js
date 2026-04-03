// src/data/timeline/useTimelineItem.js
// Hook: fetches and resolves a single timeline item by slug.
// Returns { item, loading, error } — item is fully resolved (no geometry).

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { fetchTimelineItemBySlug } from './timelineQueries.js';
import { resolveTimelineItem } from './resolveTimelineItem.js';

export function useTimelineItem(slug) {
  const { mode } = useAppContext();
  const [raw,     setRaw]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTimelineItemBySlug(slug)
      .then(data => { if (!cancelled) { setRaw(data);  setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err); setLoading(false); } });
    return () => { cancelled = true; };
  }, [slug]);

  const item = raw ? resolveTimelineItem(raw, mode, null) : null;

  return { item, loading, error };
}
