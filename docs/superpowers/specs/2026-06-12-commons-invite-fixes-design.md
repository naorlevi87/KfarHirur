# Commons invite flow — fixes design

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> 2026-06-12. Three fixes to the consent-invite flow (member management + new-member onboarding).

## Problems

1. **Invite link lands on the homepage, not the confirmation screen.** The whole `/commons/*`
   tree is behind `ProtectedRoute`. A signed-out invitee is redirected to `/login` with the invite
   path discarded; `LoginPage` always returns to `/` after sign-in. The OAuth allowlist not covering
   the deep `/commons/.../join/...` path is a secondary contributor for the Google round-trip.
2. **New members have no real name.** `accept_invite` seeds `display_name` from the email prefix and
   no last name. The admin already knows who they're inviting — capture the name at invite time.
3. **"No permissions" immediately after accepting.** After `acceptInvite`, `JoinInvitePage` navigates
   to `/commons/{slug}`, but the `WorkspaceProvider` wrapping it already resolved with `membership=null`
   and won't re-fetch (deps unchanged) → `isMember=false` → bounce to `/commons` → stale
   `MembershipsContext` → NoAccessScreen. A full reload (re-login) is the only current cure.

## Fixes

### 1 — Return-path through login (+ OAuth allowlist + fallback)
- `ProtectedRoute`: on `!user`, redirect to `/login` carrying the attempted path via router
  `state.from` (`pathname + search + hash`).
- `LoginPage`: read `from` (default `/`). Email sign-in returns to `from`. OAuth passes
  `redirectTo = origin + from` to `AuthModal` **and** stashes `from` in `localStorage`
  (`auth:returnTo`) as a fallback.
- New `PostAuthRedirect` mounted once inside the router: once auth resolves and a stashed return-path
  exists, navigate there (if not already) and clear it — covers an OAuth round-trip that ignores
  `redirectTo` (allowlist miss) and dumps the user on home.
- Supabase auth config: verified `uri_allow_list` already contains `https://kfarhirur.com/**` and
  `http://localhost:5173/**`, so the OAuth round-trip already honors the deep link — **no config change
  needed**. The bounce was purely the route/login chain above.
- Cleanup: remove the now-unreachable `!user → AuthModal` branch + unused imports in `JoinInvitePage`
  (the route is always authenticated behind `ProtectedRoute`).

### 2 — Capture first + last name at invite (both required)
- Migration (`commons` schema):
  - `alter table commons.invites add first_name text, last_name text`.
  - Recreate `create_invite(workspace_id, email, level, role_ids, first_name, last_name)` — store both.
  - `accept_invite`: seed `workspace_members.display_name = coalesce(first_name, split_part(email,'@',1))`
    and `last_name = inv.last_name` (email-prefix kept only as a safety fallback for old invites).
- `memberQueries.createInvite(...)` gains `firstName`, `lastName`; `listInvites` selects the names.
- `InviteDialog`: two required inputs (first, last) above email; **Send** disabled until
  email + first + last are filled. Reuses existing `m.firstName` / `m.lastName` copy.
- Pending-invite list shows the name next to the email.

### 3 — Refresh membership after accept
- `WorkspaceContext` and `MembershipsContext`: extract resolver into a `useCallback`, expose `refresh()`.
- `JoinInvitePage.accept()`: `await acceptInvite` → `await refreshWorkspace()` → `refreshMemberships()`
  → navigate to the workspace. The workspace resolves with the membership present → shell renders.

## Live-system changes (applied via Management API after approval)
- SQL migration on the shared Supabase DB (`commons.invites` columns + `create_invite` / `accept_invite`) — applied.
- Auth `uri_allow_list`: no change needed (already permits the deep paths).
