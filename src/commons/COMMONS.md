# Commons Engine (`src/commons/`)

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

Self-contained task/coordination module mounted at `/commons`. Lives inside the site repo but
shares only the Supabase client, the auth session, and the deploy — its own shell, schema,
routing, content, and styles. Designed to be extractable into a standalone app later.

The module is named **commons** (collective ownership / shared responsibility — community,
shared work, activism). "Workspace" is kept as the tenant/org domain word inside it.

Full product design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

## Status
Foundation & shell + workspace selection — done. Tasks (tree, recurrence engine) — done.
Board/shell redesign — done: שלי = my assigned tasks, לוח = areas board, full-screen create/view/edit,
hamburger menu, FAB, task/folder permission split. **Routines & runs — done:** a recurring task is a
routine whose nested items each carry a weekday day-mask + time; it generates one dated run per
operational day (1-day look-ahead) shown in the area's temporal bands (מה היום / מה היה / מה יהיה /
הגדרות); a task screen shows only its own sub-tasks (layer-aware). Occurrence ops (resolve-missed,
defer/skip, completion attribution, claim/unclaim), one-off start/deadline windows.
Next: תמונת מצב snapshot, התראות/escalation, completion-note + per-task documentation (notes/photos/links),
routine clone, cancel-a-run-for-a-day. Member management admin links jump to the site /admin for now.

## Routing
- `/commons` — resolves the user's workspaces: 0 → no-access · 1 → auto-enter (redirect) · 2+ → picker.
- `/commons/:workspaceSlug` — shell (bottom tabs):
  - index → **שלי** (`MyTasksPage`) · `board` → **לוח** (`BoardPage`) · `board/:containerId` → area drill-in (`AreaPage`)
  - `overview` `alerts` → `ComingSoonPage` placeholders.
- `/commons/:workspaceSlug/task/new` · `task/:nodeId` · `task/:nodeId/edit` · `roles` · `members` · `account` —
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
  switch workspace, and a bottom-pinned personal group under a **"מבית כפר הירעור"** brand mark — **user settings**
  (→ Commons' own `account` screen: name, avatar, sign out, account deletion) and **back to Kfar Hirur**.
  `Fab.jsx` — create FAB on לוח/area (manager/admin).
- `icons.jsx` — inline SVG icon set (replaces emoji glyphs across the shell).
- `pages/` — `MyTasksPage` (שלי), `BoardPage` (לוח areas board), `AreaPage` (one area = the operational
  surface: four temporal bands מה היום / מה היה / מה יהיה + הגדרות definition tree), `ComingSoonPage`.
- `tasks/` — `TaskTree` (definition subtree via `rootId`, optional `filter`), `TaskFormPage`
  (create/edit; day-mask + per-item time for routine orders, start/deadline for one-offs),
  `TaskViewPage` (a task's own-layer sub-tasks with the row grammar + occurrence actions), `RecurrenceField`, `recurrence.js`.
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
- **Routines, definitions, runs.** `occurrence_date` is the layer discriminator: **null = definition**,
  **set = instance**. A task with a `recurrence` rule is a **routine** (a definition); its nested items
  are definitions, each with an optional `day_mask` (weekday subset that must stay within its parent's
  days — `commons.effective_days`) and a per-item `due_time`. `commons.run_recurrences()` (pg_cron, 08:00,
  **1-day look-ahead**) generates one **run** per operational day: a deep clone of the definition subtree
  nested *under* the routine (`template_id` → source), dropping day-masked-out branches. A separate pass
  marks genuinely-past un-done instances `missed`. Guards: recurrence only on definitions and never nested.
- **Occurrence ops.** `set_node_status` stamps completion attribution (`completed_by/at/late`);
  `resolve_missed(node, did_by)` records a missed item as a late completion (member-gated);
  `defer_occurrence(node, to_date)` (manager+) pushes one occurrence to another op-day or skips it
  (`cancelled`); `unclaim_node` releases ownership (self, or manager clears anyone).
- **One-off tasks** carry a window: `start_date` ("בתאריך", when it becomes actionable) and/or `due_date`
  ("עד", the deadline, with time). Future start → upcoming; otherwise actionable now.
- Sub-tasks: any task nests tasks (`parent_id`). A parent's status is **derived** by the
  `rollup_parent_status` trigger (done ⇔ all task-children done); `commons.complete_subtree(id)` (RPC,
  member-gated) cascades to done. A task screen lists only its own-layer children + a `done/total` chip
  (`useWorkspaceTree.progress` is layer-aware). Members may add/delete sub-tasks inside an existing task.
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

## Account & identity (neutral)
Commons is a **product by Kfar Hirur** — a peer of the community site on a neutral account layer, not a room
inside the community. It reads the account via `useAccount()` (never the site `role`), shows a "מבית כפר הירעור"
brand mark, and hosts its **own** account screen (`/commons/:slug/account`: name, avatar, sign out, delete
account) instead of sending users to the site's `/profile`. A per-workspace `display_name` may override the
account name (`src/data/commons/identity.js`; avatar always inherits from the account).
Full model: `docs/superpowers/specs/2026-06-14-account-and-products-model-design.md`.

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
Protect the user from mistakes (unsaved-changes guard + destructive-action confirmation).
