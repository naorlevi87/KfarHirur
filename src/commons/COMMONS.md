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
- `/commons/:workspaceSlug/task/new` · `task/:nodeId` · `task/:nodeId/edit` · `roles` · `members` —
  these render **inside** `CommonsLayout` like every other in-workspace screen, so the header + ☰ + tabs
  are always present. They declare their top-bar chrome (back chevron, title, optional action) via
  `useCommonsChrome` instead of rendering their own bar.
- A slug the user isn't a member of (or unknown) → redirect to `/commons`.
- The hamburger menu's admin links jump to the **site** admin (`/admin`, `/admin/users`), gated by the site auth role.

## Vocabulary
Workspace (tenant, e.g. Joz ve Loz) → Area (root container) → Task. Roles (Bartender/Kitchen) are
responsibility tags, separate from `permission_level` (admin/manager/member).

## Structure
- `CommonsModule.jsx` — root: MembershipsProvider + selection logic + `/commons/*` routing (no MainLayout).
- `commonsState/` — `MembershipsContext` (all workspaces; `useMemberships()`), `WorkspaceContext`
  (one workspace + membership + `permissionLevel`; `useWorkspace()`), `useWorkspaceTree` (the node tree + CRUD).
  Both membership contexts expose `refresh()` (used after accepting an invite). `CommonsChromeContext`
  (adaptive top-bar contents via `useCommonsChrome`) and `NavGuardContext` (`guardedNavigate` +
  `useUnsavedGuard`) live here too.
- `CommonsLayout.jsx` — shell: two-band sticky header (band ① ☰ + workspace name · band ② back/title +
  action — `docs/commons-standards.md` §1.1) + Outlet + bottom tab nav. Hosts the chrome + nav-guard
  providers; every in-workspace screen renders inside it.
- `CommonsMenu.jsx` — hamburger side drawer: new task (manager/admin), new folder + member/role management (admin),
  switch workspace, and a bottom-pinned personal group — **user settings** (→ the site `/profile`: name, avatar,
  account deletion) and **back to Kfar Hirur**. `Fab.jsx` — create FAB on לוח/area (manager/admin).
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

## Protecting the user from mistakes
The header + ☰ + tabs are always present, so leaving a screen is always one tap away — which makes
guarding unsaved work mandatory (see CLAUDE.md hard rule):
- **Unsaved-changes guard** — `TaskFormPage` tracks a `dirty` flag and registers it via `useUnsavedGuard`.
  Every chrome navigation (tabs, ☰ menu, back chevron, switcher, back-to-site) goes through
  `guardedNavigate`, which shows a "leave without saving?" `ConfirmDialog` when dirty. `beforeunload`
  covers browser refresh / tab-close. Save/Delete clear `dirty` and navigate directly.
- **Destructive actions** — task/folder delete, skill delete, member removal, and invite cancel all
  confirm via `ConfirmDialog`. Completion stays one-tap (reopen is the undo).

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
Protect the user from mistakes (unsaved-changes guard + destructive-action confirmation).
