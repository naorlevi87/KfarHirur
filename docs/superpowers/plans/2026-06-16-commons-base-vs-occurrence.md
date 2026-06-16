# Commons — Base vs Occurrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recurring-task surfaces distinguish a *base* (template — capability + cadence + an assignment choice) from an *occurrence* (the doable day), add sub-task inheritance, show per-row times, replace the `!` note marker, and unify defer/skip into one conditional per-item menu.

**Architecture:** Mostly UI + content + CSS in `src/commons/tasks/`, plus one shared defaults helper, a widened `addNode` signature, and **one new SQL function** `commons.defer_run` (cascade-defer + re-create a run subtree on a target day) so "דחה למחר" works on parents/run-roots, not just leaves. No table-schema change. Spec: `docs/superpowers/specs/2026-06-16-commons-base-vs-occurrence-design.md`.

**Tech Stack:** React 19, Vite, Framer Motion (`motion/react`), Supabase (`commons` schema, behind `nodeQueries.js`). RTL Hebrew, token-driven CSS.

**Project constraints (read before starting):**
- **No test suite exists.** Each task verifies with `npm run lint` + `npm run build` + a manual browser check. There is no `npm test`.
- **Run npm via the Windows workaround:** ``cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" <cmd>``
- **Commit only after the user has reviewed the running app** (project rule in CLAUDE.md). The "Commit" step in each task means: *after the user has seen this change in the browser and approved it.* If executing several tasks before a review, batch the commits at the review checkpoint.
- **Parallel work in flight:** another agent is working on the per-task **log** (`DocumentationBox` / activity log) and another on the **snapshot**. **Task 9 is the only overlap** (spacing around the doc box) — do it **last** and keep it surgical.
- Never use Bash for file ops (Hebrew username breaks paths) — use Read/Write/Edit/Glob/Grep.

---

## Task 1: Foundations — content keys, `IconInfo`, `--commons-cancel`

**Files:**
- Modify: `src/commons/icons.jsx:61`
- Modify: `src/commons/styles/commons-tokens.css:15`
- Modify: `src/content/commons/he/commonsShell.content.js` (form + view blocks)
- Modify: `src/content/commons/en/commonsShell.content.js` (form + view blocks)

- [ ] **Step 1: Add `IconInfo` to the icon set**

In `src/commons/icons.jsx`, after the `IconClock` line (line 61), add:

```jsx
export const IconInfo = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11.5v4.5" /><path d="M12 8h.01" /></Svg>;
```

- [ ] **Step 2: Add the `--commons-cancel` token**

In `src/commons/styles/commons-tokens.css`, after the `--commons-danger:    #ff6b6b;` line (line 15), add:

```css
  --commons-cancel:    #ff8a4d;  /* warm orange-red — "called off", softer than danger (delete stays danger) */
```

- [ ] **Step 3: Add Hebrew content keys**

In `src/content/commons/he/commonsShell.content.js`:

In the `form:` block, after `unassigned: 'לא משויך',` add:
```js
    ownerOpen: 'מי שיכול לוקח',
```

In the `view:` block, after `unassigned: 'לא משויך',` add:
```js
    ownerOpen: 'מי שיכול לוקח',
```

In the `view:` block, after `everyDay: 'כל יום',` add:
```js
    settingsDays: 'ימים',
```

- [ ] **Step 4: Add English content keys (mirror)**

In `src/content/commons/en/commonsShell.content.js`:

`form:` block, after `unassigned: 'Unassigned',`:
```js
    ownerOpen: 'Open — whoever takes it',
```

`view:` block, after `unassigned: 'Unassigned',`:
```js
    ownerOpen: 'Open — whoever takes it',
```

`view:` block, after `everyDay: 'Every day',`:
```js
    settingsDays: 'Days',
```

- [ ] **Step 5: Lint + build**

Run: ``cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint``
Expected: PASS (no new errors).
Run: ``cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build``
Expected: build succeeds.

- [ ] **Step 6: Commit** (after review checkpoint)

```bash
git add src/commons/icons.jsx src/commons/styles/commons-tokens.css src/content/commons/he/commonsShell.content.js src/content/commons/en/commonsShell.content.js
git commit -m "feat(commons): add IconInfo, --commons-cancel token, ownerOpen/settingsDays content keys"
```

---

## Task 2: Note marker — circled-i instead of `!`

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx:27` (import), `:205` (marker)
- Modify: `src/commons/tasks/taskScreens.css:114-118`

- [ ] **Step 1: Import `IconInfo`**

In `src/commons/tasks/TaskViewPage.jsx`, change line 27 from:
```jsx
import { IconCheck, IconRepeat, IconClock, IconPlus } from '../icons.jsx';
```
to:
```jsx
import { IconCheck, IconRepeat, IconClock, IconPlus, IconInfo } from '../icons.jsx';
```

- [ ] **Step 2: Swap the `!` for the icon**

In `ItemRow`, change line 205 from:
```jsx
            {hasNote && <span className="commons-subRow__note" title={k.description.trim()} aria-label={v.hasNote}>!</span>}
