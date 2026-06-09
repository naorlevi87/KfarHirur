# Commons Engine (`src/commons/`)

Self-contained task/coordination module mounted at `/commons`. Lives inside the site repo but
shares only the Supabase client, the auth session, and the deploy — its own shell, schema,
routing, content, and styles. Designed to be extractable into a standalone app later.

The module is named **commons** (collective ownership / shared responsibility — community,
shared work, activism). "Workspace" is kept as the tenant/org domain word inside it.

Full product design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

## Status
Foundation & shell + workspace selection — done. Tasks/areas land next.

## Routing
- `/commons` — resolves the user's workspaces: 0 → no-access · 1 → auto-enter (redirect) · 2+ → picker.
- `/commons/:workspaceSlug` — that workspace's shell (My Tasks). `/board` `/overview` `/alerts` are placeholders.
- A slug the user isn't a member of (or unknown) → redirect to `/commons`.

## Vocabulary
Workspace (tenant, e.g. Joz ve Loz) → Area (container) → Task. Roles (Bartender/Kitchen) are
responsibility tags, separate from `permission_level` (admin/manager/member).

## Structure
- `CommonsModule.jsx` — root: MembershipsProvider + selection logic + `/commons/*` routing (no MainLayout).
- `commonsState/MembershipsContext.jsx` — resolves all the user's workspaces; `useMemberships()`. Drives picker + switcher.
- `commonsState/WorkspaceContext.jsx` — resolves one workspace (by URL slug) + membership + roles; `useWorkspace()`.
- `WorkspacePicker.jsx` — `/commons` selection screen; exports `WorkspaceList` reused by the switcher.
- `WorkspaceSwitcher.jsx` — bottom-sheet switcher opened from the top-bar workspace name (shown only at 2+).
- `CommonsLayout.jsx` — shell: top bar (name → switcher) + content Outlet + slug-scoped bottom tab nav. No consciousness mode.
- `pages/` — DashboardPage (My Tasks), ComingSoonPage (board/overview/alerts placeholders).
- `NoAccessScreen.jsx` — shown to authenticated users with no workspace membership.
- `resolveCommonsShellContent.js` + `../content/commons/{he,en}/` — all UI copy (no hardcoded strings).
- `styles/` — own tokens + layout (independent of Naor/Shay).

## Data
- All access via `src/data/commons/` → `commonsClient.js` (`supabase.schema('commons')`) → query modules.
- Postgres `commons` schema; RLS scoped by active membership (`commons.is_active_member`, `commons.my_permission`).
- The `commons` schema must be in Supabase's *Exposed schemas* setting.
- Seed: `scripts/seed-commons-foundation.js` (Joz workspace + admins).

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
