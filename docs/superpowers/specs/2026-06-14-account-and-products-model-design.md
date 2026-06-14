# Account & Products Model — Design Spec

> Source of truth for how identity relates to the products under Kfar Hirur.
> Created 2026-06-14 via the brainstorming process. Supersedes the implicit "one fused account = the site"
> assumption. Each build increment gets its own implementation plan.

---

## 1. The problem

Kfar Hirur runs two products off one login, and the account is **fused** to one of them:

- **The community site** (`kfarhirur.com`) — the public home of the Kfar Hirur community: guests, customers,
  supporters, staff. Future: social projects, customer signups, updates, donations, idea submissions.
- **Commons** (`/commons`) — today an internal ops tool for the Joz ve Loz crew; envisioned as an
  action-based platform where many people run many community projects. **A product *by* Kfar Hirur**, not a
  room inside the Kfar Hirur community. Its users will largely be independent of the community.

Both share one Supabase auth session. The system implicitly treats *"has an account" = "is a Kfar Hirur
community member" = "manages their account on the community site."* That fusion is invisible while Joz is the
only workspace and everyone is genuinely community — but it is the root of a family of future problems. The
trigger that surfaced it: a "user settings" entry in Commons that pointed at the **community site's** profile
page — dropping a (future) Commons stranger into the Kfar Hirur community's living room to edit their account.

---

## 2. The model — account is a trunk, products are branches

Three layers, not two products:

```
                 ┌─────────────────────────┐
                 │   ACCOUNT (neutral)     │   the person. belongs to no product.
                 │  login · name · avatar  │   "your Kfar Hirur account" = the company's, not the site's
                 │  email · delete account │
                 └───────────┬─────────────┘
            ┌────────────────┼────────────────┐
            ▼                                  ▼
   ┌─────────────────┐                ┌─────────────────┐
   │ Community site  │                │     Commons     │   products. peers. each holds its own
   │  community      │                │  workspace      │   membership keyed to the one account.
   │  membership     │                │  memberships    │   Commons shows a "by Kfar Hirur" mark.
   └─────────────────┘                └─────────────────┘
```

- **Account** = *who you are*: one login, basic profile, security, deletion. Neutral; owned by no product.
- **Products** = *what you do*: each layers its own membership, roles, data, and brand. **A product never
  assumes you belong to another product.** Commons carries a "by Kfar Hirur" brand mark — attribution, not
  membership.

The mental test for any feature: **"Is this an *account* fact or a *product* fact?"**
- Email, password, avatar, **account name**, delete-account → **account** (neutral, shared).
- Community role, donations, timeline → **community-site product**.
- Workspaces, task assignments, per-workspace display name, role-tags → **Commons product**.

### Settings screens = two tiers
Any product's settings screen stacks:
1. **Account section** *(shared, one source of truth)* — name, avatar, email, password, delete account.
   Identical in every product; editing it edits the one account. Change your name in Commons → the community
   site reads the same change.
