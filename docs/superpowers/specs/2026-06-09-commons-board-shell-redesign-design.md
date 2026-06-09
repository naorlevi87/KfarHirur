# Commons — Board & Shell Redesign (design)

> Date: 2026-06-09. Supersedes the task-tree-on-"שלי" layout from the task-system build.
> Adopts the work-engine mockup language (`.superpowers/brainstorm/work-engine/content/`).
> Source of truth for the Commons navigation shell, the area board, the create/view/edit
> flow, and the task/folder permission split.

## Goal

Restructure the Commons UI so the day-to-day surfaces match the approved work-engine design:

- **שלי** shows *only* tasks assigned to me — never the management tree.
- **לוח** is the beautiful **areas board**: top-level folders as cards with live counts, drilling
  into a single area's tasks.
- Creating, viewing, and editing a task each get their **own full-screen** (no bottom-sheet editing).
- A **hamburger menu** holds workspace-level actions (switch workspace, member management, settings).
- A permission split governs who may create/edit vs. only complete.

The recurrence engine, `RecurrenceField`, `recurrence.js`, the `nodes` data layer, and
`useWorkspaceTree` from the previous build all carry over unchanged.

## Design language (already aligned)

The commons tokens (`src/commons/styles/commons-tokens.css`) already equal the mockup palette
(`--commons-bg #14161c`, `--commons-accent #6c8cff`, surfaces `#272b37`). This redesign is about
structure and screens, not a new palette. Reference mockups:
`nav-home-v1.html` (areas board = option B), `create-and-activity-v1.html` (FAB + create sheet),
`task-detail-v1.html` / `recurrence-claim-v1.html` (task screen + recurrence picker).

## Permission split (UI gating + DB RLS)

| Action | admin | manager | member |
|---|:--:|:--:|:--:|
| Read the workspace tree | ✓ | ✓ | ✓ |
| Complete / reopen a **task** (status only) | ✓ | ✓ | ✓ |
| Create / edit / delete a **task** | ✓ | ✓ | — |
| Create / edit / delete a **folder** (container) | ✓ | — | — |
| Member management · settings | ✓ | — | — |

`permissionLevel` is already exposed by `useWorkspace()`. The UI hides affordances by level; RLS
enforces the same split server-side (never trust the client).

## Navigation shell

```
┌───────────────────────────────┐
│ ☰   ג'וז ולוז                 │   top bar: hamburger + static workspace name
├───────────────────────────────┤
│  (screen content / Outlet)    │
│                               │
│                       ⊕ ＋    │   FAB (manager/admin), bottom-left, above tabs
├───────────────────────────────┤
│  ✓ שלי  ▦ לוח  ◉ מצב  🔔      │   bottom tabs (unchanged set)
└───────────────────────────────┘
```

**Top bar:** `☰` opens the menu; the workspace name is now a static label (its old tap-to-switch
behavior moves into the menu).

**Hamburger menu** (slide-in panel or bottom sheet, RTL, focus-trapped, Escape closes):
- `משימה חדשה` → create form (task mode) — *manager/admin*
- `תיקייה חדשה` → create form (folder mode) — *admin*
- `החלפת מרחב עבודה` → existing `WorkspaceSwitcher` — *shown only when the user has 2+ workspaces*
- `ניהול משתמשים` → `ComingSoonPage` stub — *admin*
- `הגדרות` → `ComingSoonPage` stub — *admin*
- `חזרה לאתר` → link to `/`

**FAB:** blue circular `＋`, fixed bottom-left above the tab bar, shown on **לוח** and area pages,
for **manager/admin** only. Opens the task create form, pre-filling the area when inside one
(`task/new?parent=<containerId>`).

## Screens

All screens are mobile-first, RTL, content-driven (no hardcoded strings), focus-visible,
reduced-motion respected.

### 1. שלי — My Tasks (`index`)
Tasks where `owner_id` = my membership id. Filter pills: `היום · באיחור · הכל` (default `הכל`).
Each row: title · area chip (parent folder name) · due chip · a completion checkbox. Tapping a row
opens the task view. No tree, no add bar. Empty state when nothing is assigned. Data: reuse
`useWorkspaceTree`, filter client-side by `owner_id` and derive the area name from `parent_id`.

### 2. לוח — Board (`board`)
A grid of **area cards** = root-level containers. Each card: folder name + `N פתוחות · M באיחור`
(open = descendant tasks with status `open`/`in_progress`; overdue = those with `due_date < now`).
Root-level loose tasks (parent = root, kind = task) appear in their own card/section. Tapping a card
→ `board/:containerId`. FAB present.

### 3. Area page (`board/:containerId`)
Header: `‹ back` + area name. Renders that container's subtree via the existing `TaskTree`
(nested folders expand/collapse inline; sub-folder creation via the menu). Rows open the task view;
the checkbox completes. FAB present (pre-fills this area as parent).