```
to:
```jsx
            {hasNote && <span className="commons-subRow__note" title={k.description.trim()} aria-label={v.hasNote}><IconInfo size={14} /></span>}
```

- [ ] **Step 3: Restyle the marker (drop the badge — the icon draws its own circle)**

In `src/commons/tasks/taskScreens.css`, replace the rule at lines 114-118:
```css
.commons-subRow__note {
  flex: 0 0 auto; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 50%;
  display: grid; place-items: center; font-size: 11px; font-weight: 800;
  background: var(--commons-surface-2); color: var(--commons-accent);
}
```
with:
```css
.commons-subRow__note {
  flex: 0 0 auto; display: inline-flex; align-items: center;
  color: var(--commons-text-dim);
}
```

- [ ] **Step 4: Lint + build**

Run lint and build (commands as in Task 1, Step 5). Expected: PASS.

- [ ] **Step 5: Manual check**

Open a task whose sub-task has a description. The marker beside the name is now a small circled-i in the dim text color (not a bold `!`). Hovering shows the description tooltip.

- [ ] **Step 6: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx src/commons/tasks/taskScreens.css
git commit -m "feat(commons): note marker is a circled-i (info), not an alert !"
```

---

## Task 3: Sub-task rows always show עד שעה

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx` (helpers near line 30; `ItemRow` due chip at lines 215-219)

- [ ] **Step 1: Add row-time helpers**

In `src/commons/tasks/TaskViewPage.jsx`, after the existing `dateStr` function (line 41), add:

```jsx
// A row's "עד שעה": a definition carries due_time ("HH:MM[:ss]"); an instance carries a dated due_date.
function rowTime(k, locale) {
  if (k.due_time) return k.due_time.slice(0, 5);
  if (k.due_date) return timeOf(k.due_date, locale);
  return '';
}
// Pre-08:00 belongs to the next calendar morning of the op-day — show a "↪" hint.
function rowTimeNextDay(k) {
  if (k.due_time) return parseInt(k.due_time.slice(0, 2), 10) < 8;
  if (k.due_date) return new Date(k.due_date).getHours() < 8;
  return false;
}
```

- [ ] **Step 2: Render the time on every row (done + parent included)**

In `ItemRow`, replace the due chip block at lines 215-219:
```jsx
        {k.due_date && !kHasKids && !kDone && (
          <span className={overdue ? 'commons-chip commons-chip--due' : 'commons-chip'}>
            {new Date(k.due_date).getHours() < 8 ? '↪ ' : ''}{rc.until} {timeOf(k.due_date, locale)}
          </span>
        )}
```
with:
```jsx
        {rowTime(k, locale) && (
          <span className={overdue && !kDone ? 'commons-chip commons-chip--due' : 'commons-chip'}>
            {rowTimeNextDay(k) ? '↪ ' : ''}{rc.until} {rowTime(k, locale)}
          </span>
        )}
```

- [ ] **Step 3: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 4: Manual check**

Open a routine's definition view: each order with a `עד שעה` now shows an `עד HH:MM` chip — including parent orders (with sub-items) and done items. A definition order with a time (previously blank) now shows it. Overdue accent appears only on live, not-done instances.

- [ ] **Step 5: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): show each sub-task's עד שעה on its row (done + parent rows too; reads due_time for definitions)"
```

---

## Task 4: Hide the empty-description block

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx:287-291`

- [ ] **Step 1: Render the description block only when there is a description**

Replace lines 287-291:
```jsx
        <div className="commons-view__block">
          <div className={node.description?.trim() ? 'commons-view__desc' : 'commons-view__desc is-empty'}>
            {node.description?.trim() ? node.description : v.noDescription}
          </div>
        </div>
```
with:
```jsx
        {node.description?.trim() && (
          <div className="commons-view__block">
            <div className="commons-view__desc">{node.description}</div>
          </div>
        )}
```

- [ ] **Step 2: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 3: Manual check**

Open a task/occurrence with no description — the "אין תיאור" block is gone entirely. A task *with* a description still shows it.

- [ ] **Step 4: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): omit the description block when empty (no 'אין תיאור' placeholder)"
```

---

## Task 5: Sub-task creation inherits the parent's defaults

**Files:**
- Create: `src/commons/tasks/subDefaults.js`
- Modify: `src/commons/commonsState/useWorkspaceTree.js:56-72` (`addNode`)
- Modify: `src/commons/tasks/TaskFormPage.jsx` (import; `quickAddSub`; create-with-parent seeding)
- Modify: `src/commons/tasks/TaskViewPage.jsx` (import; `addSub`)

- [ ] **Step 1: Create the shared defaults helper**

