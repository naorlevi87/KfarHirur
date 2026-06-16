# Commons תמונת מצב (Snapshot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Commons `תמונת מצב` tab as a communal "מה קורה היום?" view — a spectrum completion ring + invitation-framed sections — derived entirely from data already in memory.

**Architecture:** A pure derivation helper (`snapshot.js`) turns the already-loaded node tree + roster into a view model; a pure colour helper (`spectrum.js`) maps a completion fraction to a banded-spectrum conic gradient. `OverviewPage.jsx` composes presentational pieces (ring, area-lens, time sections, credit log, week strip, hidden a11y list) and wires the few actions to **existing** occurrence ops. No new data-layer queries.

**Tech Stack:** React 19, `motion/react` (springs), CSS custom properties (commons tokens), `node:assert` for unit tests of pure logic (no test framework added). Run node/npm via the Windows PATH workaround (see below).

---

## Conventions for every task

- **Windows/Hebrew-path rule (CLAUDE.md):** never use Bash for file ops — use Read/Write/Edit/Glob/Grep. Run tooling via:
  - lint: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`
  - build: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
  - node test file: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" <path-to>.test.mjs`
- **Git rule (CLAUDE.md):** never commit without the user seeing it in the browser first. Treat each task's commit step as a **local checkpoint on a feature branch**; do **not** push/merge. Before committing the UI tasks (Tasks 4–11), pause at the **browser-review checkpoint (Task 13)** — the user approves the running screen, then the commits stand. If executing inline, you may stage commits but hold final approval until Task 13.
- **Branch:** work on `feat/commons-snapshot` (not `main`).
- **No hardcoded colours/strings** — colours via tokens in `commons-tokens.css`; all UI copy via `src/content/commons/{he,en}/commonsShell.content.js`.
- **The word "ביחד" is banned from UI copy** (convey togetherness via "we" framing).

## File structure (created / modified)

- Create: `src/commons/styles/spectrum.js` — pure `fraction → { hex, conic }` helpers.
- Create: `src/commons/styles/spectrum.test.mjs` — node tests for the above.
- Modify: `src/commons/styles/commons-tokens.css` — spectrum stop tokens.
- Create: `src/commons/pages/OverviewPage/snapshot.js` — pure `buildSnapshot()` view-model.
- Create: `src/commons/pages/OverviewPage/snapshot.test.mjs` — node tests for `buildSnapshot()`.
- Create: `src/commons/pages/OverviewPage/SnapshotRing.jsx` — the spectrum ring (presentational).
- Create: `src/commons/pages/OverviewPage/AreaLens.jsx` — scope pills.
- Create: `src/commons/pages/OverviewPage/SnapshotSections.jsx` — approaching / free / stuck lists + actions.
- Create: `src/commons/pages/OverviewPage/RecentStrip.jsx` — לאחרונה credit log + celebration banner.
- Create: `src/commons/pages/OverviewPage/WeekStrip.jsx` — rainbow 7-day.
- Create: `src/commons/pages/OverviewPage/SnapshotList.jsx` — hidden accessible list + רשימה toggle.
- Modify: `src/commons/pages/OverviewPage/OverviewPage.jsx` — compose everything.
- Modify: `src/commons/pages/OverviewPage/overview.css` — rewrite styles.
- Modify: `src/content/commons/{he,en}/commonsShell.content.js` — extend `snapshot.*`.
- Modify: `docs/commons-standards.md` — record the new copy + spectrum/credit standards.
- Modify: `src/commons/COMMONS.md` — status line (done at end).

---

## Task 0: Branch

- [ ] **Step 1: Create the feature branch**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && git checkout -b feat/commons-snapshot`
Expected: `Switched to a new branch 'feat/commons-snapshot'`

---

## Task 1: Spectrum colour helper + tokens

**Files:**
- Create: `src/commons/styles/spectrum.js`
- Create: `src/commons/styles/spectrum.test.mjs`
- Modify: `src/commons/styles/commons-tokens.css`

- [ ] **Step 1: Write the failing test**

Create `src/commons/styles/spectrum.test.mjs`:

```js
import assert from 'node:assert/strict';
import { spectrumHex, spectrumConic, SPECTRUM } from './spectrum.js';

// 6 banded stops, red → purple
assert.equal(SPECTRUM.length, 6);
assert.equal(SPECTRUM[0], '#ff5a5a');
assert.equal(SPECTRUM[5], '#9a6bff');

// fraction clamps to [0,1]
assert.equal(spectrumHex(-1), SPECTRUM[0]);
assert.equal(spectrumHex(2), SPECTRUM[5]);
// 0 → red, 1 → purple, 0.5 → a middle band (green-ish, index 2 or 3)
assert.equal(spectrumHex(0), '#ff5a5a');
assert.equal(spectrumHex(1), '#9a6bff');

// partial conic: filled portion ends at the fraction, rest transparent
const partial = spectrumConic(0.76);
assert.ok(partial.includes('transparent 76%'), 'partial ends in transparent at the fraction');
assert.ok(partial.startsWith('conic-gradient('));

