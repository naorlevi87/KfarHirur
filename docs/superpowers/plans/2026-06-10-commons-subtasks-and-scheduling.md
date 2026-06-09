# Commons Sub-tasks & Scheduling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make due-date and recurrence mutually exclusive (recurring carries a time-of-day under an 8 AM operational day), and let any task break into recursive sub-tasks shown one level at a time with roll-up completion.

**Architecture:** Builds on the (uncommitted) board/shell redesign. Nesting already exists via `nodes.parent_id`. Scheduling adds a `time` field to the recurrence rule + an operational-day helper. Sub-tasks add a DB roll-up trigger (parent status derived from children), a `complete_subtree` RPC for the guarded cascade, member RLS for sub-task inserts, and a progress selector; the UI turns `TaskViewPage` into a checklist hub and shows only top-level rows + a `done/total` chip in lists.

**Tech Stack:** React 19 + React Router v6, `motion/react`, Supabase `commons` schema (RLS + pg_cron), plain CSS tokens. **No test runner** — each task verifies with `npm run lint` (commons files clean) + `npm run build`; each phase ends with a browser check before commit.

**Run commands (Hebrew-username PATH workaround):**
- Lint: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`
- Build: same prefix + `run build`
- SQL: `"/c/Program Files/nodejs/node" --env-file=.env.local scripts/run-sql.mjs <file.sql | --query "<sql>">`

---

## Phase 4a — Scheduling (due XOR recurrence, time-of-day, operational day)

### Task 1: Operational-day helpers

**Files:** Create `src/commons/opDay.js`

- [ ] **Step 1: Create `opDay.js`.**

```js
// src/commons/opDay.js
// The operational day runs 08:00 → 08:00 (a late-night task still belongs to its day until 8 AM).
// All "today / overdue / which day" math goes through here instead of raw midnight boundaries.

export const OP_DAY_START_HOUR = 8;

