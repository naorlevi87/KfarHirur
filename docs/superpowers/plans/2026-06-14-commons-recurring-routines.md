# Commons Recurring Routines — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> This project has **no automated test suite** (see CLAUDE.md). "Verify" steps therefore use the SQL
> runner (`node --env-file=.env.local scripts/run-sql.mjs --query "…"`), `npm run lint` / `npm run build`,
> and — for UI — the dev server + browser review (the project's hard rule: never commit UI the user
> hasn't seen in the browser).

**Goal:** Let a recurring task contain nested items, each with its own weekday cadence, generating one
clean dated *run* per operative day — eliminating the duplication caused by the old single-node sibling clone.

**Architecture:** Stay within `commons.nodes`. A node is a **definition** (`occurrence_date` null) or an
**instance** (`occurrence_date` set). Only a routine root carries `recurrence`; descendant definitions carry
a `day_mask`. `run_recurrences` becomes a **recursive subtree clone** that nests each day's run under its
routine and drops masked-out branches. Three phases, each independently shippable.

**Tech Stack:** PostgreSQL (Supabase `commons` schema, pg_cron, plpgsql), React 19 + Vite, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`.

**Windows/npm note (CLAUDE.md):** run npm as
`cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" <cmd>`.
Run SQL via PowerShell or `node --env-file=.env.local scripts/run-sql.mjs`.

---

## Phase 1 — Data foundation

Single migration: `supabase/migrations/20260614000000_commons_routine_runs.sql`. Additive and idempotent.

### Task 1.1: New columns + status value + indexes

**Files:** Create `supabase/migrations/20260614000000_commons_routine_runs.sql`

- [ ] **Step 1: Write the column/status/index block** (full SQL in the migration file):
  - `occurrence_date date` — null ⇒ definition, set ⇒ instance.
  - `day_mask int[]` — weekdays 0–6 (0=Sun) on definitions; null ⇒ inherit parent.
  - `due_time time` — per-item "עד שעה" on definitions; null ⇒ inherit routine `recurrence.time`.
  - `completed_by uuid references commons.workspace_members(id) on delete set null`, `completed_at timestamptz`,
    `completed_late boolean not null default false`.
  - Reuse existing **`cancelled`** status for "לא צריך הפעם" (skip); add **`deferred`**: drop the unnamed
    check (`nodes_status_check`) and recreate with
    `('open','in_progress','done','missed','cancelled','deferred')`.
  - Index `nodes_occurrence_idx on commons.nodes(workspace_id, occurrence_date) where occurrence_date is not null`.

- [ ] **Step 2: Apply** `node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260614000000_commons_routine_runs.sql`
- [ ] **Step 3: Verify columns** — query `information_schema.columns` for the new names. Expect 6 rows.

### Task 1.2: Day helpers — `routine_days` + `effective_days`

- [ ] **Step 1:** `commons.routine_days(rule jsonb) returns int[]` — weekly+byDay ⇒ that array; else ⇒ `{0,1,2,3,4,5,6}`.
- [ ] **Step 2:** `commons.effective_days(node_id uuid) returns int[]` — walk from node up to the routine root
  (the ancestor with `recurrence` not null), base = `routine_days(root.recurrence)`, intersect every
  non-null `day_mask` along the chain. Returns the days the node actually participates.
- [ ] **Step 3: Verify** — `select commons.effective_days('<def-id>')` against a seeded routine returns the
  expected weekday subset.

### Task 1.3: Guard — recurrence never nests; recurrence only on definitions

- [ ] **Step 1:** Trigger `commons.guard_recurrence` (before insert/update of `recurrence`): if `NEW.recurrence`
  is not null, require `NEW.occurrence_date is null` (templates only) and that no ancestor has a non-null
  `recurrence`; else `raise exception`.
- [ ] **Step 2: Verify** — in a `begin … rollback` batch, attempt to set `recurrence` on a child of a routine →
  expect the exception.

### Task 1.4: Day-mask containment guard

- [ ] **Step 1:** Trigger `commons.guard_day_mask` (before insert/update of `day_mask`): when `NEW.day_mask`
  is not null and the parent is a definition under a routine, require
  `NEW.day_mask <@ commons.effective_days(parent_id)`; else exception.
- [ ] **Step 2: Verify** — attempt a child mask with a day the parent lacks → exception (in a rolled-back batch).

### Task 1.5: Rewrite `run_recurrences` as a recursive subtree clone

- [ ] **Step 1:** Replace the function. For each due routine (`recurrence` not null, `occurrence_date` null,
  `template_id` null, `next_run ≤ now()`), loop op-days (guard ≤ 400):
  1. `occ_date := date(next_run)`; mark prior un-done instances of this routine `missed`
     (run roots where `template_id = routine.id` and `occurrence_date < occ_date`, plus their descendants,
     status in `('open','in_progress')`).
  2. Insert a **run root**: `parent_id = routine.id`, `kind='task'`, `title/owner/position/created_by`
     from routine, `status='open'`, `occurrence_date = occ_date`, `template_id = routine.id`,
     `due_date = occ_date + coalesce((recurrence->>'time')::time,'20:00')` (+1 day if `< 08:00`).
  3. Recursively clone definition descendants **ordered by depth**, keeping a `jsonb` map of
     `old def id → new instance id`. Clone a def **iff** `extract(dow from occ_date)::int = ANY
     commons.effective_days(def.id)`. New `parent_id = coalesce(map[def.parent_id], run_root_id)`;
     `occurrence_date = occ_date`; `template_id = def.id`;
     `due_date = occ_date + coalesce(def.due_time, (recurrence->>'time')::time, '20:00')` (+1 day if `<08:00`).
  4. Advance `next_run := commons.next_occurrence(next_run, recurrence)`.
- [ ] **Step 2: Apply** the full migration file again (idempotent `create or replace`).
- [ ] **Step 3: Verify (transactional dry-run)** — `begin;` seed a synthetic routine with two leaf defs
  (one mask `{0}` Sun-only, one no mask) + one nested parent def, set `next_run` to yesterday 08:00,
  `select commons.run_recurrences();` then assert: exactly one run root under the routine with
  `occurrence_date = <op-day>`; the Sun-only leaf present iff op-day is Sunday; the nested parent's children
  cloned under the cloned parent (not the routine); `rollback;`. (Full SQL block lives in the migration's
  trailing comment for reuse.)

### Task 1.6: Backfill + reseed the demo routine

- [ ] **Step 1:** Backfill existing instances: `update commons.nodes set occurrence_date = (due_date at op-day)
  where template_id is not null and due_date is not null and occurrence_date is null`.
- [ ] **Step 2:** Re-shape the tangled "הזמנות יומיות מטבח" demo into the new model via
  `scripts/seed-commons-foundation.js` patterns (one routine root + day-masked order definitions; delete the
  old duplicated sibling occurrences). Run and confirm via SQL the routine has definition children
  (`occurrence_date is null`) and no stray dated siblings.
- [ ] **Step 3: Commit** `git add supabase/migrations/20260614000000_commons_routine_runs.sql scripts/… && git commit -m "feat(commons): routine/run data model — recursive run generation, day-masks, per-item time"`

---

## Phase 2 — Data layer (`src/data/commons/` + `useWorkspaceTree`)

Verification: `npm run lint` + `npm run build` + targeted manual calls. Commit per task.

### Task 2.1: Extend `nodeQueries.js`
- [ ] Add new fields to `FIELDS` (`occurrence_date, day_mask, due_time, completed_by, completed_at, completed_late`).
- [ ] `fetchToday(workspaceId, opDay)` / `fetchHistory` / `fetchFuture` — select instances by `occurrence_date`.
- [ ] `fetchDefinitions(routineId)` — definition subtree (`occurrence_date is null`).

### Task 2.2: Occurrence-op RPCs (new migration `…_commons_occurrence_ops.sql`)
- [ ] `resolve_missed(node_id uuid, did_by uuid)` — member-gated; sets `status='done', completed_by=did_by,
  completed_at=now(), completed_late=true`. Extend `set_node_status` to also stamp `completed_by=auth.uid's
  member id`/`completed_at` on a normal `done`.
- [ ] `defer_occurrence(node_id uuid, to_date date|null)` — manager+; `to_date` null ⇒ `cancelled` (skip);
  else mark current `deferred` and ensure an instance exists on `to_date` (create the target run root if absent).
- [ ] Wire `resolveMissed` / `deferOccurrence` in `nodeQueries.js`; add a `recurrence.js` `effectiveDays`/
  `dayMaskSummary` helper mirror for UI.

### Task 2.3: `useWorkspaceTree` temporal selectors
- [ ] Add `today` / `history` / `future` derived groupings keyed by `occurrence_date` (op-day from `opDay.js`);
  keep `byParent` for definition/hub rendering. Add `resolveMissed`, `deferOccurrence`, `addAdhoc(runId,title,toDate)`.
- [ ] Commit.

---

## Phase 3 — UI (browser review before each commit)

Verification: `npm run dev`, user reviews on mobile viewport, then commit.

### Task 3.1: Row grammar in `TaskTree.jsx` / hub
- [ ] Three row types: leaf checkbox / leaf-with-details `›` / parent caret+`done/total`. Add the `›`
  affordance + completion meta (who · when). Match the approved mockup (`.superpowers/brainstorm/s1/content/row-grammar.html`).

### Task 3.2: Four-band board (`MyTasksPage` temporal-aggregate, `AreaPage` area→temporal)
- [ ] Bands מה היום / מה היה / מה יהיה / משימות קבועות·הגדרות (manager+). Routine rows show today's `done/total`,
  open the routine hub. Match `board-ia.html`.

### Task 3.3: Routine hub (`TaskViewPage`) — per-routine four bands.

### Task 3.4: Editor (`TaskFormPage` + `RecurrenceField`)
- [ ] Per-item `due_time` field; day-mask picker constrained to the parent's days (others non-selectable);
  recurrence only offered on a routine root.

### Task 3.5: Occurrence actions
- [ ] "דחה / דלג" menu (מחר / תאריך אחר / לא צריך הפעם) on instances (manager+); "זה כן קרה" resolve-missed
  (pick who) in מה היה; ad-hoc "+ הוסף משימה" on a run (member). Confirm dialogs per the Commons standard.

### Task 3.6: Docs
- [ ] Update `src/commons/COMMONS.md` (Data + Status) and `docs/architecture.md` §17 to the routine/run model.

---

## Self-Review

- **Spec coverage:** model (1.1–1.5), nesting+day-mask containment (1.2,1.4), recurrence-never-nests (1.3),
  per-item time (1.1,1.5,3.4), runs/lifecycle (1.5), occurrence ops + permissions (2.2,3.5), IA (3.2,3.3),
  row grammar (3.1), migration/reseed (1.6), docs (3.6). No spec section left without a task.
- **Type/name consistency:** `occurrence_date`, `day_mask`, `due_time`, `completed_by/at/late`,
  `routine_days`, `effective_days`, `resolve_missed`, `defer_occurrence` used consistently across phases.
- **Out of scope (spec §9):** photo-proof, notifications, per-item non-weekday cycles, run handoff note — not tasked.