// full conic: closes the wheel through magenta back to red, no transparent
const full = spectrumConic(1);
assert.ok(full.includes('#e85ac0'), 'full ring bridges through magenta');
assert.ok(!full.includes('transparent'), 'full ring has no gap');

console.log('spectrum.test.mjs OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" src/commons/styles/spectrum.test.mjs`
Expected: FAIL — `Cannot find module './spectrum.js'`.

- [ ] **Step 3: Implement `spectrum.js`**

Create `src/commons/styles/spectrum.js`:

```js
// src/commons/styles/spectrum.js
// Maps a completion fraction (0..1) to the Commons progress spectrum: red → orange → yellow →
// green → blue → purple, closing through magenta back to red at 100%. Pure; used by the snapshot
// ring and the week strip. Keep the stops in sync with the --commons-spectrum-* tokens.

export const SPECTRUM = ['#ff5a5a', '#ff9a3d', '#ffce4d', '#5cd66e', '#46c0ff', '#9a6bff'];
const MAGENTA = '#e85ac0';

const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

// The hue that "leads" at a given fraction — the colour of the leading edge / glow / cap.
export function spectrumHex(fraction) {
  const f = clamp(fraction);
  const idx = Math.min(SPECTRUM.length - 1, Math.floor(f * SPECTRUM.length));
  return SPECTRUM[idx];
}

// A banded conic-gradient string. Each colour holds a plateau; transitions are short.
// fraction < 1 → fill ends at the fraction, remainder transparent (track shows through).
// fraction === 1 → closed wheel: purple → magenta → red at the seam.
export function spectrumConic(fraction) {
  const f = clamp(fraction);
  if (f >= 1) {
    return 'conic-gradient(' +
      '#ff5a5a 2% 12%, #ff9a3d 19% 29%, #ffce4d 36% 45%, ' +
      '#5cd66e 52% 61%, #46c0ff 68% 77%, #9a6bff 84% 90%, ' +
      `${MAGENTA} 96%, #ff5a5a 100%)`;
  }
  const pct = Math.round(f * 100);
  // Compress the 6 plateaus into the filled arc [0, pct], then go transparent.
  const stops = SPECTRUM.map((c, i) => {
    const a = Math.round((i / SPECTRUM.length) * pct);
    const b = Math.round(((i + 0.65) / SPECTRUM.length) * pct);
    return `${c} ${a}% ${b}%`;
  });
  return `conic-gradient(${stops.join(', ')}, ${spectrumHex(f)} ${pct}%, transparent ${pct}%)`;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" src/commons/styles/spectrum.test.mjs`
Expected: `spectrum.test.mjs OK`

- [ ] **Step 5: Add tokens to `commons-tokens.css`**

In `src/commons/styles/commons-tokens.css`, inside the `.commons-root, .commons-sheetRoot { … }` block (after `--commons-radius:`), add:

```css
  /* Progress spectrum (keep in sync with src/commons/styles/spectrum.js) */
  --commons-spectrum-1: #ff5a5a; /* red    — just starting */
  --commons-spectrum-2: #ff9a3d; /* orange */
  --commons-spectrum-3: #ffce4d; /* yellow */
  --commons-spectrum-4: #5cd66e; /* green  */
  --commons-spectrum-5: #46c0ff; /* blue   */
  --commons-spectrum-6: #9a6bff; /* purple — closed */
  --commons-spectrum-bridge: #e85ac0; /* magenta — closes the wheel */
  --commons-ring-track: #14161f;
```

- [ ] **Step 6: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/styles/spectrum.js src/commons/styles/spectrum.test.mjs src/commons/styles/commons-tokens.css && git commit -m "feat(commons): spectrum colour helper + tokens for the snapshot ring"
```

---

## Task 2: `snapshot.js` derivation helper

**Files:**
- Create: `src/commons/pages/OverviewPage/snapshot.js`
- Create: `src/commons/pages/OverviewPage/snapshot.test.mjs`

> Reuses op-day math from `src/commons/opDay.js`. `buildSnapshot` is pure: it takes raw `nodes`, a
> `roster` array (`[{id, name}]`), `now`, and an optional `scopeAreaId`, and returns the view model.

- [ ] **Step 1: Write the failing test**

Create `src/commons/pages/OverviewPage/snapshot.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" src/commons/pages/OverviewPage/snapshot.test.mjs`
Expected: FAIL — `Cannot find module './snapshot.js'`.

- [ ] **Step 3: Implement `snapshot.js`**

Create `src/commons/pages/OverviewPage/snapshot.js`:

```js
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
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" src/commons/pages/OverviewPage/snapshot.test.mjs`
Expected: `snapshot.test.mjs OK`