Create `src/commons/tasks/subDefaults.js`:
```js
// src/commons/tasks/subDefaults.js
// Defaults a new sub-task inherits from its parent task at creation: assignment (owner), who-can
// (roles/skills), and the "עד שעה" target time where it applies. Inherited values are editable
// defaults, never locks. Owner inherits the parent's assignment *choice* — an assigned parent passes
// its person down; an open parent ("מי שיכול לוקח") passes an empty owner (open) down.
export function inheritedSubDefaults(parentNode) {
  if (!parentNode) return { ownerId: '', roleIds: [], dueTime: '' };
  return {
    ownerId: parentNode.owner_id ?? '',
    roleIds: parentNode.role_ids ?? [],
    dueTime: parentNode.due_time ? parentNode.due_time.slice(0, 5) : '',
  };
}
```

- [ ] **Step 2: Widen `addNode` to accept `ownerId` + `roleIds`**

In `src/commons/commonsState/useWorkspaceTree.js`, replace the `addNode` body (lines 56-72):
```js
  const addNode = useCallback(async ({ parentId = null, kind, title, occurrenceDate, dayMask, dueTime }) => {
    const input = {
      workspace_id: workspaceId,
      parent_id: parentId,
      kind,
      title: title.trim(),
      status: kind === 'task' ? 'open' : null,
      created_by: user?.id ?? null,
      position: Date.now(),
    };
    if (occurrenceDate) input.occurrence_date = occurrenceDate;
    if (dayMask) input.day_mask = dayMask;
    if (dueTime) input.due_time = dueTime;
    const created = await createNode(input);
    setNodes(prev => [...prev, created]);
    return created;
  }, [workspaceId, user]);
```
with:
```js
  const addNode = useCallback(async ({ parentId = null, kind, title, occurrenceDate, dayMask, dueTime, ownerId, roleIds }) => {
    const input = {
      workspace_id: workspaceId,
      parent_id: parentId,
      kind,
      title: title.trim(),
      status: kind === 'task' ? 'open' : null,
      created_by: user?.id ?? null,
      position: Date.now(),
    };
    if (occurrenceDate) input.occurrence_date = occurrenceDate;
    if (dayMask) input.day_mask = dayMask;
    if (dueTime) input.due_time = dueTime;
    if (ownerId) input.owner_id = ownerId;
    if (roleIds && roleIds.length) input.role_ids = roleIds;
    const created = await createNode(input);
    setNodes(prev => [...prev, created]);
    return created;
  }, [workspaceId, user]);
```
(`createNode` inserts the whole `input` object, so `owner_id`/`role_ids` pass straight through — verified in `nodeQueries.js`.)

- [ ] **Step 3: Inherit on quick-add in the form**

In `src/commons/tasks/TaskFormPage.jsx`, add the import near the other tasks imports (after the `recurrence.js` import line 26):
```js
import { inheritedSubDefaults } from './subDefaults.js';
```
Replace `quickAddSub` (lines 241-247):
```js
  async function quickAddSub() {
    const t = subAdd.trim();
    if (!t) return;
    // Inside an occurrence the new item belongs to that day's run (one-off); a definition adds a definition.
    await tree.addNode({ parentId: node.id, kind: 'task', title: t, occurrenceDate: node.occurrence_date ?? undefined });
    setSubAdd('');
  }
```
with:
```js
  async function quickAddSub() {
    const t = subAdd.trim();
    if (!t) return;
    // Inherit the parent's assignment + who-can; due_time only applies to a definition (not an occurrence).
    const inh = inheritedSubDefaults(node);
    await tree.addNode({
      parentId: node.id, kind: 'task', title: t,
      occurrenceDate: node.occurrence_date ?? undefined,
      ownerId: inh.ownerId, roleIds: inh.roleIds,
      dueTime: node.occurrence_date ? undefined : inh.dueTime,
    });
    setSubAdd('');
  }
```

- [ ] **Step 4: Inherit on quick-add in the view**

In `src/commons/tasks/TaskViewPage.jsx`, add the import after the existing `recurrence.js` import (line 19):
```js
import { inheritedSubDefaults } from './subDefaults.js';
```
Replace `addSub` (lines 126-133):
```js
  async function addSub(e) {
    e?.preventDefault?.();
    const title = adding.trim();
    if (!title) return;
    // Inside a run → an ad-hoc item carries that run's day (one-off for that day only).
    await tree.addNode({ parentId: node.id, kind: 'task', title, occurrenceDate: node.occurrence_date ?? undefined });
    setAdding('');
  }
```
with:
```js
  async function addSub(e) {
    e?.preventDefault?.();
    const title = adding.trim();
    if (!title) return;
    // Inherit the parent's assignment + who-can; due_time only applies to a definition (not an occurrence).
    const inh = inheritedSubDefaults(node);
    await tree.addNode({
      parentId: node.id, kind: 'task', title,
      occurrenceDate: node.occurrence_date ?? undefined,
      ownerId: inh.ownerId, roleIds: inh.roleIds,
      dueTime: node.occurrence_date ? undefined : inh.dueTime,
    });
    setAdding('');
  }
```

- [ ] **Step 5: Seed the new-task form from the parent (detailed-add)**

