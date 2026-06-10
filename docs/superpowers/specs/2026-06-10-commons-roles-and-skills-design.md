# Commons — Roles (skills), member management & invites (design)

> Date: 2026-06-10. Builds on the board/shell redesign and the sub-tasks & scheduling increment.
> Activates the dormant `commons.roles` + `commons.member_roles` tables and turns them into a
> **skills** model that gates who may take a task. Adds a commons-native member-management screen,
> a roles (skills) catalogue, and a consent-based project invite flow.

## Goal

Three connected capabilities, all admin-driven:

1. **Skills gate task-taking.** A task carries required **skills** (a multi-select of `commons.roles`
   rows, e.g. "טבח פס", "מלצר", "ברמן" — or none = *"כל עובד"* = anyone). The set is an **OR** gate: a
   member is eligible if they hold **any** of the listed skills. Each member is defined by the skills they hold
   (`member_roles`). Only a member whose skills match may take a task and say "I'm doing it today"
   ("עלי"). A manager may still hand-pick a specific owner.
2. **Commons-native member management.** An admin manages `workspace_members` from inside Commons —
   permission level, display name, skills, removal — instead of the menu jumping to the *site*
   `/admin/users` (a different table, `user_roles`).
3. **Roles (skills) catalogue + consent invites.** Admins CRUD the workspace's skills, and invite
   people to the **project** by email. An invite is always a *request the invitee must approve* — no
   silent add. The system detects whether the email already has a site account and tailors only the
   delivery; a membership becomes active only on the invitee's approval.

## Vocabulary

"Role" and "skill" are the **same thing** — a `commons.roles` row. The product word surfaced to users
is **skill** ("כישור"/responsibility tag); "role" stays the table name. Skills are **not** permissions:
`permission_level` (admin/manager/member) is separate and unchanged.

## 1. Data model

### Reused (no change)
- `commons.roles (id, workspace_id, name, color, …)` — the skills catalogue. Admin-manage / member-read
  RLS already exists (from the foundation migration).
- `commons.member_roles (member_id, role_id)` — which skills a member holds. RLS already exists.

### New column on `commons.nodes`
```sql
alter table commons.nodes
  add column role_ids uuid[] not null default '{}';
```
- `role_ids` = the task's **required skills** (eligibility gate), a multi-select **OR** set.
- `role_ids = '{}'` (empty) ⇒ **"כל עובד"** — any active member may take it. "כל עובד" is simply the
  empty selection in the form's skill multi-select, **not** a magic seeded role.
- No FK on array elements; a `roles_scrub` trigger removes a deleted skill's id from every node's
  `role_ids` (replaces a per-row `on delete set null`).
- `owner_id` (existing) is unchanged — the person actually doing the task. `role_ids` and `owner_id`
  **coexist**: a manager may set `owner_id` directly; if `owner_id` is null, any member holding **any**
  of `role_ids` may self-claim.

### New table — invites
```sql
create table commons.invites (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references commons.workspaces(id) on delete cascade,
  email            text not null,
  permission_level text not null default 'member' check (permission_level in ('admin','manager','member')),
  role_ids         uuid[] not null default '{}',
  token            text not null unique,
  status           text not null default 'pending' check (status in ('pending','accepted','declined')),
  invited_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
```
Memberships are **not** created at invite time — only at accept time — so every active membership is
consented. `role_ids` are applied as `member_roles` on accept.

## 2. Skill-gated claim (`claim_node` rewrite)

The existing `commons.claim_node(node_id)` RPC gains one check. After the current guards
(node exists · is a task · caller is an active member · `owner_id is null`), add:

> If the node's `role_ids` is non-empty, require the caller's membership to hold one of them
> (`exists … member_roles … role_id = any(node.role_ids)`); otherwise raise `missing skill`.

Then set `owner_id` to the caller's membership as today. An empty `role_ids` skips the check (anyone).

