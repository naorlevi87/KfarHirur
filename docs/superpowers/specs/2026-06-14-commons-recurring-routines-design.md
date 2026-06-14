# Commons — Recurring Routines & Per-Item Cadence (Design)

> Status: approved design, pre-implementation. Date: 2026-06-14.
> Supersedes the recurrence behaviour described in `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`
> for the case where a recurring task contains sub-tasks. Builds on the existing `commons` schema
> (`supabase/migrations/2026061*`) and `src/commons/tasks/`.

## 1. Problem

A real workspace task — "הזמנות יומיות מטבח" — is a **recurring routine that contains a set of items**
(the individual orders), where each item has its **own cadence**: some every day, some on specific
weekdays. The current model cannot express this, and produces duplication.

### Root cause

Two features were built independently and don't compose:

- **Recurrence** (`commons.run_recurrences`): a task with a `recurrence` rule is a *template*. Every
  operational morning the function **inserts a flat copy of that single node as a sibling** (`parent_id`
  = the template's parent), dated for the day, linked by `template_id`. It clones **one node** — it has no
  concept of children.
- **Sub-tasks**: tasks nested under a task via `parent_id`, with a rollup trigger deriving the parent's
  status.

When recurrence meets nesting, both collision modes fire:

1. **Recurring parent.** Each morning a flat, childless dated copy of the parent appears *beside* the
   template. The items (sub-tasks) stay attached to the template and are never carried into the day's copy.
   Same title appears twice — reads as "the task duplicated itself."
2. **Recurring sub-item.** A sub-item with its own rule materialises its occurrence as a **sibling under
   the same parent** — a dated copy lands right next to the item, *inside* the parent, **every single day**.
   This is the literal "it duplicated the sub-task inside the task."

The fix is a modeling decision about **where recurrence lives** and **what an occurrence is**.

## 2. Core model

### 2.1 Routine, definitions, runs

| Concept | What it is | Recurrence | Visible where |
|---|---|---|---|
| **Routine** | A recurring **task** (stays a task, not a folder). The board row. | The schedule lives **only here** (daily, or weekly-on-days). | "הגדרות" band + as run rows in temporal bands |
| **Definition item** | A node in the routine's subtree — an order. Nests arbitrarily. | **Never** — carries a **day-mask** instead. | "הגדרות" (the editable template tree) |
| **Run** | One **occurrence per operative day** = a deep clone of the routine's definition subtree, with masked-out branches dropped. | n/a (dated instance) | "מה היום / היה / יהיה" |

**Iron rules (locked):**

1. A task becomes a **routine** when given a recurrence. **Only the routine root carries a schedule.**
2. The routine's recurrence defines its **operative day set** (daily = all 7; weekly-on-days = that set).
3. Definition items **nest arbitrarily** — full decomposition is preserved.
4. Each definition item has a **day-mask ⊆ its parent's effective days** (default: inherit all). Cadence
   only **narrows** down the tree, never widens. Effective days of a node = intersection along its chain
   up to the routine root.
5. **Recurrence never nests.** No node inside a routine carries its own recurrence rule. Per-item cadence
   is expressed purely by the day-mask. (If one item ever needs a genuinely different *cycle* — e.g.
   "every 2 weeks" while the routine is daily — it does not belong inside the routine; it becomes its own
   routine. Out of scope here; weekday-masking covers all stated needs.)
6. Each operative day the routine generates **one run** = a deep clone of the definition subtree, dropping
   branches whose mask excludes that day.
7. Runs live **inside the routine** (surfaced via its hub bands), **never as loose siblings** on the board.
   The board shows the routine as **one row** with today's `done/total`.

### 2.2 Why this kills the bug

Instances are no longer flat siblings of arbitrary nodes. Only the **routine root** generates anything,
and it generates a **dated run subtree nested under itself**, discriminated from definitions by an
occurrence date (§5). Nothing is ever cloned beside a definition.

## 3. The run lifecycle (daily workflow)

1. **08:00 generation.** The op-day's run materialises (deep clone, day-mask filtered). Items appear in
   **מה היום** as `open`.
2. **During the day.** Members tick items done (one tap → recorded with *who* + *when*). Members may add
   an **ad-hoc one-off** item to today's (or tomorrow's) run. Managers may **defer / skip** an occurrence.
   An item past its target time goes **overdue** (urgent, still tickable) — *not* missed yet.
