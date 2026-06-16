import assert from 'node:assert/strict';
import { buildSnapshot } from './snapshot.js';

// op-day = 08:00→08:00. Pick a fixed "now" inside one op-day.
const now = new Date('2026-06-16T12:00:00');
const today = '2026-06-16';

// roster
const roster = [{ id: 'm1', name: 'דנה' }, { id: 'm2', name: 'שי' }];

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

console.log('snapshot.test.mjs OK');