- [ ] **Step 5: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/snapshot.js src/commons/pages/OverviewPage/snapshot.test.mjs && git commit -m "feat(commons): pure snapshot view-model derivation + tests"
```

> **Build-time verification note:** instance due fields (`due_date` vs `due_time`+`occurrence_date`) are
> handled both ways in `dueAt`. Confirm against the real seeded routine in the browser at Task 13; adjust
> `dueAt` only if live data shows a third shape.

---

## Task 3: Content keys (he + en)

**Files:**
- Modify: `src/content/commons/he/commonsShell.content.js`
- Modify: `src/content/commons/en/commonsShell.content.js`

- [ ] **Step 1: Replace the `snapshot` block in `he/commonsShell.content.js`**

Find the existing `snapshot: { … }` object and replace it with:

```js
  snapshot: {
    heading: 'מה קורה היום?',
    center: 'מה מצבנו?',
    countOf: 'מתוך',                 // "14 מתוך 19"
    scopeAll: 'הכל',
    approaching: 'תכף נגמר הזמן',
    free: 'פנוי — מי לוקח?',
    stuck: 'נתקע קצת — מי תופס?',
    recent: 'לאחרונה',
    fullLog: 'כל היומן ←',
    week: 'השבוע',
    listToggle: 'רשימה',
    empty: 'עוד אין מה להציג כאן.',
    // actions (reuse occurrence ops)
    claim: 'עליי 🙌',
    didHappen: 'זה כן קרה 🫢',
    deferTomorrow: 'דחה למחר 🙆',
    deferDate: 'תאריך אחר 📅',
    skip: 'לא צריך 🤷',
    // credit-line flavour (emoji decorative; meaning in the words)
    creditOnTime: 'בזמן, אלוף 😇',
    creditSmooth: 'חלק כרגיל 😎',
    creditLate: 'באיחור — אבל הציל/ה 🫢',
    creditClaim: 'יוזמה 🙌',
    closedTitle: 'סגרתם את כל היום!',
    closedBody: 'איזה צוות 🌈🎉',
    // living-line templates: {done},{left},{free} interpolated by the page
    lineMorning: 'בוקר. {left} דברים מחכים. אין לחץ — נתחיל.',
    lineMidday: '{done} כבר קרו. נשארו {left} — {free} פנויים. מי לוקח?',
    lineEvening: 'כמעט. נשארו {left} — מי סוגר?',
    lineHardDay: 'יום עמוס — כמה דברים נתקעו. שווה מבט?',
    lineAllDone: 'הכל סגור. כל הכבוד 🌈',
    timeLeftMin: 'עוד {n} דק׳',
    noOwner: 'אין אחראי',
  },
```

- [ ] **Step 2: Replace the `snapshot` block in `en/commonsShell.content.js`**

Mirror the keys in English (scaffold; not user-facing yet). Use the same keys with English values, e.g. `heading: "What's happening today?"`, `center: 'Where are we?'`, `countOf: 'of'`, `scopeAll: 'All'`, `approaching: 'Time almost up'`, `free: 'Free — who takes it?'`, `stuck: 'Stuck — who grabs it?'`, `recent: 'Lately'`, `fullLog: 'Full log →'`, `week: 'This week'`, `listToggle: 'List'`, `claim: 'On me 🙌'`, `didHappen: 'It did happen 🫢'`, `deferTomorrow: 'Push to tomorrow 🙆'`, `deferDate: 'Another day 📅'`, `skip: 'Not needed 🤷'`, plus the credit/line/closed keys translated 1:1.

- [ ] **Step 3: Verify keys load (lint)**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`
Expected: no new errors in the two content files.

- [ ] **Step 4: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/content/commons/he/commonsShell.content.js src/content/commons/en/commonsShell.content.js && git commit -m "feat(commons): snapshot content keys (he + en scaffold)"
```

---

## Task 4: `SnapshotRing.jsx`

**Files:**
- Create: `src/commons/pages/OverviewPage/SnapshotRing.jsx`

- [ ] **Step 1: Implement the ring**

```jsx
// src/commons/pages/OverviewPage/SnapshotRing.jsx
// The completion ring: a banded-spectrum arc (colour = progress), glass centre, soft glow, rounded
// caps. No % digit — centre shows "מה מצבנו?" + the leaf count. Colour reinforces; the count carries
// the meaning (IS 5568). Honours prefers-reduced-motion.

import { motion, useReducedMotion } from 'motion/react';
import { spectrumConic, spectrumHex } from '../../styles/spectrum.js';

