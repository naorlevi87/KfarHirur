# Commons — Sub-tasks & Scheduling (design)

> Date: 2026-06-10. Builds on the board/shell redesign
> (`2026-06-09-commons-board-shell-redesign-design.md`). This is the deferred "checklists" increment
> from the task-system spec, plus a fix to due-date/recurrence and an operational-day boundary.

## Goal

Three connected changes raised during review:

1. **Due date and recurrence are mutually exclusive.** A one-off task has a due **date**. A recurring
   task has no date — it has a **time-of-day deadline ("עד שעה")** that every generated occurrence
   inherits.
2. **Recursive sub-tasks.** Any task can be broken into sub-tasks, to any depth. A sub-task is either a
   leaf you check off, or a task that breaks down further. Opening a task reveals its checklist.
3. **Operational day = 08:00 → 08:00.** "Today", "overdue", "missed", and daily recurrence rollover use
   an 8 AM boundary, never midnight — so a late-night closing task still belongs to its day until 8 AM.

## Core principle — one level at a time

Lists never flatten the tree. שלי and the area board show **top-level tasks only**, each with a
roll-up `done/total` progress chip when it has sub-tasks. You descend one level by opening a task. This
keeps a standalone task like "הזמנת דגים" from drowning under the 28 sub-tasks of "סגירת מטבח".

## 1. Due date ⇄ recurrence (either/or)

The form's scheduling section is a single choice:

- **חד-פעמי (one-off)** → a due **date** (`due_date`, date-only, anchored to the operational day).
- **חוזר (recurring)** → no date. A `recurrence` rule **plus a time-of-day** (`recurrence.time`,
  `"HH:MM"`). Each generated occurrence is due on its scheduled operational day at that time.

`recurrence` rule shape becomes `{ freq, interval, byDay?, time }` where `time` is `"HH:MM"` (the
"עד שעה"). A node never has both a non-null `due_date` and a non-null `recurrence` (enforced in the
resolver/form, not a DB constraint).

`commons.next_occurrence` already preserves the time component when advancing; the only new work is
seeding the first `next_run` at the chosen time and capturing `time` in the rule.

## 2. Operational day (08:00 boundary)

A single constant `OPERATIONAL_DAY_START = 8` (hour, local). Definitions:

- **Current operational day** = if `now.hour >= 8`, today's 08:00; else yesterday's 08:00. It runs until
  the next 08:00.
- **"היום"** (My Tasks filter) = the task's deadline falls in the current operational day window.
- **"באיחור" / overdue** = the deadline is before the current operational day window started (date-only
  one-offs) or before `now` (timed occurrences).
- **"missed"** = a recurring occurrence still open once the operational day after its due has begun.
- **Recurrence generation** runs at the operational-day start: the pg_cron job moves from `0 3 * * *`
  to `0 8 * * *`. Occurrence due datetimes still carry the rule's time-of-day (which may be before 08:00,
  e.g. a 02:00 closing task — its due is the calendar moment, its operational day is the prior morning).

Client date helpers live in one module (`opDay.js`): `currentOpDay()`, `isToday(due)`,
`isOverdue(due)`. The board/MyTasks/view all use these instead of raw midnight math.

## 3. Sub-tasks — model & data

- **Areas stay containers** (top-level board cards, admin-created). **Tasks nest tasks** via `parent_id`
  to any depth. No schema change for nesting — `parent_id` already references any node.
- **Progress** of a task = over its **leaf descendants** (tasks with no children — the real checkable
  items): `done = leaf descendants with status 'done'`, `total = leaf descendants`. Shown as `16/28`.
- A task with children is never directly checkable; its status is **derived** from its children (below).

## 4. Completion — roll-up trigger + guarded cascade

A DB trigger keeps a parent task's status in sync with its children:

- `commons.rollup_parent_status()` — `AFTER INSERT/UPDATE OF status/DELETE` on `commons.nodes`. For the
  affected `parent_id` (if it is a `task`): set it `done` when it has children and **all task-children
  are `done`**, otherwise `open`. Updates only when the status actually changes, so it propagates up the
  chain and terminates. (Containers have no status and are skipped.)

Consequences:

- Checking the last open leaf auto-completes its parent, and so on up the chain.
- A parent **cannot** sit `done` with an open child — adding/reopening a child reopens ancestors.
- Therefore "completing a parent" means completing its subtree. The view's complete action on a parent
  calls a cascade RPC: `commons.complete_subtree(node_id)` (`SECURITY DEFINER`, active-member-gated) —
  marks every descendant **task** `done`; the trigger rolls the ancestors up.

