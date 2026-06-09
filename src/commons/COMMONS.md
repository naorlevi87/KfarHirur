# Commons Engine (`src/commons/`)

Self-contained task/coordination module mounted at `/commons`. Lives inside the site repo but
shares only the Supabase client, the auth session, and the deploy — its own shell, schema,
routing, content, and styles. Designed to be extractable into a standalone app later.

The module is named **commons** (collective ownership / shared responsibility — community,
shared work, activism). "Workspace" is kept as the tenant/org domain word inside it.

Full product design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

## Status
Foundation & shell + workspace selection — done. Tasks (tree, recurrence engine) — done.
Board/shell redesign — done: שלי = my assigned tasks, לוח = areas board, full-screen create/view/edit,
hamburger menu, FAB, task/folder permission split. Sub-tasks + scheduling — done: recursive sub-task
checklists (task view = hub), due-date XOR recurrence with an "עד שעה" time, 8 AM operational day.
Next: תמונת מצב snapshot, התראות, member management (admin links jump to the site /admin for now).

## Routing
- `/commons` — resolves the user's workspaces: 0 → no-access · 1 → auto-enter (redirect) · 2+ → picker.
- `/commons/:workspaceSlug` — shell (bottom tabs):
  - index → **שלי** (`MyTasksPage`) · `board` → **לוח** (`BoardPage`) · `board/:containerId` → area drill-in (`AreaPage`)
  - `overview` `alerts` → `ComingSoonPage` placeholders.
- `/commons/:workspaceSlug/task/new` · `task/:nodeId` · `task/:nodeId/edit` — full-screen create / view / edit
  (render outside `CommonsLayout` — own back bar, no tabs).
- A slug the user isn't a member of (or unknown) → redirect to `/commons`.
- The hamburger menu's admin links jump to the **site** admin (`/admin`, `/admin/users`), gated by the site auth role.

## Vocabulary
Workspace (tenant, e.g. Joz ve Loz) → Area (root container) → Task. Roles (Bartender/Kitchen) are
responsibility tags, separate from `permission_level` (admin/manager/member).

## Structure
- `CommonsModule.jsx` — root: MembershipsProvider + selection logic + `/commons/*` routing (no MainLayout).
- `commonsState/` — `MembershipsContext` (all workspaces; `useMemberships()`), `WorkspaceContext`
  (one workspace + membership + `permissionLevel`; `useWorkspace()`), `useWorkspaceTree` (the node tree + CRUD).
- `CommonsLayout.jsx` — shell: top bar (☰ menu + static workspace name) + Outlet + bottom tab nav.
- `CommonsMenu.jsx` — hamburger bottom sheet: new task (manager/admin), new folder (admin), switch workspace,
  and site-admin links (`/admin*`, gated by the site auth role). `Fab.jsx` — create FAB on לוח/area (manager/admin).
- `icons.jsx` — inline SVG icon set (replaces emoji glyphs across the shell).
- `pages/` — `MyTasksPage` (שלי), `BoardPage` (לוח areas board), `AreaPage` (one area), `ComingSoonPage`.
- `tasks/` — `TaskTree` (a subtree, via `rootId`), `TaskFormPage` (create/edit, task or folder),
  `TaskViewPage` (read-only + complete + עריכה), `RecurrenceField`, `recurrence.js`.
- `WorkspacePicker.jsx` (+ `WorkspaceList`) · `WorkspaceSwitcher.jsx` (opened from the menu) · `NoAccessScreen.jsx`.
- `resolveCommonsShellContent.js` + `../content/commons/{he,en}/` — all UI copy (no hardcoded strings).
- `styles/` — own tokens + layout (independent of Naor/Shay). Motion via `motion/react` (spring, staggered reveals).

## Data
- All access via `src/data/commons/` → `commonsClient.js` (`supabase.schema('commons')`) → query modules.
  Components never touch Supabase — they call `useWorkspaceTree` / query fns.
- Postgres `commons` schema; RLS scoped by active membership (`commons.is_active_member`, `commons.my_permission`).
- The `commons` schema must be in Supabase's *Exposed schemas* setting.
- Seed: `scripts/seed-commons-foundation.js` (Joz workspace + admins). Apply SQL via `scripts/run-sql.mjs` (Management API).
- **Node permissions:** read → any active member; write **tasks** → manager/admin (`managers write tasks`); write
  **folders/anything** → admin (`admins write nodes`). Members complete/reopen tasks through the
  `commons.set_node_status(id, status)` SECURITY DEFINER RPC (status-only) — wired in `setNodeStatus`.
- Recurrence: a task with a `recurrence` rule `{freq,interval,byDay?,time}` is a **template** (`template_id`
  null). `commons.run_recurrences()` (pg_cron, **08:00**) materializes each operational day's occurrence
  (due that day at the rule's `time`) as a sibling task linked by `template_id`, advances `next_run`, and
  marks prior un-done occurrences `missed`. A task has `due_date` XOR `recurrence`, never both.
- Sub-tasks: any task nests tasks (`parent_id`). A parent task's status is **derived** by the
  `rollup_parent_status` trigger (done ⇔ all task-children done). `commons.complete_subtree(id)` (RPC,
  member-gated) cascades a whole subtree to done. Members may insert/delete sub-tasks inside an existing
  task (`members add subtasks` / `members delete own subtasks` policies); top-level/area creation stays
  manager/admin. Lists show one level + a `done/total` chip (`useWorkspaceTree.progress`); the task view is
  the checklist hub.
- Operational day = 08:00 → 08:00 (`src/commons/opDay.js`): all today/overdue/missed/rollover math, never midnight.

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
