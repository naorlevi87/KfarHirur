# Commons Engine (`src/commons/`)

Self-contained task/coordination module mounted at `/commons`. Lives inside the site repo but
shares only the Supabase client, the auth session, and the deploy — its own shell, schema,
routing, content, and styles. Designed to be extractable into a standalone app later.

The module is named **commons** (collective ownership / shared responsibility — community,
shared work, activism). "Workspace" is kept as the tenant/org domain word inside it.

Full product design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

## Status
Increment 1 (Foundation & shell) — done. Tasks/areas land in increment 2.

## Vocabulary
Workspace (tenant, e.g. Joz ve Loz) → Area (container) → Task. Roles (Bartender/Kitchen) are
responsibility tags, separate from `permission_level` (admin/manager/member).

## Structure
- `CommonsModule.jsx` — root: WorkspaceProvider + access gate + `/commons/*` routing (no MainLayout).
- `CommonsLayout.jsx` — shell: top bar + content Outlet + bottom tab nav. No consciousness mode.
- `commonsState/WorkspaceContext.jsx` — resolves current workspace + membership + roles; `useWorkspace()`.
- `pages/` — DashboardPage (My Tasks), ComingSoonPage (board/overview/alerts placeholders).
- `NoAccessScreen.jsx` — shown to authenticated non-members.
- `resolveCommonsShellContent.js` + `../content/commons/{he,en}/` — all UI copy (no hardcoded strings).
- `styles/` — own tokens + layout (independent of Naor/Shay).

## Data
- All access via `src/data/commons/` → `commonsClient.js` (`supabase.schema('commons')`) → query modules.
- Postgres `commons` schema; RLS scoped by active membership (`commons.is_active_member`, `commons.my_permission`).
- The `commons` schema must be in Supabase's *Exposed schemas* setting.
- Seed: `scripts/seed-commons-foundation.js` (Joz workspace + admins).

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
