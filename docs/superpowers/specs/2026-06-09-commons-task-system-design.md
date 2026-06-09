# Commons — Task System (design)

> Date: 2026-06-09. Builds on Commons foundation + workspace selection.
> Source of truth for the task hierarchy, task fields, assignment, and recurrence.

## Goal

Inside a workspace, members create and track work as a **tree**: organizing **containers** and
actionable **tasks**. Tasks can be described, assigned to a member, given a due date, completed, and
set to **recur** (daily / weekly / monthly). Overdue recurring tasks are marked **missed** while the
next instance is generated.

## Core principle (from the product spec)

All work is one unified hierarchy. Two node kinds in a single tree:
- **Container** — organizes only. Cannot be completed or assigned.
- **Task** — actionable. Can be assigned, completed, recurring, and (later) hold checklists/activity.

A node has zero or one parent and zero or more children. Hierarchy is the primary organization;
tags/views come later.

## Data model — `commons.nodes` (single table)

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → workspaces | tenant scope, on every RLS policy |
| `parent_id` | uuid → nodes (self, nullable) | null = root; `on delete cascade` |
| `kind` | text | `container` \| `task` |
| `title` | text | required |
| `description` | text | task-only, nullable |
| `status` | text | task-only: `open` \| `in_progress` \| `done` \| `missed` \| `cancelled` |
| `owner_id` | uuid → workspace_members | task-only; responsible member; `on delete set null` |
| `due_date` | timestamptz | task-only, nullable |
| `recurrence` | jsonb | task-only: `{ freq, interval, byDay? }`, nullable |
| `next_run` | timestamptz | task-only; when the next instance materializes |
| `position` | double precision | sibling ordering (gap-based, easy reorder) |
| `created_by` | uuid → auth.users | `on delete set null` |
| `created_at` / `updated_at` | timestamptz | `updated_at` bumped by trigger |

Indexes on `(workspace_id)` and `(parent_id)`. Containers keep task-only columns null (enforced in
the resolver, not a hard DB constraint, to stay flexible).

**Recurrence rule shape:** `{ "freq": "daily"|"weekly"|"monthly", "interval": 1, "byDay": [0..6] }`
(`byDay` only for weekly). A recurring task is a *template*; completing/optionally missing it does not
delete the rule — the next instance is generated on schedule.

## Access (RLS)

Reuse `commons.is_active_member(workspace_id)`:
- read: active members of the workspace see all its nodes.
- write (insert/update/delete): active members of the workspace. (Granular per-role permissions are a
  later concern; for now any active member can manage the tree.)

## Data layer (`src/data/commons/`)

`nodeQueries.js` — `fetchTree(workspaceId)`, `createNode(input)`, `updateNode(id, patch)`,
`setNodeStatus(id, status)`, `deleteNode(id)`, `moveNode(id, parentId, position)`.
`workspaceQueries.js` — add `fetchRoster(workspaceId)` (members + display names) for the assignee picker.
Components never touch Supabase — they call a `useWorkspaceTree(workspaceId)` hook that wraps these.

## UI (under `/commons/:workspaceSlug`)

The dashboard (My Tasks) becomes the **tree view**:
- **NodeRow** — container (expand/collapse caret, ＋ to add child) or task (checkbox, title, assignee
  avatar, due-date chip; tap opens detail).
- **Add bar / ＋** — add a task or container under the workspace root or any container.
- **TaskDetailSheet** — bottom sheet to edit title, description, assignee (from roster), due date, and
  recurrence.
- **RecurrenceField** — freq + interval + (weekly) day picker; renders a friendly Hebrew summary.

Mobile-first, RTL, content-driven strings, focus-visible, reduced-motion respected.

## Recurrence engine (pg_cron)

A daily `commons.run_recurrences()` SQL function: for each recurring template whose `next_run` ≤ now,
insert a concrete task instance (status `open`, due = next_run), advance `next_run` per the rule, and
mark prior un-done instances `missed`. Scheduled via `cron.schedule`. Generation logic lives in SQL so
it runs without the app.

## Phasing

- **2a — Foundation & core loop:** `nodes` table + RLS + data layer + tree hook + UI to add / list /
  complete tasks with **title, description, assignee, due date**. Flat-to-shallow tree renders already.
- **2b — Tree depth:** containers, nesting, expand/collapse, reorder/move (`position`).
- **2c — Recurrence:** rule editor + `run_recurrences()` + `cron.schedule` + `missed` handling.

## Out of scope (later increments)
Checklists, activity feed, claiming/open tasks, tags, approvals, KPI/scoring, cross-workspace views.
