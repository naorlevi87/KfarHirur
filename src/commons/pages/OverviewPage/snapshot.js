// src/commons/pages/OverviewPage/snapshot.js
// Pure derivation: turns the already-loaded node tree (+ roster) into the "מה קורה היום?" view model.
// No data access here — the page passes in tree.nodes and the roster. All "today / overdue" math goes
// through opDay.js (operational day = 08:00→08:00). Layer-aware: counts leaf tasks in their own layer
// (run items + actionable one-offs), never routine definitions or run roots.

import { currentOpDayStart, opDayStartFor } from '../../opDay.js';

const ymd = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const isOpen = (n) => n.status === 'open' || n.status === 'in_progress';

// The moment an item is "due": one-offs carry due_date; run items may carry due_date or a due_time
// applied to their op-day. Returns a Date or null.
function dueAt(node, opDayStartDate) {
  if (node.due_date) return new Date(node.due_date);
  if (node.due_time && node.occurrence_date) {
    return new Date(`${node.occurrence_date}T${node.due_time}`);
  }
  return null;
}

export function buildSnapshot({ nodes, roster, now = new Date(), scopeAreaId = null }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map();
  for (const n of nodes) {
    const k = n.parent_id ?? 'root';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(n);
  }
  const rosterById = new Map((roster ?? []).map((m) => [m.id, m]));
  const opStart = currentOpDayStart(now);
  const todayStr = ymd(opStart);

  // Top-level area container for a node: walk parent_id until the child of root.
  const areaOf = (node) => {
    let cur = node;
    while (cur && cur.parent_id && byId.has(cur.parent_id)) cur = byId.get(cur.parent_id);
    return cur && cur.kind === 'container' ? cur.id : (cur ? cur.id : null);
  };
  const inScope = (node) => scopeAreaId == null || areaOf(node) === scopeAreaId;

  const hasRecurringAncestor = (n) => {
    let c = byId.get(n.parent_id);
    while (c) { if (c.recurrence) return true; c = byId.get(c.parent_id); }
    return false;
  };
  const taskChildren = (id, instanceLayer) =>
    (byParent.get(id) ?? []).filter((c) => c.kind === 'task' && Boolean(c.occurrence_date) === instanceLayer);

  // Today's leaves = instance leaves dated today + actionable one-off leaves (no recurring ancestor).
  const leaves = [];
  for (const n of nodes) {
    if (n.kind !== 'task') continue;
    const instance = Boolean(n.occurrence_date);
    if (instance) {
      if (n.occurrence_date !== todayStr) continue;
      if (taskChildren(n.id, true).length) continue;            // not a leaf
    } else {
      if (n.recurrence) continue;                                // routine root
      if (hasRecurringAncestor(n)) continue;                     // routine definition item
      if (taskChildren(n.id, false).length) continue;            // parent, not a leaf
      // actionable today: no future start_date
      if (n.start_date && n.start_date > todayStr && n.status !== 'done') continue;
    }
    if (!inScope(n)) continue;
    leaves.push(n);
  }

  const doneLeaves = leaves.filter((n) => n.status === 'done').length;
  const totalLeaves = leaves.length;
  const fraction = totalLeaves ? doneLeaves / totalLeaves : 0;

  const effectiveOwner = (node) => {
    let cur = node;
    while (cur) { if (cur.owner_id) return cur.owner_id; cur = byId.get(cur.parent_id); }
    return null;
  };

  const APPROACH_MS = 90 * 60 * 1000;
  const approaching = [];
  const free = [];
  const stuck = [];
  for (const n of leaves) {
    if (!isOpen(n) && n.status !== 'missed') continue;
    const due = dueAt(n, opStart);
    const overdue = (isOpen(n) && due && due.getTime() < now.getTime()) || n.status === 'missed';
    if (overdue) { stuck.push(n); continue; }
    if (isOpen(n) && !effectiveOwner(n)) free.push(n);
    if (isOpen(n) && due && due.getTime() - now.getTime() <= APPROACH_MS) approaching.push(n);
  }

  const recent = nodes
    .filter((n) => n.kind === 'task' && n.status === 'done' && n.completed_at && inScope(n))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 4)
    .map((n) => ({
      id: n.id,
      title: n.title,
      at: n.completed_at,
      late: Boolean(n.completed_late),
      doer: rosterById.get(n.completed_by)?.name ?? null,
    }));

  // 7-day week: completion fraction per op-day (instance leaves dated that day).
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = opDayStartFor(new Date(opStart.getTime() - i * 24 * 3600 * 1000));
    const dayStr = ymd(dayStart);
    const dayLeaves = nodes.filter((n) =>
      n.kind === 'task' && n.occurrence_date === dayStr && !taskChildren(n.id, true).length && inScope(n));
    const dn = dayLeaves.filter((n) => n.status === 'done').length;
    week.push({ date: dayStr, fraction: dayLeaves.length ? dn / dayLeaves.length : 0, isToday: dayStr === todayStr });
  }

  return {
    progress: { doneLeaves, totalLeaves, fraction },
    approaching, free, stuck, recent, week,
    closedToday: totalLeaves > 0 && doneLeaves === totalLeaves,
  };
}
