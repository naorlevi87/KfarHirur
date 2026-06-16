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
function dueAt(node) {
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
      if (n.start_date && n.start_date > todayStr && n.status !== 'done') continue; // future start
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

  // free = open + unclaimed (carries due ISO + minsLeft for the "עד" chip + urgency tiers).
  // stuck = overdue (past its time today) or missed (past op-day) — carries overdueMins for "waiting since".
  const free = [];
  const stuck = [];
  for (const n of leaves) {
    if (n.status === 'done') continue;
    if (!isOpen(n) && n.status !== 'missed') continue;
    const due = dueAt(n);
    const overdue = (isOpen(n) && due && due.getTime() < now.getTime()) || n.status === 'missed';
    if (overdue) {
      stuck.push({ ...n, due: due ? due.toISOString() : null,
        overdueMins: due ? Math.max(0, Math.round((now.getTime() - due.getTime()) / 60000)) : null });
      continue;
    }
    if (isOpen(n) && !effectiveOwner(n)) {
      free.push({ ...n, due: due ? due.toISOString() : null,
        minsLeft: due ? Math.round((due.getTime() - now.getTime()) / 60000) : null });
    }
  }

  // Full list (the "רשימה"): every leaf, done + open, with status / due / who. Not-done first, done last.
  const nameOf = (id) => rosterById.get(id)?.display_name ?? null;
  const list = leaves
    .map((n) => {
      const due = dueAt(n);
      return {
        id: n.id, title: n.title, status: n.status,
        due: due ? due.toISOString() : null,
        doer: n.status === 'done' ? nameOf(n.completed_by) : null,
        late: Boolean(n.completed_late),
      };
    })
    .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));

  const recent = nodes
    .filter((n) => n.kind === 'task' && n.status === 'done' && n.completed_at && inScope(n))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 4)
    .map((n) => ({
      id: n.id, title: n.title, at: n.completed_at,
      late: Boolean(n.completed_late), doer: nameOf(n.completed_by),
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
    free, stuck, recent, week, list,
    closedToday: totalLeaves > 0 && doneLeaves === totalLeaves,
  };
}

// One specific op-day (the "בימים האחרונים" drill-in): that day's leaves split into done + toHandle,
// with completion attribution. Same leaf rules as buildSnapshot, keyed to dayStr instead of "today".
export function buildDay({ nodes, roster, dayStr }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map();
  for (const n of nodes) {
    const k = n.parent_id ?? 'root';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(n);
  }
  const rosterById = new Map((roster ?? []).map((m) => [m.id, m]));
  const taskChildren = (id, inst) =>
    (byParent.get(id) ?? []).filter((c) => c.kind === 'task' && Boolean(c.occurrence_date) === inst);
  const hasRecurringAncestor = (n) => {
    let c = byId.get(n.parent_id);
    while (c) { if (c.recurrence) return true; c = byId.get(c.parent_id); }
    return false;
  };

  const leaves = nodes.filter((n) => {
    if (n.kind !== 'task') return false;
    if (n.occurrence_date) return n.occurrence_date === dayStr && !taskChildren(n.id, true).length;
    if (n.recurrence || hasRecurringAncestor(n)) return false;
    if (taskChildren(n.id, false).length) return false;
    return n.due_date ? ymd(opDayStartFor(new Date(n.due_date))) === dayStr : false;
  });

  const nameOf = (id) => rosterById.get(id)?.display_name ?? null;
  const toView = (n) => {
    const due = n.due_date ? new Date(n.due_date)
      : (n.due_time && n.occurrence_date ? new Date(`${n.occurrence_date}T${n.due_time}`) : null);
    return {
      id: n.id, title: n.title, status: n.status,
      due: due ? due.toISOString() : null,
      doer: n.status === 'done' ? nameOf(n.completed_by) : null,
      late: Boolean(n.completed_late),
    };
  };
  const done = leaves.filter((n) => n.status === 'done').map(toView);
  const toHandle = leaves.filter((n) => n.status !== 'done').map(toView);
  const total = leaves.length;
  return {
    dayStr,
    progress: { doneLeaves: done.length, totalLeaves: total, fraction: total ? done.length / total : 0 },
    done, toHandle,
  };
}