2. **Product section** *(only that product's settings)* — Commons: task notifications, role-tags, the
   per-workspace display-name override. Site: community notifications, donations, etc.

Nothing from one product's section leaks into the other.

---

## 3. Vocabulary

| Term | Meaning |
|---|---|
| **Account** | The neutral identity: `auth.users` + `user_profiles`. One per person. Product-agnostic. |
| **Product** | A surface a person uses: the community site, or Commons. Peers on top of the account. |
| **Community membership** | Being part of the Kfar Hirur community (the site's `user_roles`). A site fact. |
| **Workspace membership** | Being a member of a Commons workspace (`commons.workspace_members`). A Commons fact. |
| **Brand attribution** | "by Kfar Hirur" / "מבית כפר הירעור" — a mark a product shows; not membership. |

---

## 4. The seven forks (where the coupling bites) + decisions

Each is a place the code says *"the user"* as if it were one thing.

| # | Fork | Decision |
|---|---|---|
| 1 | **Account-management home** — where you edit name / delete account | Each product hosts its **own** account section over the shared account data. Commons stops linking to the site's `/profile`. |
| 2 | **Profile identity** — one name or per-workspace | **Account name/avatar is canonical**; a workspace **may override** the display name (avatar inherits). See §5. |
| 3 | **Roles** — site `user_roles` vs Commons `permission_level` | Already separate in data. Make it explicit in code: `role` is a *site* fact, not part of the neutral account. See §6. |
| 4 | **Notification / email identity** | Deferred (Bucket 3). Commons notifications will brand as the workspace/Commons, not the community. |
| 5 | **Consent / legal** — community privacy vs platform terms | Deferred (Bucket 3). One privacy/terms pair today; platform terms split later. |
| 6 | **Account deletion semantics** — spans products | Keep the existing account-level `delete-account` Edge Function as the single account-layer operation; extend its cross-product reach carefully as products grow. |
| 7 | **Brand / domain** — `kfarhirur.com` asserts "community" | Deferred (Bucket 3). One origin + one OAuth app today; separate domain only if Commons becomes its own auth authority. |

Forks 1, 2, 3, 6 are addressed now; 4, 5, 7 are deferred and explicitly written down as "not now."

---

## 5. Profile identity (fork 2) — the rule

**Account is canonical; a workspace may override the display name.**

- The **account** holds the real name (`user_profiles.display_name`) + avatar (`user_profiles.avatar_url`).
  Used everywhere by default.
- A **workspace** may override the *display name* via `commons.workspace_members.display_name` (avatar always
  inherits from the account). The workspace-typed name (entered by an admin at invite time, before the invitee
  has an account) serves as that default/fallback until the person sets their own account identity.
- Resolution helper `resolveMemberIdentity(membership, accountProfile)`:
  - `displayName = membership.display_name ?? accountProfile.displayName ?? <email local-part>`
  - `avatar = accountProfile.avatarUrl`
- This matches the schema that already exists (both `display_name` columns) and the Slack/Discord pattern.
- **Today (Joz only) this behaves like "one name"** — the override stays latent until a product surfaces it.

---

## 6. The trunk in this stack — current vs target

### What already exists and is correct (the real trunk)
- `auth.users` (Supabase) — the account. Neutral by nature. The expensive, hard-to-change piece is already right.
- One Supabase client, `storageKey: 'kfar-hirur-auth'`, shared by both products (same origin → session "just works").
- `user_profiles` (name, avatar) — neutral account data.
- `delete-account` Edge Function — already an account-layer, cross-product operation.
- **One OAuth app** (Google/Facebook) authenticates the account, not a product. Consent screen shows
  "כפר הירור" — exactly the brand attribution we want. Stays one app unless Commons becomes a separate auth
  authority (Bucket 3).

### What only pretends to be neutral (the fusion to fix)
- **`AuthContext`** returns `{ user, role, profile }` — mixing account (`user`, `profile`) with a *site* fact
  (`role` from `user_roles`). It is really the community site's auth context wearing a neutral label.
  (Commons already ignores `role`.)
- **The client file** lives at `src/data/timeline/supabaseClient.js` — the trunk filed inside a feature branch.
- **"Your profile"** is owned by the site's `ProfilePage` — the only account surface, which is why Commons had
  to point at the site.

### Wiring facts that make this cheap
- `AppProviders` (incl. `AuthProvider`) already wraps the **whole** app, including `/commons/*` — the account
  context is already reachable inside Commons.
- Commons is gated by `ProtectedRoute allowedRoles={[]}` (any authenticated user) — it already depends only on
  the account, never the site role.

---

## 7. Scope — what we build now (Bucket B)

### Bucket 1 — match the code to the model where users feel it
- **`AccountProvider` / `useAccount()`** — neutral context: `{ user, profile, loading, refreshProfile,
  signOut, deleteAccount }`. No `role`. The trunk, consumed by both products.
- **`AuthProvider` becomes the site's projection** — consumes `useAccount()` and layers `role` on top, still
  exposing `useAuth() = { user, role, profile, … }`. Existing site/admin consumers (ProtectedRoute, ProfilePage,
  admin pages, HamburgerMenu) keep working unchanged; `role` is now explicitly a community-site fact.
- **Commons migrates any `useAuth` → `useAccount`.**
- **Commons account screen** — new route `/commons/:workspaceSlug/account`, rendered in the Commons shell like
  `members`/`roles` (own chrome via `useCommonsChrome`). Fields: **name · avatar · delete account**, via the
  neutral `profileQueries` + `deleteAccount`. The "הגדרות משתמש" menu item points here — **not** `/profile`.
- **Brand mark** — a subtle "מבית כפר הירעור" in the Commons shell (drawer footer).
- **Identity resolver** — `resolveMemberIdentity` (§5), applied where a person is shown (account screen,
  members list, task owner). Rule defined once, at one layer.

### Bucket 2 — internal tidy (no user-visible change)
- **Relocate the client** `src/data/timeline/supabaseClient.js` → `src/data/core/supabaseClient.js`; update
  imports across `src/data/` (timeline, commons, auth, pageContent, admin). The trunk leaves the feature folder.
- Split realized: `AccountProvider` (neutral) is the base; `AuthProvider` is the site projection.

### Bucket 3 — deferred (written down as "not now")
Separate domain, platform-vs-community terms, notification branding, federated identity. One Supabase project,
one OAuth app, one origin — unchanged until a second tenant or standalone Commons justifies it.

---

## 8. Docs to update on implementation
- This spec (source of truth for the model).
- `docs/architecture.md` — add an **Account / Identity layer** section; reframe site + Commons as peer products;
  note `useAuth` = account + site role, `useAccount` = neutral; new client path.
- `src/commons/COMMONS.md` — Commons as a **platform product "by Kfar Hirur"**; neutral account; correct the
  current "settings → site `/profile`" note to the new `/commons/:slug/account` screen.
- `CLAUDE.md` — the top-level "what are these products" framing (account trunk + two peer products).
- `docs/superpowers/specs/2026-06-09-community-work-engine-design.md` — extend its "auth shared, authorization
  not" line with a cross-reference to this account-layer decision.

---

## 9. Non-goals / guardrails
- Do **not** split into two user databases or federated identity — the one shared identity DB is the part that
  is already correct and is what we want.
- Do **not** add a second OAuth app.
- Do **not** deepen any `role`-in-the-account coupling; `role` is a site product fact.
- Keep all new copy in content files; mobile-first; data-source opacity; protect-from-mistakes
  (delete-account stays behind the existing confirm flow).