**UI gating:** the "עלי" affordance shows on an unassigned task only when `node.role_ids` is empty **or**
`useWorkspace().roles` intersects it. Non-eligible members never see it. RLS/RPC enforces the
same server-side.

## 3. Screens & navigation

New routes inside `WorkspaceGate` (full-screen, outside the bottom-tab shell, own back bar — like the
task screens):

```
/commons/:slug/members      → MembersPage  (admin)        — active members + pending invites + invite
/commons/:slug/roles        → RolesPage    (admin)        — skills catalogue CRUD
/commons/:slug/join/:token  → JoinInvitePage (any member) — accept / decline a project invite
```

**CommonsMenu** (admin entries, gated by commons `permissionLevel === 'admin'`):
- `ניהול חברים` → opens the in-app `/members` screen instead of the site `/admin/users` (the old
  entry navigated to the site's `user_roles` admin — a different system; this points it at the
  workspace's own `workspace_members`).
- `ניהול כישורים` → `/roles` (new entry).

### MembersPage (admin)
- **Active members** — each row: display name · `permission_level` select (admin/manager/member) ·
  skills as a multi-select chip checklist (`member_roles`) · remove (delete the membership).
- **הזמנת חבר** action — email + permission level + skills → creates an invite (see §4) and shows the
  copyable `/join/<token>` link; the email is sent in the background.
- **הזמנות ממתינות** — sent invites (email · status) with **resend** (re-send email) and **cancel**
  (delete the invite).
- Self-guards: an admin cannot remove themselves or drop their own level if they are the **last admin**
  (checked in the RPC / data layer; UI hides the option).

### RolesPage (admin)
Plain CRUD over `commons.roles`: list each skill with its color; add (name + color), rename, recolor,
delete. Deleting a skill `set null`s it off any task (`on delete set null`) and cascades its
`member_roles`. A small color palette of tokenized swatches (no free hex entry needed).

### JoinInvitePage / pending-invite surfacing
- At `/commons` (the memberships gate) an invited user sees a **pending-invitation** section listing
  workspaces they've been invited to, with **Accept** / **Decline** — so it works even if they never
  click the emailed link.
- `/commons/:slug/join/:token` is the deep-linked version (from the email), showing the single invite
  with the same Accept/Decline.

## 4. Invite & approval flow

1. **Create** — admin → `commons.create_invite(wid, email, level, role_ids[])` (SECURITY DEFINER,
   admin-gated) → inserts an invite with a random `token`, returns `{ token }`. (Existing pending invite
   for the same email+workspace is reused/updated rather than duplicated.)
2. **Deliver** — the client (a) shows the copyable `/join/<token>` link and (b) invokes the Edge
   Function **`send-invite`** (Deno, follows the `delete-account` pattern): verifies the caller is a
   workspace admin (caller JWT), detects via service_role whether the email already has a site account,
   picks the email copy ("הצטרפ/י לפרויקט" vs "הרשמ/י לאתר והצטרפ/י"), and sends the link via **Resend**.
   The `RESEND` key lives as a function secret — never in the browser.
3. **See** — `commons.my_pending_invites()` (SECURITY DEFINER, matches `auth.email()`) → invites
   awaiting the signed-in user, joined to workspace name + role names for display.
4. **Accept** — `commons.accept_invite(token)` (SECURITY DEFINER): verifies the caller's `auth.email()`
   matches the invite's email, creates an **active** `workspace_members` row with the invite's
   `permission_level`, inserts `member_roles` for each `role_id`, and marks the invite `accepted`.
   Idempotent if the membership already exists.
5. **Decline** — `commons.decline_invite(token)` → marks the invite `declined` (no membership).

Provider-agnostic: Google / Facebook / email signups all reconcile by email. A person with no account
follows the registration link first (existing site auth), lands back in Commons, and accepts.

## 5. Data layer & state

- **`src/data/commons/roleQueries.js`** (new) — `fetchRoles(wid)`, `createRole`, `updateRole`,
  `deleteRole`; `fetchMemberRolesMap(wid)` (member_id → role[]), `setMemberRoles(memberId, roleIds)`
  (diff insert/delete on `member_roles`).
- **`src/data/commons/memberQueries.js`** (new) — `fetchMembers(wid)`, `updateMemberLevel`,
  `updateMemberDisplayName`, `removeMember`; invite wrappers `createInvite`, `myPendingInvites`,
  `acceptInvite`, `declineInvite`, `listInvites(wid)`, `cancelInvite`, plus `sendInviteEmail` (Edge
  Function invoke).
- **`fetchMemberRoles` stays** in `workspaceQueries.js` (used by `WorkspaceContext` for the current
  user's skills). The task form's existing `fetchRoster` is reused for the owner picker; a new
  `fetchRoles(wid)` feeds the skill picker.
- No change to `useWorkspaceTree`; the task form reads roles directly like it reads the roster.
- `nodeQueries` `FIELDS` gains `role_ids`; `createNode`/`updateNode` pass it through (already generic).

## 6. Task form — skills field

`TaskFormPage` (task mode) gains a **skills** multi-select (toggle chips) after the owner field:
- each workspace skill is a toggle chip; the selected set is persisted to `nodes.role_ids`. Selecting
  none = "כל עובד" (a hint shows). With no skills defined yet, a "כל עובד" hint shows instead.
- seeded from `node.role_ids` in edit mode; included in the create/edit patches alongside `owner_id`.
The owner and skills are independent fields (owner optional hand-pick; skills = eligibility OR-set).

The task **view** shows each required skill as a chip; the "עלי" claim button respects the skill gate
(§2). `TaskViewPage` / `TaskTree` claim affordances read `useWorkspace().roles` to decide visibility.

## 7. Content

All new copy in `src/content/commons/{he,en}/commonsShell.content.js`: a `members` block (title,
invite labels, level names, remove, pending-invites, resend/cancel, last-admin guard message), a
`roles` block (title, add/rename/delete, color picker, "כל עובד" label, empty state), a `join` block
(invitation title, accept/decline, who invited you), and `form.skill` + `view.skill` for the task
skill field/chip. No hardcoded strings; no hardcoded colors (role swatches are tokenized).

## Permissions summary

| Action | admin | manager | member |
|---|:--:|:--:|:--:|
| Manage members (level/display/skills/remove) | ✓ | — | — |
| Invite to project | ✓ | — | — |
| CRUD skills (roles) | ✓ | — | — |
| Set a task's required skill | ✓ | ✓ | — |
| Hand-pick a task owner | ✓ | ✓ | — |
| Take a task ("עלי") matching my skill | ✓ | ✓ | ✓ |
| Accept / decline my own invite | ✓ | ✓ | ✓ |

RLS enforces every row: `admins manage members/roles/member_roles/invites`; `claim_node` skill-gate;
SECURITY DEFINER invite RPCs check `auth.email()` / admin status.

## Out of scope (later)

Auto-email-only (copy-link is always available as fallback), per-skill task discovery feeds ("tasks
open to my skill" view), bulk member import, skill-eligibility analytics, configurable invite
expiry, and editing an invite's level/skills after it is sent (cancel + re-invite for now).

## Phasing

- **A — Skills core:** `nodes.role_ids` migration + skill-gated `claim_node` + `roleQueries` + RolesPage
  + task-form skills multi-select + claim-button gating. (Skills usable end-to-end once members have skills.)
- **B — Member management:** MembersPage (level / display name / skills / remove) + `memberQueries` +
  menu rewire to `/members`. (This is where skills get assigned to members.)
- **C — Invite & approval:** `commons.invites` + create/accept/decline/pending RPCs + `send-invite`
  Edge Function (Resend) + JoinInvitePage + pending-invite section at `/commons`.

Each phase ends with `npm run lint` (commons clean) + `npm run build` + a browser check at
`/commons/joz-ve-loz`; commit only after the user reviews in the browser.