// Start (08:00) of the operational day a given moment falls in.
export function opDayStartFor(date) {
  const d = new Date(date);
  if (d.getHours() < OP_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(OP_DAY_START_HOUR, 0, 0, 0);
  return d;
}

export function currentOpDayStart(now = new Date()) {
  return opDayStartFor(now);
}

// A deadline is "today" when it sits in the current operational day.
export function isToday(due, now = new Date()) {
  if (!due) return false;
  return opDayStartFor(due).getTime() === currentOpDayStart(now).getTime();
}

// Overdue once the operational day of the deadline is fully past.
export function isOverdue(due, now = new Date()) {
  if (!due) return false;
  return opDayStartFor(due).getTime() < currentOpDayStart(now).getTime();
}
```

- [ ] **Step 2: Lint + build.** Expected: clean (not yet imported).

### Task 2: Recurrence rule gains a time-of-day

**Files:** Modify `src/commons/tasks/recurrence.js`, `src/content/commons/{he,en}/commonsShell.content.js`

- [ ] **Step 1: Add `time` to the rule + summary in `recurrence.js`.** Replace `defaultRule`, `normalizeRule`, `buildRecurrenceSummary`, `computeFirstNextRun`:

```js
const DEFAULT_TIME = '20:00';

export function defaultRule(freq) {
  const rule = { freq, interval: 1, time: DEFAULT_TIME };
  if (freq === 'weekly') rule.byDay = [];
  return rule;
}

export function normalizeRule(rule) {
  if (!rule) return null;
  const out = { freq: rule.freq, interval: Math.max(1, rule.interval || 1), time: rule.time || DEFAULT_TIME };
  if (rule.freq === 'weekly' && rule.byDay?.length) out.byDay = [...rule.byDay].sort((a, b) => a - b);
  return out;
}

export function buildRecurrenceSummary(rule, rc) {
  if (!rule) return rc.none;
  const n = Math.max(1, rule.interval || 1);
  const unit = rc.units[{ daily: 'day', weekly: 'week', monthly: 'month' }[rule.freq]];
  let text;
  if (n === 1) text = `${rc.everyLabel} ${unit.one}`;
  else if (n === 2) text = `${rc.everyLabel} ${unit.two}`;
  else text = `${rc.everyLabel} ${n} ${unit.many}`;
  if (rule.freq === 'weekly' && rule.byDay?.length) {
    const labels = [...rule.byDay].sort((a, b) => a - b).map(d => rc.dayShort[d]);
    text += ` ${rc.onDays}${labels.join(', ')}`;
  }
  if (rule.time) text += ` · ${rc.until} ${rule.time}`;
  return text;
}

// First generation moment = the operational-day start (08:00) the first occurrence belongs to.
// (The occurrence's due time-of-day comes from rule.time, applied in run_recurrences.)
export function computeFirstNextRun(rule) {
  if (!rule) return null;
  const base = new Date();
  if (base.getHours() < 8) base.setDate(base.getDate() - 1);
  base.setHours(8, 0, 0, 0);
  if (rule.freq === 'weekly' && rule.byDay?.length) {
    const set = new Set(rule.byDay);
    for (let i = 0; i < 7; i++) {
      if (set.has(base.getDay())) return base.toISOString();
      base.setDate(base.getDate() + 1);
    }
  }
  return base.toISOString();
}
```

Keep the existing file header and the `UNIT_BY_FREQ`-free body above (this replaces those four exports; `DEFAULT_TIME` is new at module top).

- [ ] **Step 2: Add the `until` token** to `tasks.recurrence` in both content files. he: `until: 'עד',`. en: `until: 'until',` (insert after `onDays`).

- [ ] **Step 3: Lint + build.** Expected: clean.

### Task 3: Time input in `RecurrenceField`

**Files:** Modify `src/commons/tasks/RecurrenceField.jsx`, `src/commons/tasks/tasks.css`

- [ ] **Step 1: Add a time field** after the weekly day-picker block, before the summary, in `RecurrenceField.jsx`:

```jsx
          <label className="commons-recur__time">
            <span className="commons-field__label">{rc.untilLabel}</span>
            <input
              type="time"
              className="commons-field__input"
              value={rule.time ?? '20:00'}
              onChange={e => onChange({ ...rule, time: e.target.value })}
            />
          </label>
```

- [ ] **Step 2: Add `untilLabel`** to `tasks.recurrence` content (he: `untilLabel: 'עד שעה',` · en: `untilLabel: 'By time',`).

- [ ] **Step 3: Style** in `tasks.css` (append):

```css
.commons-recur__time { display: block; margin-bottom: 10px; }
.commons-recur__time .commons-field__input { max-width: 140px; }
```

- [ ] **Step 4: Lint + build.** Expected: clean.

### Task 4: `TaskFormPage` — due date XOR recurrence

**Files:** Modify `src/commons/tasks/TaskFormPage.jsx`, `src/content/commons/{he,en}/commonsShell.content.js`, `src/commons/tasks/taskScreens.css`

- [ ] **Step 1: Add a scheduling mode toggle.** In `TaskForm` (the inner component), replace the due-date `<label>` + `<RecurrenceField>` block (inside `{!isFolder && (...)}`, after the owner field) with:

```jsx
            <div className="commons-field">
              <span className="commons-field__label">{f.scheduling}</span>
              <div className="commons-recur__freqs" role="group" aria-label={f.scheduling}>
                <button type="button" className={recurrence ? '' : 'is-active'} aria-pressed={!recurrence}
                  onClick={() => setRecurrence(null)}>{f.once}</button>
                <button type="button" className={recurrence ? 'is-active' : ''} aria-pressed={!!recurrence}
                  onClick={() => setRecurrence(recurrence ?? { freq: 'daily', interval: 1, time: '20:00' })}>{f.repeats}</button>
              </div>
            </div>

            {recurrence ? (
              <RecurrenceField value={recurrence} rc={shell.tasks.recurrence} onChange={setRecurrence} />
            ) : (
              <label className="commons-field">
                <span className="commons-field__label">{f.due}</span>
                <input type="date" className="commons-field__input" value={due} onChange={e => setDue(e.target.value)} />
              </label>
            )}
```

- [ ] **Step 2: Update `submit`** so due and recurrence are mutually exclusive and `next_run` uses the new `computeFirstNextRun(rule)` signature. Replace the task branches:

```jsx
    if (editing) {
      const patch = { title: name, parent_id: parent };
      if (!isFolder) {
        const rule = normalizeRule(recurrence);
        patch.description = description.trim() || null;
        patch.owner_id = ownerId || null;
        patch.recurrence = rule;
        patch.due_date = rule ? null : (due ? new Date(`${due}T08:00:00`).toISOString() : null);
        const ruleChanged = JSON.stringify(rule) !== JSON.stringify(normalizeRule(node.recurrence ?? null));
        patch.next_run = !rule ? null : (!ruleChanged && node.next_run ? node.next_run : computeFirstNextRun(rule));
      }
      await tree.saveTask(nodeId, patch);
    } else if (isFolder) {
      await tree.addNode({ parentId: parent, kind: 'container', title: name });
    } else {
      const rule = normalizeRule(recurrence);
      const created = await tree.addNode({ parentId: parent, kind: 'task', title: name });
      await tree.saveTask(created.id, {
        description: description.trim() || null,
        owner_id: ownerId || null,
        recurrence: rule,
        due_date: rule ? null : (due ? new Date(`${due}T08:00:00`).toISOString() : null),
        next_run: rule ? computeFirstNextRun(rule) : null,
      });
    }
```

(One-off `due_date` is anchored at 08:00 — the operational-day start — so `opDay` math lines up.)

- [ ] **Step 3: Add content** `form.scheduling`, `form.once`, `form.repeats` (he: `'תזמון' / 'חד-פעמי' / 'חוזר'`; en: `'Scheduling' / 'One-off' / 'Repeats'`).

- [ ] **Step 4: Lint + build + browser check (phase 4a).** Create a one-off task (date shows, no recurrence) and a recurring task (date hidden, recurrence + "עד שעה" shown; summary reads "כל יום · עד 20:00"). **User reviews, then commit.**

```bash
git add src/commons/opDay.js src/commons/tasks/recurrence.js src/commons/tasks/RecurrenceField.jsx src/commons/tasks/TaskFormPage.jsx src/commons/tasks/tasks.css src/commons/tasks/taskScreens.css src/content/commons
git commit -m "feat(commons): scheduling — due date XOR recurrence, time-of-day, 8am operational day"
```

### Task 5: Recurrence engine — generate at 08:00, due at rule time

**Files:** Create `supabase/migrations/20260612000000_commons_recurrence_time.sql`

- [ ] **Step 1: Write the migration** (rewrites `run_recurrences` to derive occurrence due from `next_run`'s day + `rule.time`, and reschedules the cron to 08:00):

```sql
-- supabase/migrations/20260612000000_commons_recurrence_time.sql
-- Recurrence under the operational day: templates generate at the op-day start (next_run = 08:00),
-- each occurrence is due that day at the rule's time-of-day (rolling past midnight for pre-08:00 times).

create or replace function commons.run_recurrences()
returns integer
language plpgsql security definer set search_path = commons, public
as $$
declare
  tpl record; created int := 0; guard int; occ_due timestamptz;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task' and recurrence is not null and template_id is null and next_run is not null
  loop
    guard := 0;
    while tpl.next_run <= now() and guard < 400 loop
      occ_due := date_trunc('day', tpl.next_run) + coalesce((tpl.recurrence->>'time')::time, time '20:00');
      if extract(hour from occ_due) < 8 then occ_due := occ_due + interval '1 day'; end if;

      update commons.nodes set status = 'missed'
        where template_id = tpl.id and status in ('open','in_progress') and due_date < occ_due;

      insert into commons.nodes
        (workspace_id, parent_id, kind, title, description, status, owner_id, due_date, template_id, position, created_by)
      values
        (tpl.workspace_id, tpl.parent_id, 'task', tpl.title, tpl.description, 'open',
         tpl.owner_id, occ_due, tpl.id, tpl.position, tpl.created_by);
      created := created + 1;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;
  return created;
end;
$$;

select cron.schedule('commons-recurrences', '0 8 * * *', $$ select commons.run_recurrences(); $$);
```

- [ ] **Step 2: Apply.** Run: `... scripts/run-sql.mjs supabase/migrations/20260612000000_commons_recurrence_time.sql` — expect a JSON result (the cron job id).

- [ ] **Step 3: Verify** the cron schedule moved: `... scripts/run-sql.mjs --query "select schedule from cron.job where jobname='commons-recurrences';"` — expect `0 8 * * *`.

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations/20260612000000_commons_recurrence_time.sql
git commit -m "feat(commons): recurrence generates at 08:00, occurrence due at rule time-of-day"
```

---

## Phase 4b — Sub-task data (rollup trigger, cascade RPC, member RLS, progress)

### Task 6: Roll-up trigger + cascade RPC + member RLS

**Files:** Create `supabase/migrations/20260612010000_commons_subtasks.sql`

- [ ] **Step 1: Write the migration.**

```sql
-- supabase/migrations/20260612010000_commons_subtasks.sql
-- Sub-tasks: a parent task's status is derived from its children (rollup trigger); a cascade RPC
-- completes a whole subtree; members may add/remove sub-tasks inside an existing task.

-- ── Roll-up: a task parent is 'done' iff it has task-children and all are 'done', else 'open'.
create or replace function commons.rollup_parent_status()
returns trigger
language plpgsql security definer set search_path = commons, public
as $$
declare
  pid uuid := coalesce(new.parent_id, old.parent_id);
  parent commons.nodes;
  kids int; open_kids int; target text;
begin
  if pid is null then return null; end if;
  select * into parent from commons.nodes where id = pid;
  if not found or parent.kind <> 'task' then return null; end if;

  select count(*) filter (where kind = 'task'),
         count(*) filter (where kind = 'task' and status <> 'done')
    into kids, open_kids
    from commons.nodes where parent_id = pid;

  if kids = 0 then return null; end if;            -- became a leaf again; leave its status alone
  target := case when open_kids = 0 then 'done' else 'open' end;
  if parent.status is distinct from target then
    update commons.nodes set status = target where id = pid;   -- propagates up via this same trigger
  end if;
  return null;
end;
$$;

drop trigger if exists nodes_rollup on commons.nodes;
create trigger nodes_rollup
  after insert or delete or update of status on commons.nodes
  for each row execute function commons.rollup_parent_status();

-- ── Cascade: mark every descendant task 'done' (rollup then completes ancestors). Member-gated.
create or replace function commons.complete_subtree(node_id uuid)
returns integer
language plpgsql security definer set search_path = commons, public
as $$
declare wid uuid; n int;
begin
  select workspace_id into wid from commons.nodes where id = node_id;
  if wid is null then raise exception 'node not found'; end if;
  if not commons.is_active_member(wid) then raise exception 'not a member'; end if;
  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes set status = 'done'
    where id in (select id from sub) and kind = 'task' and status <> 'done';
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function commons.complete_subtree(uuid) to authenticated;

-- ── RLS: members may add a sub-task (a task whose parent is a task) and delete ones they created.
create policy "members add subtasks" on commons.nodes
  for insert
  with check (
    commons.is_active_member(workspace_id) and kind = 'task'
    and exists (select 1 from commons.nodes p where p.id = parent_id and p.kind = 'task')
  );

create policy "members delete own subtasks" on commons.nodes
  for delete
  using (
    commons.is_active_member(workspace_id) and created_by = auth.uid()
    and exists (select 1 from commons.nodes p where p.id = parent_id and p.kind = 'task')
  );
```

- [ ] **Step 2: Apply + verify.** Run the migration, then:
`... scripts/run-sql.mjs --query "select policyname from pg_policies where schemaname='commons' and tablename='nodes' order by policyname;"` — expect `members add subtasks` + `members delete own subtasks` alongside the existing three.

- [ ] **Step 3: Functional test (rollup + cascade)** in the demo workspace, then clean up:

```
... scripts/run-sql.mjs --query "
do $$
declare p uuid; a uuid; b uuid;
begin
  insert into commons.nodes(workspace_id,kind,title,status) values ('699aaa76-a313-49b6-bb19-03b11824f056','task','TEST parent','open') returning id into p;
  insert into commons.nodes(workspace_id,parent_id,kind,title,status) values ('699aaa76-a313-49b6-bb19-03b11824f056',p,'task','c1','open') returning id into a;
  insert into commons.nodes(workspace_id,parent_id,kind,title,status) values ('699aaa76-a313-49b6-bb19-03b11824f056',p,'task','c2','open') returning id into b;
  update commons.nodes set status='done' where id=a;
  raise notice 'after 1 child done, parent=%', (select status from commons.nodes where id=p);  -- open
  update commons.nodes set status='done' where id=b;
  raise notice 'after all done, parent=%', (select status from commons.nodes where id=p);       -- done
  delete from commons.nodes where id=p;  -- cascade-deletes children
end $$;"
```
Expected notices: `open` then `done`.

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations/20260612010000_commons_subtasks.sql
git commit -m "feat(commons): sub-task rollup trigger + complete_subtree RPC + member sub-task RLS"
```

### Task 7: Data layer — `completeSubtree` + `progress`

**Files:** Modify `src/data/commons/nodeQueries.js`, `src/commons/commonsState/useWorkspaceTree.js`

- [ ] **Step 1: Add the RPC wrapper** to `nodeQueries.js`:

```js
export async function completeSubtree(id) {
  const { data, error } = await commonsDb.rpc('complete_subtree', { node_id: id });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Add `completeSubtree`, `progress`, `hasChildren`** to `useWorkspaceTree.js`. Import `completeSubtree as completeSubtreeQuery` from nodeQueries; add inside the hook before the return:

```js
  const completeSubtree = useCallback(async (id) => {
    await completeSubtreeQuery(id);
    await reload();
  }, [reload]);

  // Leaf-descendant progress for a node: { done, total } over tasks with no task-children.
  const progress = useCallback((id) => {
    let done = 0, total = 0;
    const walk = (pid) => {
      for (const child of byParent.get(pid) ?? []) {
        if (child.kind !== 'task') continue;
        const kids = (byParent.get(child.id) ?? []).filter(n => n.kind === 'task');
        if (kids.length === 0) { total += 1; if (child.status === 'done') done += 1; }
        else walk(child.id);
      }
    };
    walk(id);
    return { done, total };
  }, [byParent]);

  const hasChildren = useCallback(
    (id) => (byParent.get(id) ?? []).some(n => n.kind === 'task'),
    [byParent]);
```

Add `completeSubtree, progress, hasChildren` to the returned object, and to the import line:
`import { fetchTree, createNode, updateNode, setNodeStatus, deleteNode, completeSubtree as completeSubtreeQuery } from '../../data/commons/nodeQueries.js';`

- [ ] **Step 3: Make `toggleDone` resync rolled-up ancestors** — after the optimistic update succeeds, reload. Replace the body's `try { await setNodeStatus(...) } catch {...}` with:

```js
    try {
      await setNodeStatus(node.id, next);
      await reload();
    } catch {
      setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, status: node.status } : n)));
    }
```

(Add `reload` to `toggleDone`'s dependency array.)

- [ ] **Step 4: Lint + build.** Expected: clean.

---

## Phase 4c — Sub-task UI

### Task 8: Lists show top-level + progress chip

**Files:** Modify `src/commons/pages/BoardPage/BoardPage.jsx`, `src/commons/pages/MyTasksPage/MyTasksPage.jsx`, `src/commons/pages/AreaPage/AreaPage.jsx`, `src/commons/tasks/TaskTree.jsx`, plus `opDay` imports.

- [ ] **Step 1: BoardPage — count open *top-level* tasks** (a parent counts once). Replace `countTasks` and its use: the area card count is the number of open direct-child tasks in the area (not recursive leaves). Replace the `countTasks` function with:

```js
// Open top-level tasks directly under a node (a parent task counts as one item).
function countOpenTopTasks(byParent, parentId) {
  let open = 0, overdue = 0;
  for (const n of byParent.get(parentId) ?? []) {
    if (n.kind !== 'task' || n.recurrence) continue;
    if (n.status === 'open' || n.status === 'in_progress') {
      open += 1;
      if (isOverdue(n.due_date)) overdue += 1;
    }
  }
  return { open, overdue };
}
```

Add `import { isOverdue } from '../../opDay.js';`, and change the call `const { open, overdue } = countTasks(tree.byParent, area.id);` → `countOpenTopTasks(tree.byParent, area.id)`. (Remove the now-unused recursive walker.)

- [ ] **Step 2: MyTasksPage — progress chip, op-day filters, highest-ancestor.** Replace the imports' date helpers with `opDay` and add progress. Change the `isToday`/`isOverdue` local functions to imports: `import { isToday, isOverdue } from '../../opDay.js';` (delete the local copies). In `mine`, exclude a task whose ancestor is also assigned to me (show highest assigned ancestor):

```js
  const mine = useMemo(() => {
    const meId = membership?.id;
    const assigned = new Set(tree.nodes.filter(n => n.kind === 'task' && n.owner_id === meId).map(n => n.id));
    const ancestorAssigned = (n) => {
      let p = n.parent_id;
      while (p) { const node = tree.nodes.find(x => x.id === p); if (!node) break; if (assigned.has(node.id)) return true; p = node.parent_id; }
      return false;
    };
    return tree.nodes.filter(n =>
      n.kind === 'task' && !n.recurrence && n.owner_id === meId && !ancestorAssigned(n) &&
      (n.status === 'open' || n.status === 'in_progress' || n.status === 'missed'));
  }, [tree.nodes, membership?.id]);
```

In each row, when `tree.hasChildren(n.id)` show a progress chip instead of the checkbox:

```jsx
                {tree.hasChildren(n.id) ? (
                  (() => { const p = tree.progress(n.id); return <span className="commons-chip commons-chip--progress">{p.done}/{p.total}</span>; })()
                ) : (
                  <button type="button" className={done ? 'commons-check is-on' : 'commons-check'} role="checkbox"
                    aria-checked={done} aria-label={shell.tasks.toggleDoneAria} onClick={() => tree.toggleDone(n)}>
                    {done && <IconCheck size={14} />}
                  </button>
                )}
```

(Place the progress/checkbox as the row's leading element, replacing the current leading checkbox button.)

- [ ] **Step 3: AreaPage — list direct tasks with progress, drill to view.** `TaskTree` already renders rows; extend it to show a progress chip on tasks-with-children and route taps to the view. In `TaskTree.jsx`'s task branch, before the due chip add:

```jsx
        {ctx.hasChildren?.(node.id) && (() => { const p = ctx.progress(node.id); return <span className="commons-chip commons-chip--progress">{p.done}/{p.total}</span>; })()}
```

and render the checkbox only for leaves: wrap the existing `<button className="commons-check">` in `{!isTemplate && !ctx.hasChildren?.(node.id) && (... )}`, and for a parent task render the recur-icon slot empty (the title remains the tap target → opens the view). Pass `hasChildren` + `progress` through the `ctx` object in `TaskTree`'s `ctx` literal: add `hasChildren: tree.hasChildren, progress: tree.progress`.

- [ ] **Step 4: Progress chip style** — append to `tasks.css`:

```css
.commons-chip--progress { color: var(--commons-accent); background: var(--commons-surface-2); font-weight: 700; }
```

- [ ] **Step 5: Lint + build.** Expected: clean.

### Task 9: ConfirmDialog

**Files:** Create `src/commons/ConfirmDialog.jsx`; append styles to `src/commons/styles/CommonsLayout.css`

- [ ] **Step 1: Create `ConfirmDialog.jsx`.**

```jsx
// src/commons/ConfirmDialog.jsx
// Small centered confirm dialog. Used for the guarded force-complete (lists the open sub-tasks).

import { useEffect, useRef } from 'react';

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="commons-sheetRoot">
      <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={onCancel} />
      <div className="commons-confirm" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="commons-confirm__title">{title}</h2>
        {body && <p className="commons-confirm__body">{body}</p>}
        <div className="commons-confirm__actions">
          <button type="button" className="commons-btn commons-btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="commons-btn commons-btn--primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Styles** (append to `CommonsLayout.css`):

```css
.commons-confirm {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(420px, calc(100vw - 32px));
  background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 16px; padding: 20px;
}
.commons-confirm__title { font-size: 17px; font-weight: 800; margin-bottom: 8px; }
.commons-confirm__body { color: var(--commons-text-dim); line-height: 1.5; margin-bottom: 16px; }
.commons-confirm__actions { display: flex; gap: 10px; }
.commons-confirm__actions .commons-btn { flex: 1; }
```

- [ ] **Step 3: Lint + build.** Expected: clean.

### Task 10: `TaskViewPage` — checklist hub

**Files:** Modify `src/commons/tasks/TaskViewPage.jsx`, `src/commons/tasks/taskScreens.css`, content files

- [ ] **Step 1: Rebuild the body of `TaskViewPage`** to show sub-tasks, an add-sub-task input, progress, and the guarded cascade. Add imports:

```jsx
import { useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { IconPlus } from '../icons.jsx';
```

Inside the component (after `node` resolved), add:

```jsx
  const kids = (tree.byParent.get(node.id) ?? []).filter(n => n.kind === 'task');
  const prog = tree.progress(node.id);
  const hasKids = kids.length > 0;
  const openKids = kids.filter(k => k.status !== 'done');
  const [adding, setAdding] = useState('');
  const [confirm, setConfirm] = useState(false);

  async function addSub(e) {
    e.preventDefault();
    const t = adding.trim(); if (!t) return;
    await tree.addNode({ parentId: node.id, kind: 'task', title: t });
    setAdding('');
  }
  function onCompleteParent() {
    if (openKids.length > 0) { setConfirm(true); return; }
    tree.completeSubtree(node.id);
  }
```

Then render a sub-tasks section (after the description block, before/instead of the single complete action):

```jsx
        {hasKids && (
          <div className="commons-view__block">
            <div className="commons-view__label">{v.subtasks} · {prog.done}/{prog.total}</div>
            <ul className="commons-subs">
              {kids.map(k => {
                const kHasKids = tree.hasChildren(k.id);
                const kDone = k.status === 'done';
                return (
                  <li key={k.id} className="commons-subRow">
                    {kHasKids ? (
                      (() => { const p = tree.progress(k.id); return <span className="commons-chip commons-chip--progress">{p.done}/{p.total}</span>; })()
                    ) : (
                      <button type="button" className={kDone ? 'commons-check is-on' : 'commons-check'} role="checkbox"
                        aria-checked={kDone} aria-label={shell.tasks.toggleDoneAria} onClick={() => tree.toggleDone(k)}>
                        {kDone && <IconCheck size={14} />}
                      </button>
                    )}
                    <button type="button" className={kDone ? 'commons-subRow__title is-done' : 'commons-subRow__title'}
                      onClick={() => navigate(`/commons/${workspaceSlug}/task/${k.id}`)}>{k.title}</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <form className="commons-subAdd" onSubmit={addSub}>
          <input className="commons-field__input" value={adding} placeholder={v.addSub}
            onChange={e => setAdding(e.target.value)} aria-label={v.addSub} />
          <button type="submit" className="commons-btn commons-btn--primary" disabled={!adding.trim()} aria-label={v.addSub}>
            <IconPlus size={18} />
          </button>
        </form>
```

Replace the existing single complete action block with one that handles parent vs leaf:

```jsx
        {node.kind === 'task' && !node.recurrence && (
          <div className="commons-view__actions">
            {hasKids ? (
              <button type="button" className="commons-btn commons-btn--primary" onClick={onCompleteParent} disabled={prog.total === 0 || prog.done === prog.total}>
                <IconCheck size={18} /> {v.completeAll}
              </button>
            ) : (
              <button type="button" className={done ? 'commons-btn commons-btn--ghost' : 'commons-btn commons-btn--primary'} onClick={() => tree.toggleDone(node)}>
                {done ? v.reopen : <><IconCheck size={18} /> {v.markDone}</>}
              </button>
            )}
          </div>
        )}

        {confirm && (
          <ConfirmDialog
            title={v.confirmTitle}
            body={`${v.stillOpen}: ${openKids.map(k => k.title).join(', ')}`}
            confirmLabel={v.completeAll}
            cancelLabel={shell.form.back}
            onConfirm={() => { setConfirm(false); tree.completeSubtree(node.id); }}
            onCancel={() => setConfirm(false)}
          />
        )}
```

- [ ] **Step 2: Add `view` content** (he/en): `subtasks` ('תת-משימות' / 'Sub-tasks'), `addSub` ('הוספת תת-משימה' / 'Add sub-task'), `completeAll` ('סמן הכול כבוצע' / 'Complete all'), `confirmTitle` ('יש תת-משימות פתוחות' / 'Open sub-tasks remain'), `stillOpen` ('פתוחות עדיין' / 'Still open').

- [ ] **Step 3: Styles** (append to `taskScreens.css`):

```css
.commons-subs { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.commons-subRow { display: flex; align-items: center; gap: 10px; }
.commons-subRow__title { flex: 1; min-width: 0; text-align: start; background: none; border: 0; color: var(--commons-text); font: inherit; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commons-subRow__title:hover { text-decoration: underline; }
.commons-subRow__title.is-done { color: var(--commons-text-dim); text-decoration: line-through; }
.commons-subRow__title:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; border-radius: 4px; }
.commons-subAdd { display: flex; gap: 8px; margin: 12px 0 4px; }
.commons-subAdd .commons-field__input { flex: 1; }
.commons-subAdd .commons-btn { flex: 0 0 auto; display: grid; place-items: center; padding: 0 14px; }
```

- [ ] **Step 4: Lint + build + browser check (phase 4c).** Open a task → add sub-tasks (works as any member); each leaf has a checkbox, a parent shows `done/total` and drills in; checking the last leaf rolls the parent to done; "סמן הכול כבוצע" with open items shows the confirm listing them by name; lists/board show one level + progress chips. **User reviews, then commit.**

```bash
git add -A src/commons src/content/commons
git commit -m "feat(commons): recursive sub-task checklist hub, rollup completion, one-level lists"
```

---

## Self-review notes

- **Spec coverage:** due XOR recurrence (Task 4) · time-of-day (Tasks 2,3,5) · operational day (Tasks 1,4,5,8) · rollup trigger (Task 6) · complete_subtree cascade + guarded dialog (Tasks 6,9,10) · member sub-task RLS (Task 6) · checklist hub + add + drill-in (Task 10) · lists one-level + progress (Task 8) · board count = open top-level (Task 8).
- **Naming consistency:** `tree.progress(id) → {done,total}`, `tree.hasChildren(id)`, `tree.completeSubtree(id)`, `tree.toggleDone(node)`, `commons.complete_subtree(node_id)`, `commons.rollup_parent_status()`, `recurrence.time` `"HH:MM"`, `opDay`'s `isToday/isOverdue/currentOpDayStart`.
- **Deferred:** sub-task reordering, drag-and-drop, per-occurrence checklist snapshots, configurable op-day hour.