**Force-complete guard (UI):** tapping "סמן הכול כבוצע" on a parent with open sub-tasks opens a
confirmation that **lists the open items by name** — *"פתוחות עדיין: הזמנת דגים, ניקוי גריל — לסמן הכול?"*
Confirm → `complete_subtree`. Cancel → nothing. Leaf tasks keep the plain check (status RPC), no dialog.

## 5. The task view becomes the checklist hub

`TaskViewPage` shows the task plus its **sub-tasks as a checklist**:

- Header: title, status/recurrence/due chips, owner, description, `done/total` progress.
- **Sub-tasks list** — each row: a checkbox (leaf) or a progress chip (has children) · title · chevron to
  open *its* view (recursive). Done rows show muted/strikethrough.
- **＋ תת-משימה** — inline add to break the task down. Available to **any active member** (see §6).
- Primary action: leaf → "סמן כבוצע" / "החזר לפתוח"; parent → "סמן הכול כבוצע" (guarded cascade).
- `עריכה` (manager/admin, per redesign) still edits the task's own fields.

Tapping a sub-task navigates to `task/:childId` — same page, one level deeper. Infinite nesting via
navigation, never a deep inline tree (good for mobile).

## 6. Lists show one level + permissions

- **שלי** — tasks assigned to me, shown at their own level with a `done/total` chip; sub-tasks are not
  listed separately. If both a task and its descendant are assigned to me, show the **highest assigned
  ancestor** only (no duplication). A sub-task assigned to me whose ancestors aren't mine still appears.
- **Area board** — area card count = **open top-level tasks** in the area (a parent counts as 1, not its
  28 leaves). The area drill-in (`AreaPage`) lists the area's direct tasks as rows with progress chips;
  tap → task view.

**Permissions (RLS):**

- **Add a sub-task** (insert a `task` whose `parent_id` is a `task`) → **any active member**. A member may
  also **delete a sub-task they created** (`created_by = auth.uid()`).
- **New top-level task** (parent null or a container) → manager/admin. **New area/folder** → admin.
  **Edit task definition** → manager/admin. **Complete/reopen** → any member (status RPC). All unchanged.

New policy `members add subtasks` (insert: active member, `kind='task'`, parent is a task) and
`members delete own subtasks` (delete: active member, `created_by = auth.uid()`, parent is a task)
sit alongside `managers write tasks` / `admins write nodes`.

## Components & files

- **DB migration:** `recurrence.time` is data-only (no DDL); add `rollup_parent_status` trigger +
  function; add `complete_subtree(uuid)` RPC; add the two member sub-task RLS policies; reschedule the
  cron job to `0 8 * * *`.
- **Data layer:** `nodeQueries` — add `completeSubtree(id)` (RPC wrapper). `useWorkspaceTree` — add a
  `progress(nodeId)` selector (leaf done/total over `byParent`) and a `completeSubtree` action.
- **Date:** `src/commons/opDay.js` — operational-day helpers (shared by MyTasks/Board/View).
- **Recurrence:** `recurrence.js` — `time` in the rule + summary ("…עד 23:00"); `RecurrenceField` gains a
  time input. `computeFirstNextRun` seeds at the rule time.
- **Form:** `TaskFormPage` — scheduling becomes a חד-פעמי/חוזר segmented choice (date XOR recurrence).
- **View:** `TaskViewPage` — checklist hub (sub-task list, ＋, progress, guarded cascade) + a small
  `ConfirmDialog`.
- **Lists:** `MyTasksPage` + `AreaPage` show top-level rows with progress chips; `BoardPage` count =
  open top-level tasks.

## Out of scope (later)

Reordering sub-tasks, drag-and-drop, per-occurrence checklist snapshots for recurring tasks,
configurable per-workspace operational-day hour (constant for now), assigning the same person across
levels de-duplication beyond "highest ancestor".

## Phasing

- **4a — Scheduling:** due XOR recurrence in the form + `recurrence.time` + `opDay.js` + reschedule cron.
- **4b — Sub-tasks data:** rollup trigger + `complete_subtree` RPC + member RLS + `progress` selector.
- **4c — Sub-tasks UI:** `TaskViewPage` checklist hub + ＋ add + guarded cascade dialog; lists show
  top-level + progress; board count = open top-level.

Each phase ends with lint + build + browser check; commit after the user reviews in the browser.