export function SnapshotRing({ fraction, done, total, centerLabel, countOf }) {
  const reduce = useReducedMotion();
  const hue = spectrumHex(fraction);
  const conic = spectrumConic(fraction);
  return (
    <div className="commons-ring" style={{ filter: `drop-shadow(0 0 14px ${hue}55)` }}>
      <div className="commons-ring__track" />
      <motion.div
        className="commons-ring__arc"
        style={{ background: conic }}
        initial={reduce ? false : { opacity: 0.4, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      />
      <div className="commons-ring__glass" />
      <div className="commons-ring__center" role="img"
           aria-label={`${centerLabel} ${done} ${countOf} ${total}`}>
        <span className="commons-ring__sub">{centerLabel}</span>
        <span className="commons-ring__count">{done} {countOf} {total}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds (component compiles; not yet rendered).

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/SnapshotRing.jsx && git commit -m "feat(commons): snapshot spectrum ring component"
```

---

## Task 5: `AreaLens.jsx`

**Files:**
- Create: `src/commons/pages/OverviewPage/AreaLens.jsx`

- [ ] **Step 1: Implement the scope pills**

```jsx
// src/commons/pages/OverviewPage/AreaLens.jsx
// Scope row: "הכל" + one pill per root area. Equal pills, fixed order (never sorted by progress) — a
// lens, not a leaderboard. Controlled: parent owns the selected id (null = all).

export function AreaLens({ areas, value, onChange, allLabel }) {
  if (!areas.length) return null;
  const Pill = ({ id, label }) => (
    <button
      type="button"
      className={`commons-lensPill${value === id ? ' is-on' : ''}`}
      aria-pressed={value === id}
      onClick={() => onChange(id)}
    >
      {label}
    </button>
  );
  return (
    <div className="commons-lens" role="group" aria-label={allLabel}>
      <Pill id={null} label={allLabel} />
      {areas.map((a) => <Pill key={a.id} id={a.id} label={a.title} />)}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/AreaLens.jsx && git commit -m "feat(commons): area-lens scope pills"
```

---

## Task 6: `SnapshotSections.jsx` (approaching / free / stuck + actions)

**Files:**
- Create: `src/commons/pages/OverviewPage/SnapshotSections.jsx`

> Wires to existing `tree` actions from `useWorkspaceTree`: `claim`, `resolveMissed`, `deferOccurrence`.
> Defer/skip are manager+ — gate with `canManage`. Tapping a title opens the item (`onOpen`).

- [ ] **Step 1: Implement the sections**

```jsx
// src/commons/pages/OverviewPage/SnapshotSections.jsx
// The three invitation-framed, time-aware lists. Actions reuse existing occurrence ops — no new
// mutations. "פנוי" → claim; "נתקע" → claim / resolve-missed / defer / skip (defer & skip manager+).

import { motion } from 'motion/react';

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

function Section({ label, children }) {
  return (
    <section className="commons-snapSection">
      <h2 className="commons-snapSection__label">{label}</h2>
      <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
        {children}
      </motion.ul>
    </section>
  );
}

export function SnapshotSections({ s, t, canManage, onOpen, onClaim, onResolve, onDefer, onSkip, anchorRef }) {
  const minsTo = (due) => Math.max(0, Math.round((new Date(due).getTime() - Date.now()) / 60000));

  return (
    <>
      {s.approaching.length > 0 && (
        <Section label={t.approaching}>
          {s.approaching.map((n) => (
            <motion.li key={n.id} className="commons-snapRow" variants={rowV}>
              <span className="commons-snapDot is-soon" aria-hidden="true" />
              <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
              {n.due_date && <span className="commons-snapRow__meta">{t.timeLeftMin.replace('{n}', minsTo(n.due_date))}</span>}
            </motion.li>
          ))}
        </Section>
      )}

      {s.free.length > 0 && (
        <section ref={anchorRef} className="commons-snapSection is-free">
          <h2 className="commons-snapSection__label">{t.free}</h2>
          <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
            {s.free.map((n) => (
              <motion.li key={n.id} className="commons-snapRow" variants={rowV}>
                <span className="commons-snapDot is-free" aria-hidden="true" />
                <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
                <button type="button" className="commons-snapBtn is-claim" onClick={() => onClaim(n.id)}>{t.claim}</button>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {s.stuck.length > 0 && (
        <Section label={t.stuck}>
          {s.stuck.map((n) => (
            <motion.li key={n.id} className="commons-snapRow is-stuck" variants={rowV}>
              <div className="commons-snapRow__head">
                <span className="commons-snapDot is-stuck" aria-hidden="true" />
                <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
              </div>
              <div className="commons-snapRow__actions">
                <button type="button" className="commons-snapBtn is-claim" onClick={() => onClaim(n.id)}>{t.claim}</button>
                <button type="button" className="commons-snapBtn is-did" onClick={() => onResolve(n.id)}>{t.didHappen}</button>
                {canManage && <button type="button" className="commons-snapBtn is-defer" onClick={() => onDefer(n.id)}>{t.deferTomorrow}</button>}
                {canManage && <button type="button" className="commons-snapBtn is-skip" onClick={() => onSkip(n.id)}>{t.skip}</button>}
              </div>
            </motion.li>
          ))}
        </Section>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/SnapshotSections.jsx && git commit -m "feat(commons): snapshot time-aware sections + mutual-aid actions"
```

---

## Task 7: `RecentStrip.jsx` (credit log + celebration)

**Files:**
- Create: `src/commons/pages/OverviewPage/RecentStrip.jsx`

- [ ] **Step 1: Implement the credit strip**

```jsx
// src/commons/pages/OverviewPage/RecentStrip.jsx
// "לאחרונה": a short, happy credit log of recent completions (props, never ranking). Emoji are
// decorative; the words carry the meaning. At 100% a celebration banner sits on top. "כל היומן ←"
// links to the full feed (deferred — onFullLog is optional).

function relTime(iso, locale) {
  try {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale === 'he' ? 'he' : 'en', { numeric: 'auto' });
    const a = Math.abs(diff);
    if (a < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  } catch { return ''; }
}

export function RecentStrip({ recent, closed, t, locale, onFullLog }) {
  if (!recent.length && !closed) return null;
  return (
    <>
      {closed && (
        <div className="commons-closed" role="status">
          <div className="commons-closed__emoji" aria-hidden="true">🌈🎉</div>
          <div className="commons-closed__title">{t.closedTitle}</div>
          <div className="commons-closed__body">{t.closedBody}</div>
        </div>
      )}
      {recent.length > 0 && (
        <section className="commons-recent">
          <div className="commons-recent__head">
            <span className="commons-recent__label">{t.recent}</span>
            {onFullLog && <button type="button" className="commons-recent__more" onClick={onFullLog}>{t.fullLog}</button>}
          </div>
          <ul className="commons-recent__list">
            {recent.map((e) => (
              <li key={e.id} className="commons-recent__item">
                <span className="commons-recent__avatar" aria-hidden="true">{(e.doer ?? '·').slice(0, 1)}</span>
                <span className="commons-recent__text">
                  {e.doer ? `${e.doer}: ` : ''}{e.title} <span className="commons-recent__flavour">{e.late ? t.creditLate : t.creditOnTime}</span>
                </span>
                <span className="commons-recent__time">{relTime(e.at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/RecentStrip.jsx && git commit -m "feat(commons): לאחרונה credit strip + celebration banner"
```

---

## Task 8: `WeekStrip.jsx`

**Files:**
- Create: `src/commons/pages/OverviewPage/WeekStrip.jsx`

- [ ] **Step 1: Implement the rainbow week**

```jsx
// src/commons/pages/OverviewPage/WeekStrip.jsx
// Seven small spectrum rings, one per op-day (today highlighted). Each day's colour = that day's
// completion fraction. Reads as a little rainbow — trend without a chart. Per-day drill-in deferred.

import { spectrumConic } from '../../styles/spectrum.js';

export function WeekStrip({ week, label }) {
  return (
    <div className="commons-week">
      <span className="commons-week__label">{label}</span>
      <div className="commons-week__dots">
        {week.map((d) => (
          <span
            key={d.date}
            className={`commons-week__dot${d.isToday ? ' is-today' : ''}`}
            style={{ background: spectrumConic(d.fraction) }}
            title={d.date}
            aria-label={`${d.date}: ${Math.round(d.fraction * 100)}%`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/WeekStrip.jsx && git commit -m "feat(commons): rainbow 7-day week strip"
```

---

## Task 9: `SnapshotList.jsx` (accessible list + toggle)

**Files:**
- Create: `src/commons/pages/OverviewPage/SnapshotList.jsx`

- [ ] **Step 1: Implement the accessible list**

```jsx
// src/commons/pages/OverviewPage/SnapshotList.jsx
// The accessible linear layer under the ring. Always in the DOM (visually-hidden) as an ordered list of
// every in-scope leaf with a full label; a visible "רשימה" toggle reveals it on screen. The radial ring
// is an enhancement over this base (IS 5568).

import { useState } from 'react';

export function SnapshotList({ items, statusLabel, toggleLabel, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`commons-snapList${open ? ' is-visible' : ''}`}>
      <button type="button" className="commons-snapList__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {toggleLabel}
      </button>
      <ul className="commons-snapList__ul">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onOpen(n.id)} aria-label={`${n.title} — ${statusLabel(n)}`}>
              {n.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/SnapshotList.jsx && git commit -m "feat(commons): accessible snapshot list + רשימה toggle"
```

---

## Task 10: `OverviewPage.jsx` — compose

**Files:**
- Modify: `src/commons/pages/OverviewPage/OverviewPage.jsx` (full rewrite)

- [ ] **Step 1: Rewrite the page**

```jsx
// src/commons/pages/OverviewPage/OverviewPage.jsx
// "מה קורה היום?" — the communal snapshot ("us" view). Derives a view model from the loaded tree +
// roster (snapshot.js), renders the spectrum ring + invitation-framed sections + credit strip + week.
// Read-mostly; the few actions reuse existing occurrence ops. No new DB reads.

import './overview.css';
import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { Fab } from '../../Fab.jsx';
import { buildSnapshot } from './snapshot.js';
import { SnapshotRing } from './SnapshotRing.jsx';
import { AreaLens } from './AreaLens.jsx';
import { SnapshotSections } from './SnapshotSections.jsx';
import { RecentStrip } from './RecentStrip.jsx';
import { WeekStrip } from './WeekStrip.jsx';
import { SnapshotList } from './SnapshotList.jsx';

export function OverviewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const t = shell.snapshot;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);
  const canManage = canTask;

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then((r) => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const [scope, setScope] = useState(null);
  const freeRef = useRef(null);

  const areas = useMemo(
    () => (tree.byParent.get('root') ?? []).filter((n) => n.kind === 'container'),
    [tree.byParent]);

  const s = useMemo(
    () => buildSnapshot({ nodes: tree.nodes, roster, now: new Date(), scopeAreaId: scope }),
    [tree.nodes, roster, scope]);

  if (tree.loading) return <section className="commons-snapshot"><CommonsLoading /></section>;

  const open = (id) => navigate(`/commons/${workspaceSlug}/task/${id}`);
  const line = buildLine(t, s);
  const allLeaves = [...s.approaching, ...s.free, ...s.stuck];
  const statusLabel = (n) => (n.status === 'done' ? t.center : (n.status === 'missed' ? t.stuck : t.free));

  return (
    <section className="commons-snapshot">
      <header className="commons-snapHeader">
        <div className="commons-snapHeader__kicker">{t.heading}</div>
        <button type="button" className="commons-snapHeader__line"
                onClick={() => freeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{line}</span><span aria-hidden="true" className="commons-snapHeader__chev">↓</span>
        </button>
      </header>

      <AreaLens areas={areas} value={scope} onChange={setScope} allLabel={t.scopeAll} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <SnapshotRing fraction={s.progress.fraction} done={s.progress.doneLeaves}
                      total={s.progress.totalLeaves} centerLabel={t.center} countOf={t.countOf} />

        <SnapshotList items={allLeaves} statusLabel={statusLabel} toggleLabel={t.listToggle} onOpen={open} />

        <SnapshotSections
          s={s} t={t} canManage={canManage} onOpen={open} anchorRef={freeRef}
          onClaim={(id) => tree.claim(id)}
          onResolve={(id) => tree.resolveMissed(id, null)}
          onDefer={(id) => { const d = nextOpDayStr(); tree.deferOccurrence(id, d); }}
          onSkip={(id) => tree.deferOccurrence(id, null)}
        />

        <RecentStrip recent={s.recent} closed={s.closedToday} t={t} locale={locale} />
        <WeekStrip week={s.week} label={t.week} />
      </motion.div>

      {(s.progress.totalLeaves === 0) && <p className="commons-snapshot__empty">{t.empty}</p>}

      {canTask && <Fab onClick={() => navigate(`/commons/${workspaceSlug}/task/new`)} label={shell.fab.newTaskAria} />}
    </section>
  );
}

// Pick a living-line template by op-day phase + counts (never says "ביחד").
function buildLine(t, s) {
  const { doneLeaves: done, totalLeaves: total } = s.progress;
  const left = total - done;
  if (total > 0 && left === 0) return t.lineAllDone;
  if (s.stuck.length >= 3) return t.lineHardDay;
  const h = new Date().getHours();
  const tmpl = h < 12 ? t.lineMorning : h < 17 ? t.lineMidday : t.lineEvening;
  return tmpl.replace('{done}', done).replace('{left}', left).replace('{free}', s.free.length);
}

// Tomorrow's op-day as 'YYYY-MM-DD' (deferOccurrence target).
function nextOpDayStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/OverviewPage.jsx && git commit -m "feat(commons): compose the מה קורה היום? snapshot page"
```

---

## Task 11: `overview.css` — rewrite

**Files:**
- Modify: `src/commons/pages/OverviewPage/overview.css` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```css
/* src/commons/pages/OverviewPage/overview.css */
/* "מה קורה היום?" snapshot — spectrum ring, invitation sections, credit log, rainbow week. Mobile-first. */

.commons-snapshot { position: relative; min-height: 60dvh; padding-bottom: 24px; }

/* header / living line */
.commons-snapHeader { margin-bottom: 12px; }
.commons-snapHeader__kicker { font-size: 13px; color: var(--commons-accent); letter-spacing: .03em; margin-bottom: 6px; }
.commons-snapHeader__line {
  width: 100%; display: flex; align-items: center; gap: 8px; text-align: start; font: inherit;
  color: var(--commons-text); cursor: pointer; background: var(--commons-surface);
  border: 1px solid var(--commons-border); border-radius: 12px; padding: 11px 12px; font-size: 16px;
}
.commons-snapHeader__line:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-snapHeader__line > span:first-child { flex: 1; }
.commons-snapHeader__chev { color: var(--commons-accent); }

/* area lens */
.commons-lens { display: flex; gap: 7px; overflow-x: auto; padding: 2px 0 14px; scrollbar-width: none; }
.commons-lens::-webkit-scrollbar { display: none; }
.commons-lensPill {
  flex: none; font: inherit; font-size: 13px; cursor: pointer; color: var(--commons-text-dim);
  background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 999px; padding: 6px 15px;
}
.commons-lensPill.is-on { color: var(--commons-text); background: var(--commons-surface-2); border-color: var(--commons-accent); }
.commons-lensPill:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }

/* ring */
.commons-ring { position: relative; width: 212px; height: 212px; margin: 4px auto 8px; }
.commons-ring__track, .commons-ring__arc {
  position: absolute; inset: 0; border-radius: 50%;
  -webkit-mask: radial-gradient(circle 64px at center, transparent 62px, #000 63px);
          mask: radial-gradient(circle 64px at center, transparent 62px, #000 63px);
}
.commons-ring__track { background: var(--commons-ring-track); box-shadow: inset 0 1px 1px #ffffff12, inset 0 -3px 8px #00000070; }
.commons-ring__glass {
  position: absolute; inset: 50px; border-radius: 50%;
  background: radial-gradient(130px 130px at 50% 30%, var(--commons-surface), var(--commons-bg) 72%);
  box-shadow: inset 0 1px 1px #ffffff1c, inset 0 -8px 20px #00000055, 0 8px 22px #0007;
}
.commons-ring__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; }
.commons-ring__sub { font-size: 13px; color: var(--commons-text-dim); }
.commons-ring__count { font-size: 18px; font-weight: 700; color: var(--commons-text); margin-top: 4px; font-variant-numeric: tabular-nums; }

/* sections */
.commons-snapSection { margin-top: 14px; }
.commons-snapSection__label { font-size: 12px; color: var(--commons-text-dim); font-weight: 700; margin-bottom: 8px; }
.commons-snapSection.is-free .commons-snapSection__label { color: var(--commons-accent); }
.commons-snapSection__list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.commons-snapRow {
  display: flex; align-items: center; gap: 9px; background: var(--commons-surface);
  border: 1px solid var(--commons-border); border-radius: 12px; padding: 10px 12px;
}
.commons-snapRow.is-stuck { flex-direction: column; align-items: stretch; gap: 10px; }
.commons-snapRow__head { display: flex; align-items: center; gap: 9px; }
.commons-snapRow__title { flex: 1; text-align: start; font: inherit; font-size: 14px; color: var(--commons-text); background: none; border: 0; cursor: pointer; padding: 0; }
.commons-snapRow__title:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-snapRow__meta { font-size: 12px; color: var(--commons-spectrum-3); flex: none; }
.commons-snapRow__actions { display: flex; gap: 7px; }
.commons-snapDot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.commons-snapDot.is-soon { background: var(--commons-spectrum-3); }
.commons-snapDot.is-free { background: transparent; border: 2px dashed var(--commons-accent); }
.commons-snapDot.is-stuck { background: var(--commons-spectrum-2); }
.commons-snapBtn {
  flex: 1; font: inherit; font-size: 12.5px; cursor: pointer; border-radius: 9px; padding: 7px 6px;
  background: var(--commons-surface-2); border: 1px solid var(--commons-border); color: var(--commons-text);
}
.commons-snapBtn.is-claim { color: var(--commons-spectrum-4); }
.commons-snapBtn:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }

/* recent / closed */
.commons-closed { text-align: center; background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 14px; padding: 14px; margin-top: 16px; }
.commons-closed__emoji { font-size: 26px; }
.commons-closed__title { font-size: 15px; margin-top: 4px; }
.commons-closed__body { font-size: 12px; color: var(--commons-text-dim); margin-top: 2px; }
.commons-recent { margin-top: 16px; background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 14px; padding: 11px 12px; }
.commons-recent__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.commons-recent__label { font-size: 12px; color: var(--commons-text-dim); }
.commons-recent__more { font: inherit; font-size: 12px; color: var(--commons-accent); background: none; border: 0; cursor: pointer; }
.commons-recent__list { list-style: none; }
.commons-recent__item { display: flex; align-items: center; gap: 9px; padding: 6px 0; border-top: 1px solid var(--commons-border); }
.commons-recent__item:first-child { border-top: 0; }
.commons-recent__avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--commons-spectrum-4); color: #06281b; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex: none; }
.commons-recent__text { flex: 1; min-width: 0; font-size: 13px; }
.commons-recent__flavour { color: var(--commons-text-dim); font-size: 11px; }
.commons-recent__time { font-size: 11px; color: var(--commons-text-dim); flex: none; }

/* week */
.commons-week { display: flex; align-items: center; justify-content: space-between; padding: 16px 4px 2px; }
.commons-week__label { font-size: 11px; color: var(--commons-text-dim); }
.commons-week__dots { display: flex; gap: 8px; }
.commons-week__dot { width: 18px; height: 18px; border-radius: 50%; }
.commons-week__dot.is-today { width: 20px; height: 20px; box-shadow: 0 0 0 2px var(--commons-surface-2); }

/* accessible list — hidden until toggled */
.commons-snapList { margin-top: 6px; }
.commons-snapList__toggle { font: inherit; font-size: 12px; color: var(--commons-text-dim); background: none; border: 0; cursor: pointer; text-decoration: underline; }
.commons-snapList__toggle:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-snapList__ul { list-style: none; position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.commons-snapList.is-visible .commons-snapList__ul { position: static; width: auto; height: auto; clip: auto; display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.commons-snapList.is-visible .commons-snapList__ul button { font: inherit; font-size: 13px; color: var(--commons-text); background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 10px; padding: 9px 12px; width: 100%; text-align: start; cursor: pointer; }

.commons-snapshot__empty { color: var(--commons-text-dim); text-align: center; margin-top: 40px; }

@media (prefers-reduced-motion: reduce) {
  .commons-ring__arc { transition: none !important; }
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: build succeeds.

- [ ] **Step 3: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/pages/OverviewPage/overview.css && git commit -m "feat(commons): snapshot styles (ring, sections, week, lens, recent)"
```

---

## Task 12: Record the new standards

**Files:**
- Modify: `docs/commons-standards.md`

- [ ] **Step 1: Add the copy + spectrum standards and a dated decision-log entry**

In `docs/commons-standards.md`, add a rule under the copy/format rules section:

```markdown
### Copy — never say "ביחד"
Togetherness is **conveyed**, never stated. Do not use the word "ביחד" in UI copy. Lean on "we" framing:
"מה איתנו", "מה מצבנו", "מי לוקח", "מי תופס". Surface the shared work and credit who did it; never rank people.

### Snapshot — spectrum & credit
- Progress is shown as a **completion ring** whose colour travels the spectrum (red→purple, magenta close)
  by fraction. Colour reinforces; a **count/number always carries the meaning** (IS 5568) — never colour-only.
- "unassigned" → **"פנוי — מי לוקח?"**; "missed/failed" → **"נתקע — מי תופס?"**.
- Completion credit may use emoji (decorative, `aria-hidden`): 🙌 עליי · 🫢 זה כן קרה · 🙆 דחה למחר · 🤷 לא צריך · 😇/😎 done · 🌈🎉 closed.
```

And append to the Decision Log:

```markdown
- **2026-06-16** — Snapshot (`תמונת מצב`) redesigned as the communal "מה קורה היום?" view (spectrum ring,
  invitation-framed sections, credit log). Locked: "ביחד" banned from UI copy; areas are equal lenses not a
  ranked breakdown; progress ring colour = completion spectrum with the count carrying the meaning.
  Spec: `docs/superpowers/specs/2026-06-16-commons-snapshot-screen-design.md`.
```

- [ ] **Step 2: Commit (local checkpoint)**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add docs/commons-standards.md && git commit -m "docs(commons): lock snapshot copy + spectrum standards"
```

---

## Task 13: Browser review checkpoint + finalize

**Files:**
- Modify: `src/commons/COMMONS.md` (status line)

- [ ] **Step 1: Lint + build clean**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`
Expected: no errors.

- [ ] **Step 2: Run the dev server and review with the user (project git rule)**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev`
Open `/commons/<slug>/overview` on a mobile viewport. With the user, verify against the spec:
- ring fills + spectrum colour matches progress; centre shows "מה מצבנו?" + count, **no %**; 100% closes purple→red.
- area pills focus the ring + lists + count; default הכל.
- header line taps → scrolls to "פנוי".
- free → עליי claims; stuck → עליי / זה כן קרה / (manager) דחה למחר / לא צריך work and refresh.
- לאחרונה shows real completions + doer; week strip rainbow; "רשימה" reveals the accessible list; keyboard + focus rings work.
- Confirm `dueAt` matches real seeded routine due fields; fix if needed and re-commit Task 2.

- [ ] **Step 3: Update `COMMONS.md` status**

In `src/commons/COMMONS.md` "## Status", change the snapshot item from a "Next:" entry to done, e.g.:
`**תמונת מצב snapshot — done:** communal "מה קורה היום?" — spectrum completion ring, area lenses, invitation
sections (פנוי / נתקע) wired to occurrence ops, לאחרונה credit log, rainbow week, accessible list.`

- [ ] **Step 4: Final commit after user approval**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/commons/COMMONS.md && git commit -m "docs(commons): mark תמונת מצב snapshot done"
```

---

## Self-review (done while writing)

- **Spec coverage:** concept/IA (Tasks 10, 5) · ring + no-% + spectrum + magenta close (Tasks 1, 4) ·
  partial credit + no new queries (Task 2) · area lenses (Task 5) · time sections + mutual-aid actions +
  permission gating (Task 6) · credit log + emoji + closed banner + full-log link deferred (Task 7) ·
  rainbow week (Task 8) · a11y hidden list + toggle + reduced-motion + count-carries-meaning (Tasks 9, 4, 11) ·
  content keys + "ביחד" ban (Tasks 3, 12) · standards recorded (Task 12). All covered.
- **No test framework:** pure logic tested via `node:assert` files (Tasks 1–2); UI via build + browser (Task 13).
- **Type/name consistency:** `buildSnapshot({nodes, roster, now, scopeAreaId})` and its return shape
  (`progress{doneLeaves,totalLeaves,fraction}`, `approaching/free/stuck/recent/week`, `closedToday`) are used
  identically in `snapshot.test.mjs` and `OverviewPage.jsx`. `spectrumConic/spectrumHex` signatures match across
  ring + week. Action props (`onClaim/onResolve/onDefer/onSkip`) map to `tree.claim/resolveMissed/deferOccurrence`.
- **Open items flagged, not hidden:** `dueAt` instance-field assumption + "approaching" 90-min window are
  called out for confirmation at Task 13.
```
