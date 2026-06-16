// src/commons/commonsState/useNodeActivity.js
// Loads the raw node_events for a task's activity sub-tree (the node + its same-layer descendants).
// Refetches when the sub-tree's state changes — a completion / claim / new sub-task in the loaded
// tree shifts the signature, so the log stays live after an action without manual wiring at each
// call site. Components pass the in-memory `nodes` (from useWorkspaceTree) and never touch Supabase.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSubtreeEvents } from '../../data/commons/eventQueries.js';
import { activitySubtreeIds } from '../tasks/activityLog.js';

export function useNodeActivity(nodes, nodeId) {
  const [events, setEvents] = useState([]);

  const ids = useMemo(() => activitySubtreeIds(nodes, nodeId), [nodes, nodeId]);

  // A signature of the sub-tree's event-producing state: when any of it changes, refetch.
  const signature = useMemo(() => {
    const set = new Set(ids);
    return nodes
      .filter((n) => set.has(n.id))
      .map((n) => `${n.id}:${n.status ?? ''}:${n.owner_id ?? ''}:${n.completed_at ?? ''}`)
      .join('|');
  }, [nodes, ids]);

  const reload = useCallback(async () => {
    setEvents(await fetchSubtreeEvents(ids));
  }, [ids]);

  useEffect(() => {
    let cancelled = false;
    fetchSubtreeEvents(ids).then((rows) => { if (!cancelled) setEvents(rows); });
    return () => { cancelled = true; };
    // signature drives refresh-on-change; ids is derived from the same nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { events, reload };
}