3. **Rollover (next 08:00).** Un-done items become **missed**. The run moves into **מה היה** (history).
4. **Retroactively.** A missed item can be **resolved** ("זה כן קרה — XXX עשה את זה") — flips to a
   *late* completion with attribution. Or it stays missed — a true record that it didn't happen.

Operational day = 08:00 → 08:00, per `src/commons/opDay.js`. All overdue/missed/rollover math uses it.

## 4. Occurrence operations & permissions

"Edit *this occurrence*" vs "edit *the series*" — the same split calendar apps make. Ticking, resolving,
deferring, skipping, ad-hoc adds act on **one run**. Adding/removing items or changing a day-mask/schedule
acts on the **template** and affects **future runs only**. History is immutable.

| Action | Acts on | Who |
|---|---|---|
| Tick / reopen an item | run item | any member |
| Add an ad-hoc one-off item to a run (today or tomorrow) | run | any member |
| Resolve a *missed* item ("זה כן קרה") | run item | **any member, logged** (records reality; late flag visible; captures who-did-it) |
| Defer / skip an occurrence | run item/root | **manager+** |
| Edit the routine (items, day-masks, schedule, title) | template | **manager / admin** |
| View the "הגדרות" band | template | **manager+** (members see only the temporal bands) |

### 4.1 Defer / skip flow

One occurrence action ("דחה / דלג") asks **"to when?"**:

- **דחה למחר** — close today's instance as `deferred`; ensure an instance exists on tomorrow's run.
- **דחה לתאריך אחר…** — same, to a chosen op-day.
- **לא צריך הפעם** — `skipped` (no respawn). A deliberate "not needed today," distinct from `missed`.

### 4.2 Resolve-missed flow

On a `missed` item: pick **who did it** → status becomes `done` with `completed_by` = that person,
`completed_at` = now, and a **late** flag so the audit keeps the truth. The recorder (auth.uid()) is
captured separately. Member-allowed.

### 4.3 Template edits

