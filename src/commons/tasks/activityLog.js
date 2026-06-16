// src/commons/tasks/activityLog.js
// Pure derivation: turns the already-loaded node tree + the node_events rows (+ roster) into the
// "יומן פעילות" view model for a task. No data access here. Layer-aware like snapshot.js: a node's
// activity sub-tree is itself plus its task-descendants ON THE SAME LAYER (a run lists its run items,
// a definition lists its definitions). The viewed node contributes its FULL lifecycle; descendants
// contribute only the deliberate-add and completion events, so a parent's log stays signal, not noise.

// Events a sub-task contributes to its parent's aggregated log (the viewed node shows everything).
const DESCENDANT_TYPES = new Set(['created', 'claimed', 'completed', 'resolved']);

// The node + its same-layer task descendants. Used both to fetch events and to classify them.
export function activitySubtreeIds(nodes, nodeId) {
  const root = nodes.find((n) => n.id === nodeId);
  if (!root) return [];
  const layer = Boolean(root.occurrence_date);
  const byParent = new Map();
  for (const n of nodes) {
    const k = n.parent_id ?? 'root';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(n);
  }
  const ids = [nodeId];
  const walk = (pid) => {
    for (const c of byParent.get(pid) ?? []) {
      if (c.kind !== 'task' || Boolean(c.occurrence_date) !== layer) continue;
      ids.push(c.id);
      walk(c.id);
    }
  };
  walk(nodeId);
  return ids;
}

// Returns { rows, total }. `rows` is newest-first, capped at `max`. Each row:
//   { id, type, at, who, target, detail }  — `target` is the sub-task title (null when it's the
//   viewed node itself), `who` the actor's display name (null = system, e.g. the nightly rollover).
export function buildActivityLog({ nodes, nodeId, events, roster, max = 30 }) {
  const root = nodes.find((n) => n.id === nodeId);
  if (!root) return { rows: [], total: 0 };

  const titleById = new Map(nodes.map((n) => [n.id, n.title]));
  const nameById = new Map((roster ?? []).map((m) => [m.id, m.display_name ?? null]));
  const inScope = new Set(activitySubtreeIds(nodes, nodeId));

  const kept = (events ?? [])
    .filter((e) => inScope.has(e.node_id))
    .filter((e) => (e.node_id === nodeId ? true : DESCENDANT_TYPES.has(e.type)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const rows = kept.slice(0, max).map((e) => ({
    id: e.id,
    type: e.type,
    at: e.created_at,
    who: e.actor ? (nameById.get(e.actor) ?? null) : null,
    target: e.node_id === nodeId ? null : (titleById.get(e.node_id) ?? null),
    detail: e.detail ?? null,
  }));

  return { rows, total: kept.length };
}