In `src/commons/tasks/TaskFormPage.jsx`, add a one-time seed effect so a new sub-task opened with `?parent=…` pre-fills owner/skills/time from the parent once it loads. Add this `useRef` next to `skillInited` (line 163) — declare it just before the existing `skillInited` ref:
```js
  const seedInited = useRef(false);
```
Then add this effect immediately after the existing skill-default `useEffect` (after line 176, the one ending `}, [workspace?.id, node]);`):
```js
  // Create-with-parent: seed owner/skills/עד-שעה from the parent as editable defaults (once the
  // parent node is in the tree). Programmatic — does NOT mark dirty. Sets skillInited so the
  // all-skills default below cannot clobber an inherited skill set.
  useEffect(() => {
    if (editing || !parentId || seedInited.current) return;
    const parent = tree.nodes.find(n => n.id === parentId);
    if (!parent) return;
    const inh = inheritedSubDefaults(parent);
    setOwnerId(prev => prev || inh.ownerId);
    if (inh.roleIds.length) { setRoleIds(inh.roleIds); skillInited.current = true; }
    setDueTime(prev => prev || inh.dueTime);
    seedInited.current = true;
  }, [editing, parentId, tree.nodes]);
```

- [ ] **Step 6: Lint + build**

Run lint and build. Expected: PASS. (If lint flags the `react-hooks/exhaustive-deps` rule on the new effect, keep the dependency array as written — `setOwnerId`/`setRoleIds`/`setDueTime` are stable setters; matching the existing `skillInited` effect's style.)

- [ ] **Step 7: Manual check**

1. Open a routine order that has a skill + עד-שעה set. Quick-add a sub-task (type a name, Enter): it inherits the parent's skills + time (open it to confirm).
2. On a routine order **assigned to a specific person**, add a sub-task → it inherits that owner. On an **open** order ("מי שיכול לוקח"), the new sub-task is open too.
3. Use the detailed "+" add (opens the new-task form): owner, skills, and עד-שעה are pre-filled from the parent and editable before Save.

- [ ] **Step 8: Commit** (after review)

```bash
git add src/commons/tasks/subDefaults.js src/commons/commonsState/useWorkspaceTree.js src/commons/tasks/TaskFormPage.jsx src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): new sub-tasks inherit parent assignment/skills/עד-שעה as editable defaults"
```

---

## Task 6: Base view — hide status, frame the owner as a choice, settings chips

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx` (import `effectiveDaysFor`; base detection; chips; owner block)

- [ ] **Step 1: Import `effectiveDaysFor`**

In `src/commons/tasks/TaskViewPage.jsx`, change the `recurrence.js` import (line 19) from:
```js
import { buildRecurrenceSummary } from './recurrence.js';
```
to:
```js
import { buildRecurrenceSummary, effectiveDaysFor } from './recurrence.js';
```

- [ ] **Step 2: Detect a base (definition) and compute its settings**

After the `isRunRoot` line (line 113), add:
```js
  // A base/definition (template) vs a run instance. A base order sits under a routine with no
  // occurrence_date; the routine root carries its own recurrence. Bases declare capability + cadence
  // + an assignment choice — never a status or a per-day claim.
  const underRoutine = !isRun && (() => {
    let c = tree.nodes.find(n => n.id === node.parent_id);
    while (c) { if (c.recurrence) return true; c = tree.nodes.find(n => n.id === c.parent_id); }
    return false;
  })();
  const isBase = isRoutine || underRoutine;
  const baseDays = underRoutine ? effectiveDaysFor(tree.nodes, node.id) : [];
  const baseDaysText = baseDays.length === 7 ? v.everyDay : baseDays.map(d => rc.dayShort[d]).join(' ');
```

- [ ] **Step 3: Hide the status chip on a base; add base-order settings chips**

In the chips row, change the status chip guard at line 244 from `{!isRoutine && (` to `{!isBase && (`:
```jsx
          {!isBase && (
            <span className={`commons-view__chip${done ? ' commons-view__chip--done' : missed ? ' commons-view__chip--missed' : ''}`}>
              {done ? v.statusDone : missed ? v.statusMissed : v.statusOpen}
            </span>
          )}
```
Then, immediately after the `requiredRoles.map(...)` chips block (after line 261, before the closing `</div>` of `commons-view__chips`), add the settings chips for base orders:
```jsx
          {underRoutine && baseDaysText && (
            <span className="commons-view__chip">{v.settingsDays}: {baseDaysText}</span>
          )}
          {underRoutine && node.due_time && (
            <span className="commons-view__chip"><IconClock size={14} /> {rc.until} {node.due_time.slice(0, 5)}</span>
          )}
```

- [ ] **Step 4: Frame the owner as the assignment choice (no claim on a base; "מי שיכול לוקח" when open)**

In the owner block, change the non-editable owner label (line 276) from:
```jsx
                <span>{ownerName ?? v.unassigned}</span>
```
to:
```jsx
                <span>{ownerName ?? v.ownerOpen}</span>
```
And gate the per-day claim button so it never shows on a base — change line 279 from:
```jsx
            {!owner && node.kind === 'task' && canClaim && (
```
to:
```jsx
            {!owner && node.kind === 'task' && canClaim && !isBase && (
```

- [ ] **Step 5: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 6: Manual check**

1. Open a routine **order** (a definition under a recurring task): no `פתוחה`/status chip; instead chips show `ימים: …` and `עד HH:MM`. The owner block shows the assigned person, or **מי שיכול לוקח** when open — with **no** claim ("עלי") button.
2. Open the routine **root**: no status chip; recurrence chip still shows; owner block reads מי שיכול לוקח (open) or the assigned person; no claim button.
3. Open a real **occurrence** (today's run item) or a **plain one-off task**: status chip and the claim button still work as before.

- [ ] **Step 7: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): base view drops status + per-day claim, frames owner as choice, shows ימים·עד chips"
```

---

## Task 7: Base edit — owner picker's open option reads "מי שיכול לוקח"

**Files:**
- Modify: `src/commons/tasks/TaskFormPage.jsx:286-294` (owner `SelectField`)

- [ ] **Step 1: Relabel the empty/open owner option**

In the owner field's `SelectField` (lines 286-294), change `placeholder={f.unassigned}` and the first option's label from `f.unassigned` to `f.ownerOpen`:
```jsx
                <SelectField
                  ariaLabel={f.owner}
                  value={ownerId}
                  onChange={(v) => { setOwnerId(v); mark(); }}
                  placeholder={f.ownerOpen}
                  options={[{ value: '', label: f.ownerOpen }, ...roster.map(mb => ({ value: mb.id, label: mb.display_name ?? '—' }))]}
                />
```

- [ ] **Step 2: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 3: Manual check**

Edit any task (especially a routine/base): the owner picker's default/empty entry now reads **מי שיכול לוקח** (open) instead of "לא משויך". Selecting a person sets a specific assignment; leaving it open keeps it ownerless. The choice is saved and (per Task 5) inherits to new sub-tasks.

- [ ] **Step 4: Commit** (after review)

```bash
git add src/commons/tasks/TaskFormPage.jsx
git commit -m "feat(commons): owner picker's open state reads 'מי שיכול לוקח' (the assignment choice)"
```

---

## Task 8: Backend — `commons.defer_run` RPC + data layer

**Files:**
- Create: `supabase/migrations/20260616090000_commons_defer_run.sql`
- Modify: `src/data/commons/nodeQueries.js` (add `deferRun`)
- Modify: `src/commons/commonsState/useWorkspaceTree.js` (add `deferRun` wrapper + export)

> **This task applies a real DB function.** Confirm with the user before running the migration. It only
> *adds* a function (no table change) and doesn't touch the snapshot/log agents' work.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260616090000_commons_defer_run.sql`:
```sql
-- supabase/migrations/20260616090000_commons_defer_run.sql
-- defer_run — manager+; defer a whole run subtree (a run root, a parent item, or a single leaf) to a
-- target op-day. Cascades the subtree to 'deferred' (not-done tasks only), then RE-CREATES the subtree
-- on to_date with structure preserved (occurrence_date = to_date, status 'open'), so a parent defers
-- WITH its items — unlike defer_occurrence, which respawns a single node. Modelled on cancel_run
-- (cascade) + clone_node (idmap subtree copy) + defer_occurrence (date/time math).
-- Design: docs/superpowers/specs/2026-06-16-commons-base-vs-occurrence-design.md §8.
create or replace function commons.defer_run(node_id uuid, to_date date)
returns uuid language plpgsql security definer set search_path = commons, public as $$
declare
  root commons.nodes; new_root uuid; idmap jsonb; rec record; new_id uuid; parent_new uuid;
  tod time; new_due timestamptz;
begin
  select * into root from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(root.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;
  if to_date is null then raise exception 'defer_run requires a target date'; end if;
  if root.occurrence_date is null then raise exception 'defer_run operates on a run instance'; end if;

  -- 1) close the current run subtree as 'deferred' (not-done tasks only)
  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes set status = 'deferred'
    where id in (select id from sub) and kind = 'task' and status <> 'done';

  -- 2) re-create the run root on to_date
  tod := coalesce(root.due_date::time, time '20:00');
  new_due := to_date + tod;
  if extract(hour from new_due) < 8 then new_due := new_due + interval '1 day'; end if;
  insert into commons.nodes
    (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
     due_date, occurrence_date, template_id, position, created_by)
  values
    (root.workspace_id, root.parent_id, root.kind, root.title, root.description, 'open', root.owner_id, root.role_ids,
     new_due, to_date, root.template_id, root.position, root.created_by)
  returning id into new_root;
  idmap := jsonb_build_object(node_id::text, new_root::text);

  -- 3) re-create descendants of the SAME run, preserving structure (parents before children)
  for rec in
    with recursive sub as (
      select n.*, 1 as depth from commons.nodes n
        where n.parent_id = node_id and n.occurrence_date = root.occurrence_date
      union all
      select n.*, s.depth + 1 from commons.nodes n join sub s on n.parent_id = s.id
        where n.occurrence_date = root.occurrence_date
    ) select * from sub order by depth, position, created_at
  loop
    parent_new := coalesce((idmap->>rec.parent_id::text)::uuid, new_root);
    tod := coalesce(rec.due_date::time, time '20:00');
    new_due := to_date + tod;
    if extract(hour from new_due) < 8 then new_due := new_due + interval '1 day'; end if;
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, occurrence_date, template_id, position, created_by)
    values
      (rec.workspace_id, parent_new, rec.kind, rec.title, rec.description, 'open', rec.owner_id, rec.role_ids,
       new_due, to_date, rec.template_id, rec.position, rec.created_by)
    returning id into new_id;
    idmap := idmap || jsonb_build_object(rec.id::text, new_id::text);
  end loop;

  return new_root;
end;
$$;

grant execute on function commons.defer_run(uuid, date) to authenticated;
```

- [ ] **Step 2: Apply the migration (confirm with user first)**

Read `SUPABASE_ACCESS_TOKEN` from `d:/KfarHirurDrive/KfarHirurCom/.env.local`, then POST the file's SQL
to the management API (project ref `kqlfvwlzayinngrgafec`):
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/kqlfvwlzayinngrgafec/database/query" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "<the full SQL from Step 1, JSON-escaped>"}'
```
Expected: `[]` (success). An error returns JSON with a message.

- [ ] **Step 3: Verify the function exists**

Run via the same endpoint:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/kqlfvwlzayinngrgafec/database/query" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "select proname from pg_proc where proname = '\''defer_run'\'';"}'
```
Expected: a row `{"proname":"defer_run"}`.

- [ ] **Step 4: Add the `deferRun` query**

In `src/data/commons/nodeQueries.js`, after the `deferOccurrence` function (line 110), add:
```js
// Defer a whole run subtree (run root, parent item, or leaf) to a target op-day (manager+). Cascades
// the subtree to 'deferred' and re-creates it on to_date with structure preserved. 'YYYY-MM-DD'.
export async function deferRun(id, toDate) {
  const { data, error } = await commonsDb.rpc('defer_run', { node_id: id, to_date: toDate });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 5: Add the `deferRun` hook wrapper**

In `src/commons/commonsState/useWorkspaceTree.js`, add `deferRun as deferRunQuery` to the import block from `nodeQueries.js` (after `deferOccurrence as deferOccurrenceQuery,` at line 17):
```js
  deferRun as deferRunQuery,
```
After the `deferOccurrence` callback (line 114), add:
```js
  const deferRun = useCallback(async (id, toDate) => {
    await deferRunQuery(id, toDate);
    await reload();
  }, [reload]);
```
Add `deferRun` to the returned object (line 176):
```js
  return { nodes, byParent, loading, addNode, toggleDone, saveTask, removeNode, reload, completeSubtree, claim, unclaim, resolveMissed, deferOccurrence, deferRun, cloneNode, cancelRun, progress, hasChildren, effectiveOwner };
```

- [ ] **Step 6: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 7: Commit** (after review)

```bash
git add supabase/migrations/20260616090000_commons_defer_run.sql src/data/commons/nodeQueries.js src/commons/commonsState/useWorkspaceTree.js
git commit -m "feat(commons): defer_run RPC — defer a whole run subtree to a target day (structure preserved)"
```

---

## Task 9: Unified defer/skip menu with a conditional "דחה למחר"

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx` (helper; state; actions block lines 328-335; replace `confirmCancel` dialog with the menu; defer menu reuse)
- Modify: `src/commons/tasks/taskScreens.css` (cancel retone)

- [ ] **Step 1: Add a "recurs tomorrow" helper**

In `src/commons/tasks/TaskViewPage.jsx`, after the `rowTimeNextDay` helper added in Task 3, add:
```js
// Does this run item's definition run again tomorrow? (If so, no "defer to tomorrow" — it returns on
// its own; only "not needed this time".) A daily item always recurs tomorrow. Ad-hoc one-offs (no
// template) do not recur. `nodes` is the flat tree; `template_id` points at the source definition.
function recursTomorrow(item, nodes) {
  if (!item.template_id) return false;
  const days = effectiveDaysFor(nodes, item.template_id);
  const t = currentOpDayStart();
  t.setDate(t.getDate() + 1);
  return days.includes(t.getDay());
}
```
(`effectiveDaysFor` and `currentOpDayStart` are already imported after Task 6 / from `opDay.js` at line 26.)

- [ ] **Step 2: Replace the run-root cancel state with a unified defer state**

The component already has `deferItem`/`deferDate` state (lines 60-61) and `confirmCancel` (line 64). Remove `confirmCancel` and reuse `deferItem` for every level. Delete line 64:
```js
  const [confirmCancel, setConfirmCancel] = useState(false);
```

- [ ] **Step 3: Compute per-item defer capabilities inside the defer menu**

The `openDefer`/`doDefer`/`tomorrowStr` helpers already exist (lines 166-168). No change needed there. The capability flags are computed in the render of the defer sheet (Step 5).

- [ ] **Step 4: Replace the actions-block defer/cancel buttons**

In the `!isRoutine` actions block, replace the two conditionals at lines 328-335:
```jsx
                {isRun && !isRunRoot && !hasKids && canManage && (node.status === 'open' || node.status === 'in_progress') && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer"
                    onClick={() => openDefer(node)}>{v.deferTitle}</button>
                )}
                {isRunRoot && canManage && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer commons-deferMenu__skip"
                    onClick={() => setConfirmCancel(true)}>{v.cancelDay}</button>
                )}
```
with a single unified button for any manageable run node:
```jsx
                {isRun && canManage && (node.status === 'open' || node.status === 'in_progress') && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer commons-cancelBtn"
                    onClick={() => openDefer(node)}>{v.deferTitle}</button>
                )}
```

- [ ] **Step 5: Rebuild the defer sheet (defer via `deferRun`; "דחה למחר" gated only by recurs-tomorrow)**

Replace the existing `deferItem` sheet (lines 448-466) with one where **🙆 דחה למחר** shows only when the
item doesn't recur tomorrow, **📅 דחה לתאריך** is always offered, and **🤷 לא צריך הפעם** uses `cancelRun`.
All apply to any item (leaf, parent, run root) — `deferRun` cascades + re-creates the subtree:
```jsx
      {deferItem && (() => {
        const canTomorrow = !recursTomorrow(deferItem, tree.nodes);
        return (
          <div className="commons-sheetRoot">
            <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setDeferItem(null)} />
            <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.deferTitle}>
              <h2 className="commons-confirm__title">{v.deferTitle}</h2>
              <div className="commons-deferMenu">
                {canTomorrow && (
                  <button type="button" className="commons-btn commons-btn--ghost" onClick={() => doDefer(tomorrowStr())}>
                    <span aria-hidden="true">🙆</span> {v.deferTomorrow}
                  </button>
                )}
                <div className="commons-deferMenu__date">
                  <input type="date" className="commons-field__input" value={deferDate} onChange={e => setDeferDate(e.target.value)} aria-label={v.deferDate} />
                  <button type="button" className="commons-btn commons-btn--ghost" disabled={!deferDate} onClick={() => doDefer(deferDate)}>
                    <span aria-hidden="true">📅</span> {v.deferDate}
                  </button>
                </div>
                <button type="button" className="commons-btn commons-btn--ghost commons-cancelOpt" onClick={doSkip}>
                  <span aria-hidden="true">🤷</span> {v.deferSkip}
                </button>
              </div>
              <div className="commons-confirm__actions">
                <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setDeferItem(null)}>{shell.form.cancel}</button>
              </div>
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 6: Point `doDefer` at `deferRun`, add `doSkip`, drop the old cancel dialog**

Change the existing `doDefer` (line 167) from `tree.deferOccurrence` to `tree.deferRun`:
```js
  async function doDefer(toDate) { await tree.deferRun(deferItem.id, toDate); setDeferItem(null); navigate(-1); }
```
Add a sibling `doSkip` that cascades via `cancelRun` (correct for leaf, parent, and run root), right after it:
```js
  async function doSkip() { await tree.cancelRun(deferItem.id); setDeferItem(null); navigate(-1); }
```
Then delete the entire `confirmCancel` dialog block (lines 376-385):
```jsx
      {confirmCancel && (
        <ConfirmDialog
          title={v.cancelDayTitle}
          body={v.cancelDayBody}
          confirmLabel={v.cancelDay}
          cancelLabel={shell.form.cancel}
          onConfirm={async () => { setConfirmCancel(false); await tree.cancelRun(node.id); navigate(-1); }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
```

- [ ] **Step 7: Retone the cancel/skip affordance**

In `src/commons/tasks/taskScreens.css`, after the `.commons-deferMenu__skip` rule (line 128), add:
```css
.commons-cancelOpt { color: var(--commons-cancel); }
.commons-cancelBtn { color: var(--commons-cancel); border-color: color-mix(in srgb, var(--commons-cancel) 40%, var(--commons-border)); }
```

- [ ] **Step 8: Lint + build**

Run lint and build. Expected: PASS. (Confirm `ConfirmDialog` is still imported/used elsewhere — it is, for delete and complete-cascade — so the import stays.)

- [ ] **Step 9: Manual check**

1. Open a **daily** routine's run root (today): the menu shows 📅 דחה לתאריך + 🤷 לא צריך הפעם, **no** 🙆 דחה למחר (it recurs tomorrow). 🤷 cancels the whole day (all not-done items → cancelled); 📅 to a future date re-creates the **whole run** (root + items) on that date.
2. Open a **leaf** run item of a **daily** routine: same — 📅 + 🤷, no 🙆.
3. Open an item (leaf **or** parent) that does **not** run tomorrow (e.g. a weekly order whose only day this week is today): menu shows 🙆 דחה למחר + 📅 + 🤷. **🙆 on a parent re-creates its whole subtree tomorrow** — open tomorrow's run and confirm the items came along (not a childless husk).
4. **🤷 לא צריך הפעם** on a parent cancels its whole branch for the day.

- [ ] **Step 10: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx src/commons/tasks/taskScreens.css
git commit -m "feat(commons): unify defer/skip into one per-item menu; 'דחה למחר' only when it won't recur tomorrow; warm cancel retone"
```

---

## Task 10: Separate the add-note block from the actions (DO LAST — overlaps the log agent)

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx` (divider before `DocumentationBox`, lines 345-349)

> **Coordinate first.** Another agent is editing `DocumentationBox` / the activity log. Before this task, re-read `TaskViewPage.jsx` lines ~315-350 and `taskScreens.css` to confirm the structure hasn't changed. Keep this change to a single divider element so it merges cleanly.

- [ ] **Step 1: Add a divider above the DocumentationBox**

In `src/commons/tasks/TaskViewPage.jsx`, the `DocumentationBox` renders at lines 345-349 inside the `!isRoutine` branch. Wrap it with a leading divider:
```jsx
            {!isRoutine && (
              <>
                <div className="commons-formDivider" aria-hidden="true" />
                <DocumentationBox
                  nodeId={node.id} workspaceId={workspace.id} v={v} locale={locale}
                  roster={roster} canManage={canManage} />
              </>
            )}
```

- [ ] **Step 2: Lint + build**

Run lint and build. Expected: PASS.

- [ ] **Step 3: Manual check**

On a run instance with the cancel/complete actions present, the "➕ הוסף הערה" block now sits below a hairline rule with clear spacing — no longer flush against the cancel button.

- [ ] **Step 4: Commit** (after review)

```bash
git add src/commons/tasks/TaskViewPage.jsx
git commit -m "fix(commons): separate the add-note block from the action buttons with a divider"
```

---

## Task 11: Lock the new standards in `commons-standards.md`

**Files:**
- Modify: `docs/commons-standards.md` (Decision Log — newest first)

- [ ] **Step 1: Append a dated Decision Log entry**

In `docs/commons-standards.md`, in the Decision Log (newest first — directly under the `## Decision Log` intro line, before the `### 2026-06-16 — Snapshot…` entry), add:
```markdown
### 2026-06-16 — Recurring task: base vs occurrence
- **Base declares, occurrence does.** A recurring task's *base* (routine root + order definitions,
  `occurrence_date` null) declares capability (מי יכול) + cadence (ימים · עד שעה) + an **assignment
  choice** — never a status. The choice is **"מי שיכול לוקח"** (open, the default → ownerless runs,
  "פנוי — מי לוקח?") or a **specific person** (inherits to every run + to sub-tasks). A base shows no
  status chip and no per-day claim; its owner block reads "מי שיכול לוקח" when open.
- **Sub-task inheritance.** A new sub-task inherits its parent's assignment + skills (+ עד שעה where it
  applies) as editable defaults.
- **Note marker** is a circled-**i** (info), never `!` (alert).
- **Cancellation colour** is the warm `--commons-cancel` (orange-red), not danger red (which stays for
  destructive delete).
- **Defer/skip** is one per-item menu (leaf, parent, or run root): "🤷 לא צריך הפעם" always
  (`cancel_run`, cascades); "🙆 דחה למחר" only on a leaf that doesn't already recur tomorrow
  (a daily item never shows it). Spec: `docs/superpowers/specs/2026-06-16-commons-base-vs-occurrence-design.md`.
```

- [ ] **Step 2: Commit** (after review)

```bash
git add docs/commons-standards.md
git commit -m "docs(commons): lock base-vs-occurrence standards (assignment choice, note marker, cancel retone, defer rule)"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** §3 → Task 6; §4 → Task 3; §5 → Task 5; §6 → Task 7; §7 → Task 4; §8 → Tasks 8 (backend `defer_run`) + 9 (UI menu); §9 → Task 2; §10 → Task 10; §12 → Task 1; standards → Task 11. §2 is the model realized across Tasks 5–9.
- **Naming consistency:** the helper is `inheritedSubDefaults` everywhere; `addNode` accepts `{ ownerId, roleIds, dueTime, … }`; the new RPC/wrappers are `defer_run` (SQL) / `deferRun` (query + hook); new CSS classes are `commons-cancelBtn` (the trigger) and `commons-cancelOpt` (the skip option in the menu); base detection is `underRoutine` / `isBase` in `TaskViewPage`; the recurs-tomorrow guard is `recursTomorrow`.
- **Ordering:** Tasks 1→9 are independent of the parallel agents; Task 8 adds an isolated DB function (confirm before applying); Task 10 is the only file overlap (add-note divider) and is intentionally last with a re-read gate; Task 11 is docs-only.
