# Commons Task System — Implementation Plan

> Builds the task system from `docs/superpowers/specs/2026-06-09-commons-task-system-design.md`.
> Three phases (2a/2b/2c), each ends with apply-to-DB / lint / build / browser check and a commit.

## Phase 2a — Foundation & core loop

**DB:** `supabase/migrations/20260610000000_commons_nodes.sql`
- `commons.nodes` table (cols per spec), indexes on `workspace_id` + `parent_id`.
- `updated_at` bump trigger.
- RLS: `members read nodes` / `members write nodes` via `commons.is_active_member(workspace_id)`.
- Explicit grants (authenticated CRUD, anon select, service_role all).
- Apply via Management API.

**Data layer:**
- `src/data/commons/nodeQueries.js` — `fetchTree`, `createNode`, `updateNode`, `setNodeStatus`, `deleteNode`.
- `src/data/commons/workspaceQueries.js` — add `fetchRoster(workspaceId)`.

**State:** `src/commons/commonsState/useWorkspaceTree.js` — hook: loads the tree for the active
workspace, exposes `{ nodes, byParent, loading, addTask, addContainer, toggleDone, saveTask, removeNode }`
with optimistic refresh. Builds a `parent_id → children[]` map for rendering.

**UI (`src/commons/tasks/`):**
- `TaskTree.jsx` — renders root children; recursion via NodeRow.
- `NodeRow.jsx` — container (caret + ＋) or task (checkbox, title, assignee avatar, due chip → opens sheet).
- `AddNode.jsx` — inline "＋ משימה חדשה" input (and add-container affordance).
- `TaskDetailSheet.jsx` — bottom sheet: title, description, assignee (roster select), due date.
- `tasks.css` — rows, checkbox, chips, sheet (reuse `commons-sheet*`).
- `DashboardPage.jsx` — render `TaskTree` for the current workspace (replaces empty state when nodes exist).

**Content:** add `tasks.*` keys (he/en): addTask, addContainer, newTaskPlaceholder, assignee, dueDate,
description, none, done, save, delete, detailTitle, etc.

**Verify:** apply migration → lint (commons clean) → build → browser: add a task, see it, complete it,
open detail, set assignee + due date. Commit.

## Phase 2b — Tree depth

- Containers can hold children; ＋ on a container adds under it. Expand/collapse persisted in component state.
- Reorder/move via `position` (gap-based; `moveNode`). Simple up/down or drag (decide at build).
- `fetchTree` already returns the whole tree; rendering recurses. Commit.

## Phase 2c — Recurrence

- `RecurrenceField.jsx` in the detail sheet: freq (daily/weekly/monthly) + interval + weekly day picker;
  Hebrew summary ("כל יום", "כל שבוע בא׳/ג׳", …). Persists `recurrence` + initial `next_run`.
- DB: `commons.run_recurrences()` (materialize due instances, advance `next_run`, mark prior `missed`);
  `cron.schedule('commons-recurrences','0 3 * * *', $$ select commons.run_recurrences() $$)`.
- Verify generation by setting `next_run` in the past and running the function manually. Commit.

## Conventions
Data-source opacity (components → hook → nodeQueries → Supabase). No hardcoded strings/colors.
Mobile-first, RTL, focus-visible, reduced-motion. File-header comments. Commit per phase after build + browser check.