Editing definitions affects **future runs only** (today's run is already materialised). An explicit
**"apply to today too"** option re-syncs today's run when the manager really means it.

## 5. Data model (on `commons.nodes`)

Stay within `commons.nodes` (uniform rollup, status, claim, RLS, permissions). Add discriminators.

- **`occurrence_date date`** — the op-day a node belongs to. **null ⇒ definition** (routine root + its
  editable subtree); **set ⇒ instance** (run root + run items). This single column separates *definitions*
  from *instances* and powers the temporal-band queries.
- **`day_mask int[]`** (weekdays 0–6, 0 = Sunday) on **definition** nodes. `null` ⇒ inherit the parent's
  effective days. Validated: `day_mask ⊆ parent effective days`.
- **`recurrence` stays only on the routine root** (definition, `occurrence_date` null, `template_id` null).
  Enforce "recurrence never nests": reject a non-null `recurrence` on any node whose ancestor chain already
  contains a recurrence (app validation + a guard trigger).
- **Completion attribution:** `completed_by uuid`, `completed_at timestamptz`, `completed_late boolean`.
- **`template_id`** (exists) on instance nodes points to the **definition node** it was cloned from
  (run root → routine root; run item → its definition item) for traceability and the "apply to today" sync.
  Ad-hoc one-off items have `template_id` null (they came from no definition).
- **Status values:** existing `open | in_progress | done | missed`; add **`skipped`** and **`deferred`**
  (both closed states that remain in history).

### 5.1 Run identity

A **run root** is an instance node with `occurrence_date` set, `template_id` = routine root, `parent_id`
= routine root (it nests *under* the routine, so it is never a board sibling). Its title/owner inherit
from the routine root at generation time. Its children = the cloned, mask-filtered definition subtree,
each with `occurrence_date` = the same day.

### 5.2 `run_recurrences` change

Replace the single-node clone with a **recursive subtree clone**:

1. For each due routine (recurrence set, `occurrence_date` null, `template_id` null, `next_run` ≤ now):
2. Compute the op-day from `next_run`; per-item due time-of-day from each definition's own target time
   (§6), falling back to the routine's `recurrence.time`.
3. Insert a **run root** under the routine; recursively clone each definition descendant **whose effective
   day-mask includes this op-day**, preserving structure, with `occurrence_date` = the op-day and
   `template_id` = source definition.
4. Mark prior un-done instances of this routine `missed` (by `occurrence_date` < the new day).
5. Advance `next_run` via `commons.next_occurrence`.

Rollup (`rollup_parent_status`) and `complete_subtree` continue to operate on instance subtrees unchanged —
they already work on any task subtree.

### 5.3 Migration / cleanup

Existing sibling-style occurrences and the tangled seed example are early/seed data. The migration adds the
new columns, backfills `occurrence_date` (existing dated `template_id` rows → their `due_date`'s op-day),
re-parents existing occurrences under their routine, and reseeds the "הזמנות יומיות מטבח" example in the new
shape. No production data to preserve beyond the demo workspace.

## 6. Per-item target time

Each definition item has an optional **עד שעה** (target time), defaulting to the routine's `recurrence.time`.
It renders as a time chip on the run item and drives **that item's own** within-day overdue → end-of-day
missed transition. Items in one run can have independent deadlines (עגבניות עד 11:00, דגים עד 15:00).

## 7. Information architecture

Option **C** of the area-vs-temporal question:

- **שלי** (`MyTasksPage`) — the individual's **temporal aggregate**: "what do I do today," across all areas.
- **לוח** (`BoardPage`) — **area-first**; drilling into an area (`AreaPage`) shows that area's temporal view.
- Both surfaces share the same **four bands**:
  1. **מה היום** — every instance due today (routine runs as one row each with `done/total`, plus one-off
     dated tasks, plus ad-hoc adds). The work surface; where members live.
  2. **מה היה** — past runs/tasks, grouped by day, collapsed. Holds the **resolve-missed** action and the
     who/when audit.
  3. **מה יהיה** — light preview: upcoming runs (mask-aware: "4 פריטים, ללא דגים") + future one-off tasks.
  4. **משימות קבועות · הגדרות** — **manager+ only**; the routine *templates* (schedule + editable item
     tree with day-masks). Edits hit future runs only.

One-off (non-recurring) dated tasks and routine runs **share the temporal bands** — "מה היום" is *anything*
due today regardless of source. The "הגדרות" band holds only recurring templates.

A routine row in a temporal band → opens that **routine's own hub** (same four-band shape, scoped to one
routine: its היום / היה / יהיה, and — for managers — its definition tree).

## 8. Row grammar (inside a task / run)

Three row types, distinguishable at a glance:

| Row type | Affordance | Behaviour |
|---|---|---|
| **Quick item** (leaf, no inner content) | checkbox + title | tap to tick; records who + when |
| **Item with details** (note / target time / attachment, no children) | checkbox + title + **`›`** | `›` = "open me"; row opens its detail |
| **Parent item** (has sub-items) | caret `▸/▾` + **`done/total` chip**, *no checkbox* | status is **derived** (rollup); tap expands / opens its checklist |

Principles: **a checkbox means "complete this directly" (leaves only); a progress chip + caret means "made
of other things" (open it, don't tick it).** Completion always records attribution + timestamp (the Jolt /
Trail audit-trail norm). Reopen is the one-tap undo. This formalises the leaf-vs-parent split already
present in `TaskTree.jsx` and adds the `›` "has details" signal.

## 9. Out of scope / deferred

- **Photo/proof-of-completion** and richer per-item attachments (Jolt/Trail have these) — future.
- **Notifications** for overdue/missed — tracked separately (`alerts` placeholder).
- **Per-item non-weekday cycles** (e.g. bi-weekly within a daily routine) — modelled as a separate routine
  if ever needed (rule 5).
- **Run-level handoff note** (free text on a run, "חסר לנו לימונים") — nice-to-have, can land with or after
  the core.

## 10. Affected surfaces (for the implementation plan)

- **Schema/SQL:** new columns + status values, recursive-clone `run_recurrences`, day-mask validation +
  no-nested-recurrence guard, migration/backfill/reseed.
- **Data layer:** `nodeQueries.js` / `useWorkspaceTree` — temporal queries by `occurrence_date`, run vs
  definition separation, occurrence ops (resolve-missed, defer/skip, ad-hoc add), attribution.
- **`recurrence.js`:** day-mask helpers, effective-days intersection, per-item time defaults.
- **UI:** four-band board (`MyTasksPage`, `BoardPage`/`AreaPage`), routine hub, row grammar + `›` detail,
  per-item time field, day-mask picker (constrained to parent days), occurrence action menu, resolve-missed.
- **Permissions/RLS:** member resolve-missed (status-only, attribution), manager+ defer/skip, manager/admin
  template edits, manager+ visibility of the definitions band.

This is a cohesive but sizable change; the implementation plan should sequence it (schema + generation
first, then queries, then UI surface by surface).