### 4. Create / Edit — `TaskFormPage` (`task/new`, `task/:id/edit`)
Full-screen, own `‹ back`, no bottom tabs. One component, parameterized by `mode`
(create|edit) and `kind` (task|container):
- **Task mode** fields: כותרת · מרחב (parent picker: root or any container) · תיאור · אחראי
  (owner select from roster) · יעד (due date) · חזרה (`RecurrenceField`). Save = `צור משימה` / `שמירה`.
- **Folder mode** fields: שם · מרחב (parent). Task-only fields hidden. Save = `צור תיקייה` / `שמירה`.
On save: create via `createNode` or patch via `saveTask` (which already persists `recurrence` +
`next_run`), then navigate back. Reached from FAB and the two menu entries; edit reached from the
task view's `עריכה` button.

### 5. Task view — `TaskViewPage` (`task/:id`)
Full-screen **read-only**: title; status / 🔁 recurrence-summary / due chips; description; owner.
For a missed instance, a `הוחמצה` chip. Bottom primary action `סמן כבוצע` / `החזר לפתוח`
(any member, via the status RPC). Top-right `עריכה` button → edit form, shown to manager/admin
(and only admins for folders). `‹ back` returns to the previous screen.

### 6. תמונת מצב · התראות
Remain `ComingSoonPage` stubs this round.

## Routing (`CommonsModule` / `WorkspaceGate`)

```
<Route element={<CommonsLayout/>}>            // shell: top bar + tabs + FAB + menu
  <Route index            element={<MyTasksPage/>} />
  <Route path="board"     element={<BoardPage/>} />
  <Route path="board/:containerId" element={<AreaPage/>} />
  <Route path="overview"  element={<ComingSoonPage/>} />
  <Route path="alerts"    element={<ComingSoonPage/>} />
</Route>
<Route path="task/new"      element={<TaskFormPage mode="create"/>} />   // full-screen, no tabs
<Route path="task/:id"      element={<TaskViewPage/>} />
<Route path="task/:id/edit" element={<TaskFormPage mode="edit"/>} />
```

The `task/*` routes render outside `CommonsLayout` (their own header, no bottom tabs).

## Data model & RLS (migration)

No new columns. Changes to `commons.nodes` access:

1. **Drop** policy `members write nodes`.
2. **Add** `managers write tasks` — insert/update/delete where
   `commons.my_permission(workspace_id) in ('admin','manager')` **and** `kind = 'task'`.
3. **Add** `admins write nodes` — insert/update/delete where
   `commons.my_permission(workspace_id) = 'admin'` (covers containers and anything else).
4. **RPC** `commons.set_node_status(node_id uuid, new_status text)` — `SECURITY DEFINER`. Validates
   the caller is an active member of the node's workspace, the node is a `task`, and `new_status ∈
   {open, in_progress, done}`. Updates only `status`. Grant execute to `authenticated`. This is how
   members complete tasks without table-write privileges.

`fetchTree` / `createNode` / `updateNode` / `deleteNode` are unchanged; `setNodeStatus` switches from
a table update to the RPC so member completion works under the tightened policies.

## Components & files

New (`src/commons/`):
- `CommonsMenu.jsx` — hamburger panel; permission-gated entries; reuses `WorkspaceSwitcher`.
- `Fab.jsx` — the create FAB (rendered by `CommonsLayout`, route- and permission-aware).
- `pages/MyTasksPage/` — replaces `DashboardPage`.
- `pages/BoardPage/`, `pages/AreaPage/`.
- `tasks/TaskFormPage.jsx`, `tasks/TaskViewPage.jsx`.

Changed:
- `CommonsLayout.jsx` — add `☰`, FAB, menu; name becomes a static label.
- `CommonsModule.jsx` — the routing above.
- `data/commons/nodeQueries.js` — `setNodeStatus` → RPC; add `fetchAssignedTasks` only if a
  client-side filter proves insufficient (default: filter from `useWorkspaceTree`).
- Content `src/content/commons/{he,en}/commonsShell.content.js` — menu, board, area, my-tasks pills,
  form, view, and permission-related strings.

Removed:
- `tasks/AddNode.jsx` (inline composer) and `tasks/TaskDetailSheet.jsx` (bottom-sheet editor) —
  replaced by the full-screen create/view/edit screens. `TaskTree.jsx` is kept and repurposed by
  `AreaPage` (its rows now open the task view instead of the sheet).

## Out of scope (own future increments)

Claim / open-to-role, approval flow, checklists, activity feed ("מה קורה"), role-eligibility,
the תמונת מצב snapshot, התראות, member management, and settings (the last two are stubs reachable
from the menu this round).

## Phasing

- **3a — Shell:** hamburger menu + static name + FAB scaffold + routing + permission gating helpers.
- **3b — Screens:** MyTasksPage, BoardPage, AreaPage (reads only; completion via RPC).
- **3c — Create/View/Edit:** `TaskFormPage` + `TaskViewPage`; remove `AddNode` + `TaskDetailSheet`.
- **3d — DB:** RLS split + `set_node_status` RPC; verify member-vs-manager-vs-admin write paths.

Each phase ends with lint + build + browser check; commit only after the user reviews in the browser.
