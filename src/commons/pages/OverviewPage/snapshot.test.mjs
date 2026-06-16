import assert from 'node:assert/strict';
import { buildSnapshot, buildDay } from './snapshot.js';

// op-day = 08:00→08:00. Pick a fixed "now" inside one op-day.
const now = new Date('2026-06-16T12:00:00');
const today = '2026-06-16';

// roster
const roster = [{ id: 'm1', display_name: 'דנה' }, { id: 'm2', display_name: 'שי' }];

// area container + a one-off leaf done + a one-off leaf open (unclaimed) + an overdue open leaf
const nodes = [
  { id: 'A', kind: 'container', parent_id: null, title: 'מטבח' },
  { id: 't1', kind: 'task', parent_id: 'A', title: 'ניקוי', status: 'done',
    completed_by: 'm1', completed_at: '2026-06-16T11:40:00', completed_late: false },
  { id: 't2', kind: 'task', parent_id: 'A', title: 'מקרר', status: 'open' /* unclaimed */ },
  { id: 't3', kind: 'task', parent_id: 'A', title: 'עגבניות', status: 'open',
    due_date: '2026-06-16T11:00:00', owner_id: 'm2' },
];

const s = buildSnapshot({ nodes, roster, now, scopeAreaId: null });

// progress: 1 of 3 leaves done
assert.equal(s.progress.doneLeaves, 1);
assert.equal(s.progress.totalLeaves, 3);
assert.ok(Math.abs(s.progress.fraction - 1 / 3) < 1e-9);

// free = unclaimed open leaf (t2)
assert.deepEqual(s.free.map((n) => n.id), ['t2']);

// stuck = overdue open leaf (t3, due 11:00 < now 12:00)
assert.deepEqual(s.stuck.map((n) => n.id), ['t3']);

// recent = the completion, with resolved doer name
assert.equal(s.recent.length, 1);
assert.equal(s.recent[0].id, 't1');
assert.equal(s.recent[0].doer, 'דנה');
assert.equal(s.recent[0].late, false);

// not closed (only 1/3)
assert.equal(s.closedToday, false);

// scoping to a non-existent area yields empty progress
const empty = buildSnapshot({ nodes, roster, now, scopeAreaId: 'ZZZ' });
assert.equal(empty.progress.totalLeaves, 0);

// buildDay: the one-off with a due on that op-day is the only day-leaf (t1/t2 have no due → not tied to a day)
const day = buildDay({ nodes, roster, dayStr: today });
assert.deepEqual(day.toHandle.map((x) => x.id), ['t3']);
assert.equal(day.done.length, 0);
assert.equal(day.progress.totalLeaves, 1);

// pulse: classify the open leaves into the three states, grouped (standalone here — no task parents)
assert.equal(s.pulse.free.length, 1);
assert.equal(s.pulse.free[0].isParent, false);
assert.equal(s.pulse.free[0].items[0].id, 't2');
assert.equal(s.pulse.overdue.length, 1);
assert.equal(s.pulse.overdue[0].items[0].id, 't3');
assert.equal(s.pulse.inProgress.length, 0);

// pulse grouping under a parent task: one collapsible group, parent progress = whole parent, only the
// matching (free) child inside.
const pNodes = [
  { id: 'A', kind: 'container', parent_id: null, title: 'מטבח' },
  { id: 'P', kind: 'task', parent_id: 'A', title: 'סגירת יום' },
  { id: 'c1', kind: 'task', parent_id: 'P', title: 'כיבוי', status: 'open' },
  { id: 'c2', kind: 'task', parent_id: 'P', title: 'ניקוי', status: 'done' },
];
const ps = buildSnapshot({ nodes: pNodes, roster, now, scopeAreaId: null });
assert.equal(ps.pulse.free.length, 1);
assert.equal(ps.pulse.free[0].isParent, true);
assert.equal(ps.pulse.free[0].id, 'P');
assert.deepEqual(ps.pulse.free[0].items.map((x) => x.id), ['c1']);
assert.deepEqual(ps.pulse.free[0].progress, { done: 1, total: 2 });

// relevance window: an item with show_from in the future is hidden from the pulse (notYet), one that's
// already past its show_from shows normally. now = 12:00 on the op-day.
const rNodes = [
  { id: 'A', kind: 'container', parent_id: null, title: 'מטבח' },
  { id: 'r1', kind: 'task', parent_id: 'A', title: 'דגים', status: 'open', show_from: '21:00:00' }, // not yet
  { id: 'r2', kind: 'task', parent_id: 'A', title: 'לחם', status: 'open', show_from: '09:00:00' },  // already relevant
];
const rs = buildSnapshot({ nodes: rNodes, roster, now, scopeAreaId: null });
assert.equal(rs.pulse.notYet, 1);
assert.deepEqual(rs.pulse.free.flatMap((g) => g.items.map((i) => i.id)), ['r2']);

console.log('snapshot.test.mjs OK');
