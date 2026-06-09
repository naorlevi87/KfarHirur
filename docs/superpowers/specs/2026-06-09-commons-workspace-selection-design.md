# Commons — Workspace Selection (design)

> Date: 2026-06-09. Builds on the Commons Engine foundation (`src/commons/`, increment 1).
> Spec source of truth for the workspace picker + URL-scoped workspace shell.

## Problem

Increment 1 hard-codes `WORKSPACE_SLUG = 'joz-ve-loz'` in `WorkspaceContext` and `useCommonsMembership`,
so `/commons` drops the user straight into the single workspace. The system is designed for N
workspaces per user; we need a selection step and URL-scoped workspace context, even though only
one workspace exists today.

## Decisions (locked)

1. **Workspace lives in the URL.** `/commons` = resolve/picker; `/commons/:workspaceSlug` = that
   workspace's shell. Shareable, refresh-stable, and the basis for deep-linking tasks/boards later.
2. **Auto-enter on a single membership.** With exactly one workspace, `/commons` redirects
   (`replace`) straight into it — no one-item screen. The picker appears only at 2+.
3. **Switch via the top bar.** The workspace name in the top bar is a button that opens a
   mobile-first **bottom-sheet switcher** (reuses the picker list).
4. A slug the user is **not** a member of (or unknown) → silent redirect to `/commons`
   (friendlier than a dead-end no-access screen).

## Architecture

### Routing (`CommonsModule`)
```
/commons                      → MembershipsGate: 0 → no-access · 1 → <Navigate replace to /commons/:slug> · 2+ → WorkspacePicker
/commons/:workspaceSlug       → WorkspaceProvider(slug) → WorkspaceGate → CommonsLayout → DashboardPage (index)
/commons/:workspaceSlug/board | /overview | /alerts → ComingSoonPage
```

### Context (two layers, separate concerns)
- **`MembershipsContext`** *(new, `commonsState/`)* — resolves the user's full list of active
  workspaces once at the `/commons` root. Exposes `{ loading, workspaces }`. Used by the picker
  and the switcher sheet. Empty list → no-access.
- **`WorkspaceContext`** *(modified)* — takes the slug from the route (`useParams`), resolves that
  one workspace + the user's membership + roles. Exposes today's shape
  `{ loading, workspace, membership, roles, isMember, permissionLevel }`. Resolves independently of
  `MembershipsContext`, so deep links work without loading the whole list. `isMember === false`
  after load → redirect to `/commons`.

### Data (`src/data/commons/workspaceQueries.js`)
- **`fetchMyWorkspaces(userId)`** *(new)* — `workspace_members → workspaces` for the user's active
  memberships; returns `[{ id, slug, name, permission_level }]`. The data source stays hidden behind
  this function (data-source opacity).
- Existing `fetchWorkspaceBySlug`, `fetchMyMembership`, `fetchMemberRoles` unchanged.

### Components
- **`WorkspacePicker.jsx`** *(new)* — mobile-first list of workspace cards → `navigate('/commons/<slug>')`.
  Presentational list extracted so the switcher sheet reuses it.
- **`WorkspaceSwitcher.jsx`** *(new)* — bottom-sheet overlay hosting the same list; opened from the
  top-bar name button; closes on pick/backdrop/Escape; focus-trapped; RTL.
- **`CommonsLayout.jsx`** *(modified)* — top-bar name → switcher trigger; tabs built from the active
  `:workspaceSlug` (`/commons/<slug>/board`, …).
- **`CommonsModule.jsx`** *(modified)* — new provider/route structure above.

### Content (`commonsShell.content.js`, he/en)
Add: `picker.title`, `picker.subtitle`, `picker.chooseAria`, `switcher.title`, `switcher.current`,
`switcher.triggerAria`. No hardcoded strings.

### Site menu (`useCommonsMembership.js`)
Switch to `fetchMyWorkspaces(user.id).length > 0` (still a cached boolean for the menu entry).

## Out of scope (YAGNI)
Creating workspaces, invitations, "remember last choice", reordering/favoriting, cross-workspace views.

## Accessibility
Cards/triggers are real buttons, keyboard-navigable, visible `focus-visible` rings; sheet traps focus
and restores it on close; `aria-label`s from content; meets IS 5568 / WCAG 2.1 AA contrast.
