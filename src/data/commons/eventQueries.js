// src/data/commons/eventQueries.js
// Reads for the per-node "יומן פעילות" activity log. Events are written only by a database trigger
// (commons.log_node_event) — there is no write path here by design; the log is immutable. The data
// source (Supabase commons schema, RLS-gated to workspace members) stays hidden behind this function.

import { commonsDb } from './commonsClient.js';

const EVENT_FIELDS = 'id, node_id, type, actor, detail, created_at';

// Events for a set of node ids (a task + its sub-tree), newest first. Empty input → no query.
export async function fetchSubtreeEvents(nodeIds) {
  if (!nodeIds?.length) return [];
  const { data, error } = await commonsDb
    .from('node_events')
    .select(EVENT_FIELDS)
    .in('node_id', nodeIds)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}
