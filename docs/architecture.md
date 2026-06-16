# Kfar Hirur — Architecture Spec

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Source of truth for architecture decisions. Last updated: 2026-04-05.
> For workflow, briefing, and development process — see `workflow.md`.

---

## 1. Root Structure

```text
App -> AppProviders -> MainLayout -> CurrentPage
```

### Fixed rules
- `App` is the only root
- `AppProviders` is the only root provider wrapper — wraps `AppContext.Provider` + `AuthProvider`
- `MainLayout` is the only root layout
- `CurrentPage` is rendered inside `MainLayout` via React Router `<Outlet>`
- No additional root layouts
- No hidden parallel shells

---

## 2. Root Ownership

### `App`
Owns:
- root bootstrap
- route / current page selection (React Router v6)
- global app state source: `locale` (constant `'he'`), `mode` (random initial: naor/shay)
- random initial mode: `useState(() => Math.random() < 0.5 ? 'shay' : 'naor')`

### `AppProviders`
Owns:
- `AppContext.Provider` with `{ locale, mode, setMode }`
- `AccountProvider` — the neutral account/identity trunk (session + profile + signOut/deleteAccount), shared by every product
- `AuthProvider` — the community site's projection of the account: it adds the site `role` (`user_roles`) on top
- context injection only — no logic

### `MainLayout`
Owns:
- `SiteHeader`
- `HamburgerMenu`
- `isMenuOpen` state
- site shell / outer frame
- root theme wrapper: `data-consciousness-mode={mode}`, `dir={locale === 'he' ? 'rtl' : 'ltr'}`, `lang`
- children via `<Outlet>`

### `CurrentPage`
Owns:
- page structure only
- page composition only
- page-local wrappers if needed

### Fixed rules
- `Page` does **not** own `locale`
- `Page` does **not** own `mode`
- `Page` does **not** manually pass `locale` or `mode`
- `Page` does **not** know data source details

---

## 3. Folder Structure

```text
src/
  app/
    App.jsx                          — root, routing, mode state
    AppProviders.jsx                 — AppContext + AuthProvider
    MainLayout.jsx                   — shell layout
    SiteHeader.jsx
    HamburgerMenu.jsx
    ConsciousnessSwitcher.jsx
    ProtectedRoute.jsx               — redirects to /login if role not allowed
    resolveSiteShellContent.js       — locale resolver for header/nav copy
    appState/
      AppContext.jsx                 — context definition only
      useAppContext.js               — hook: throws if outside provider
      AccountContext.jsx             — neutral account/identity trunk: user, profile, signOut, deleteAccount (useAccount)
      AuthContext.jsx                — community-site projection: account + site role (useAuth)

  pages/
    home/
      HomePage.jsx
    kenZeOved/
      KenZeOvedPage.jsx
      resolveKenZeOvedPageData.js    — hook: fetches editable copy from DB (page_content table), merges with config
      resolveKenZeOvedUIContent.js   — resolver: static UI strings (aria-labels, placeholders) from content/site/
      ProgressBar.jsx
      DonateButton.jsx
    timeline/
      TimelinePage.jsx               — thin shell: renders TimelineFeature, handles remount key
    joinTeam/
      JoinTeamPage.jsx
    login/
      LoginPage.jsx
    privacy/
      PrivacyPage.jsx              — static privacy policy (Israeli privacy law compliance)
    terms/
      TermsPage.jsx                — static terms of service (Israeli law; used by OAuth consent screens)
    profile/
      ProfilePage.jsx              — display name + avatar editing
      ProfilePage.css
      resolveProfileContent.js     — resolver: UI strings for profile page from content/site/
    admin/
      AdminDashboardPage.jsx         — admin home with nav links
      AdminUsersPage.jsx             — user list + role management
      AdminListPage.jsx              — list of all timeline items
      AdminItemPage.jsx              — create/edit a single item + blocks
      components/
        NaorShayInput.jsx
        BlockEditor.jsx
        BlockField.jsx
        MediaInput.jsx

  features/
    auth/
      AuthModal.jsx                — modal shell: Google / Facebook / email tabs
      AuthModal.css
      EmailAuthForm.jsx            — email+password form (sign-in / sign-up / email-sent states)
    timeline/
      TimelineFeature.jsx            — root orchestrator: pan/zoom state, items, preview
      TimelineCanvas.jsx             — zoom+pan input layer (wheel, pinch, drag)
      TimelineRoad.jsx               — bezier path rendering
      TimelineNode.jsx               — node circle + counter-scaled label
      TimelinePreview.jsx            — tap-to-open preview card (in-place expand, no route change)
      resolveTimelineUIContent.js    — resolver: UI strings (zoom, hint, preview labels) from content/site/
      timelinePath.js                — bezier math, evaluateAtDate()
      timelineData.js                — all constants (zoom, scale tiers, offsets)
      timelineUtils.js               — geometry helpers (clampPan, outward normal, label sizing)

      TimelineFeature.css

  utils/
    content/
      getText.js                     — safe key accessor, returns '' for missing keys

  content/
    site/
      he/
        siteShell.content.js         — header, nav, auth, admin labels
        timeline.content.js          — UI strings (zoom buttons, preview labels etc.)
        kenZeOved.content.js         — static UI constants (aria-labels, placeholder labels); editable copy lives in Supabase via page_content table
        profile.content.js           — UI strings for profile editing page
      en/
        (mirrors he/ — scaffolded for future English support; locale hardcoded to 'he' in App.jsx)

  data/
    core/
      supabaseClient.js              — Supabase client (anon key); the neutral account/DB handle shared by all products
    timeline/
      timelineQueries.js             — fetchTimelineItems(), fetchTimelineItemBySlug()
      resolveTimelineItem.js         — resolves raw DB item → semantic payload (geometry optional)
      resolveBlock.js                — routes block_type to correct resolver
      useTimelineItems.js            — hook: all items, resolved for current mode + geometry
      useTimelineItem.js             — hook: single item by slug, no geometry
      blockResolvers/
        text.js / image.js / video.js / link.js / cta.js
    pageContent/
      pageContent.queries.js         — CRUD for page_content table: fetchPageContent(), upsertPageContent(), upsertPageContentBatch(), deletePageContentRows()
      resolvePageContent.js          — buildDbOverlay(rows, mode): builds a payload-shaped object from DB rows filtered by mode; deepMerge(target, source): merges DB overlay over static defaults
      kenZeOved.schema.js            — field path + mode shape for the kenZeOved page
      home.schema.js                 — field path + mode shape for the home page
    admin/
      timelineAdminQueries.js        — CRUD: fetchAllItems, fetchItemBySlug, create/update/deleteItem, blocks
      eventTypes.js
    auth/
      authQueries.js                 — fetchUserRole()
      profileQueries.js              — fetchUserProfile(), upsertUserProfile(), uploadAvatar()

  styles/
    globals.css                      — tokens, layout primitives only
    app/
      SiteHeader.css
      HamburgerMenu.css
      ConsciousnessSwitcher.css
      KenZeOvedPage.css

  assets/
    images/

supabase/                            — Supabase config / migrations (if any)
```

### Fixed rules
- `app/` = global shell + global app state + root providers only
- `pages/` = route pages + page-local helpers/resolvers only
- `features/` = self-contained subsystems (timeline, etc.)
- `utils/` = truly reusable generic utilities
- `content/` = static locale-based authored content only — no resolvers, no logic
- `data/` = DB / API / dynamic access layer only
- `styles/globals.css` = tokens + layout primitives only — no page or component blocks

---

## 4. Routing

```
/                            → HomePage              (public, under MainLayout)
/ken-ze-oved                 → KenZeOvedPage         (public)
/timeline                    → TimelinePage           (public)
/timeline/:slug              → TimelinePage           (public — TimelineFeature expands preview in-place)
/join-team                   → JoinTeamPage           (public)
/login                       → LoginPage              (no MainLayout)
/privacy                     → PrivacyPage            (no MainLayout — static, required by Israeli privacy law)
/terms                       → TermsPage              (no MainLayout — static, paired with /privacy for OAuth consent screens)
/profile                     → ProfilePage            (ProtectedRoute: any authenticated user, under MainLayout)
/admin                       → AdminDashboardPage     (ProtectedRoute: admin|editor, under MainLayout)
/admin/users                 → AdminUsersPage         (ProtectedRoute: admin|editor)
/admin/timeline              → AdminListPage          (ProtectedRoute: admin|editor)
/admin/timeline/items/new    → AdminItemPage          (ProtectedRoute: admin|editor)
/admin/timeline/items/:slug  → AdminItemPage          (ProtectedRoute: admin|editor)
```

**Router:** the app uses a React Router **data router** (`createBrowserRouter` + `RouterProvider` in
`App.jsx`); the whole route tree above lives under a single catch-all data route. This is deliberate —
it makes `useBlocker` available, which Commons' unsaved-changes guard relies on to intercept *every*
navigation (including the browser / phone hardware back, a POP a manual guard can't see). Descendant
`<Routes>` (e.g. inside `CommonsModule`) keep working unchanged under it.

`ProtectedRoute` uses `useAuth()` to check `role`. Redirects to `/login` if not authenticated.
- `allowedRoles={[]}` — any authenticated user (used for `/profile`)
- `allowedRoles={['admin','editor']}` — restricted roles only

---

## 5. Authentication (Supabase)

- **Project:** `kqlfvwlzayinngrgafec.supabase.co`
- **Auth:** Supabase email/password auth
- **Roles table:** `user_roles` — columns: `user_id`, `role` (enum: `admin | editor | member`)
- **RLS:** enabled on `timeline_items` and `timeline_item_blocks`
- **AccountContext** (the neutral trunk) subscribes to `supabase.auth.onAuthStateChange` → exposes
  `{ user, profile, loading, refreshProfile, signOut, deleteAccount }` — **no role**. Both products consume it via `useAccount()`.
  - `profile`: `{ displayName, avatarUrl }` — fetched from `user_profiles` table on sign-in
- **AuthContext** is the **community site's projection**: it consumes `useAccount()` and layers the site `role`
  (`user_roles`) on top, exposing `{ user, role, profile, loading, refreshProfile }` via `useAuth()`.
  `role` is a community-site fact — Commons never reads it (it uses `useAccount`). See §18.
- **Hooks:** `useAccount()` (neutral) from `AccountContext.jsx`; `useAuth()` (site) from `AuthContext.jsx`
- **Auth UI:** `AuthModal` (in `features/auth/`) — rendered by `MainLayout`, opened via `onOpenAuth` prop passed to `HamburgerMenu`

### Admin users
- `naorlevi87@gmail.com` — Naor (owner, admin)
- `sknic83@gmail.com` — Shay (pending: create account → grant admin via `user_roles`)

### Service role key
- Stored as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Used only in local scripts (never exposed to browser, never committed to git)
- Required for DB writes that bypass RLS (seeding, admin scripting)

### Account deletion (privacy compliance)
Users can permanently delete their account, per the Israeli Privacy Protection Law (חוק הגנת הפרטיות).
The `delete-account` Edge Function (service role) removes the user's `auth.users`, `user_profiles`, and
`user_roles` rows, deletes the avatar file under `avatars/{userId}/`, and nullifies
`page_content.updated_by` (audit rows are kept; the user reference is cleared). FK cascades from
`auth.users` enforce the row deletions.

---

## 6. App State

`AppContext` exposes `{ locale, mode, setMode }` only.

- Access via `useAppContext()` — throws if outside provider tree
- `locale` is currently hardcoded `'he'` in `App.jsx`
- `mode` starts randomly: `Math.random() < 0.5 ? 'shay' : 'naor'`
- `setMode` is the React state setter — calling it triggers a full re-render of all context consumers

### Mode reactivity rule — critical
When storing an item reference in component state that should reflect mode changes:
- **Do NOT** store the full item object. Mode changes recompute `items` but old state objects stay stale.
- **DO** store only the item ID (`previewId`), and derive the live item via `items.find(i => i.id === previewId)` on each render.

This pattern is implemented in `TimelineFeature.jsx` for `previewId`/`previewItem`.

---

## 7. The Two Core Systems

### Consciousness Mode (Naor / Shay)

Two visual/emotional personas:
- **Naor** = cool blue/purple
- **Shay** = warm coral/honey

Mode stored in `AppContext`. Applied as `data-consciousness-mode` on `.main-layout`. All color tokens are CSS custom properties defined in `globals.css` — Naor is the default, Shay overrides via `[data-consciousness-mode="shay"]`.

Mode-branching on content happens **inside resolvers** — never at the render layer. Leaf components receive pre-resolved content with no knowledge of mode.

`ConsciousnessSwitcher.jsx` is the toggle — `<button role="switch">` in the header.

### Content / i18n

All static copy lives in `src/content/site/{he,en}/` as plain JS objects.
- `siteShell.content.js` — header, nav, consciousness labels
- `kenZeOved.content.js` — fundraising page with full naor/shay branching
- `timeline.content.js` — timeline UI strings

Resolver functions pick the right locale and mode branch. `getText(contentObj, 'key')` is a safe accessor — returns `''` for missing keys.

**Timeline item content** lives in Supabase (`naor_title`, `shay_title`, `naor_label`, `shay_label`, per-block `content` JSONB with naor/shay sub-objects).

---

## 8. Data Source Opacity — Hard Rule

**A component must never know where its data comes from.**

```
Component → calls fn(params) → receives payload → renders
                 ↑
          resolver owns this:
          reads locale, mode, DB, static — whatever is needed
          component never sees any of it
```

- No component knows about Naor / Shay mode
- No component knows about DB vs local vs static
- No component calls a content file or a DB directly

Corollary: **do not add `naor`/`shay` sub-objects inside component props or JSX.** Mode-branching happens inside the resolver/data function, never at the render layer.

---

## 9. Resolver Pattern

Resolvers are **local wrapper patterns**, not a global central system.

- Live next to the layer they serve (page folder, feature folder, `app/` folder)
- May assemble content + data + style config and forward a semantic payload downward
- Must **not** define page structure or own full leaf schemas
- Export both a pure function and a hook from the same file (see `resolveKenZeOvedPageData.js`)
- `content/` is content-only — resolvers do not live inside it

---

## 10. Timeline Feature

Full documentation: `docs/features/timeline.md`

### Architecture summary

`TimelineFeature` is the root orchestrator. It owns:
- Pan/zoom MotionValues (`worldX`, `worldY`, `worldScale`) — 60fps without React re-renders
- `currentScale` React state — only updated when `worldScale` crosses a visibility threshold
- `previewId` / `expanded` state — preview is derived (`items.find(...)`) not stored
- Item fetch via `useTimelineItems()` — resolves for current mode
- `useTimelineItems` holds a module-level cache (`cachedRaw`) so remounts within the same session skip the Supabase fetch

### Item visibility tiers (min_scale)
| Constant | Value | Meaning |
|---|---|---|
| SCALE_ALWAYS | 0 | Always visible — main milestones |
| SCALE_MID | 0.3 | Visible at mid zoom |
| SCALE_CLOSE | 0.9 | Visible only when close |

`min_scale` is stored per item in Supabase. Editable via `/admin/timeline/items/:slug`.

### Preview → item detail navigation
1. Tap node → `handleNodeTap` zooms if needed to reveal the next tier, pans camera to preview center, sets `previewId`
2. `TimelinePreview` renders — `previewItem` derived from `items.find(i => i.id === previewId)` each render
3. "קרא עוד..." → `setExpanded(true)`, navigates to `/timeline/:slug` (carrying `locationState` to preserve key)
4. `TimelinePreview` expands in-place via `layout` animation (same Framer Motion node) — no full-screen route change
5. Close (×) → `setExpanded(false)`, navigates to `/timeline` (carrying `locationState`)
6. `TimelinePage` key: `state?.menuNav ?? 'tl'` — only menu navigations (which set `state.menuNav`) remount `TimelineFeature`. Expand/close navigations preserve the instance.
7. `savePosition()` / `sessionStorage` is no longer used for preview expand (pan stays live). Reserved for future use if a full-screen item page is ever added.

### Label placement
Always horizontal. Placed by outward normal of bezier path. SVG Hebrew RTL quirk: `textAnchor="end"` = LEFT visual edge. Full algorithm in `docs/features/timeline.md`.

### Zoom
- Wheel, pinch, +/− buttons all call `handleZoom(newScale, originX, originY)`
- Zoom-toward-pointer math: `newPan = origin - worldPt * newScale`
- `wheel` and `touchmove` registered with `{ passive: false }` via `addEventListener` (React's synthetic events are passive — can't preventDefault)

### Pan clamping
- Pan is clamped in `clampPan(x, y, scale)` (exported from `timelineUtils.js`)
- Rule: canvas must cover at least 70% (`PAN_GUARD = 0.7`) of the viewport on each axis
- Applied in `TimelineCanvas.jsx` (pointer/touch drag) and `TimelineFeature.jsx` (zoom + node tap)
- `TimelineCanvas.jsx` does NOT use Framer Motion `drag` — manual `onPointerDown/Move/Up` handlers to apply clamping on every move

### Node tap zoom
- Tapping a node only zooms if the current scale hasn't yet crossed the threshold needed to reveal the next tier below it
- Tier-0 items (SCALE_ALWAYS): zoom to SCALE_MID if `currentScale < SCALE_MID`
- Tier-1 items (SCALE_MID): zoom to SCALE_CLOSE if `currentScale < SCALE_CLOSE`
- Tier-2 items (SCALE_CLOSE): never zoom — only pan
- Logic lives in `handleNodeTap` in `TimelineFeature.jsx`

---

## 11. Admin System

Protected at `/admin/**` via `ProtectedRoute` (requires `admin` or `editor` role).
All admin routes render under `MainLayout` (SiteHeader + HamburgerMenu visible). No separate admin shell.

Admin CSS uses its own token set (`--color-bg`, `--color-accent`, etc.) that does **not** respond to consciousness mode — intentional. Admin is a work tool, not part of the site experience.

### AdminListPage
- Lists all timeline items (all statuses)
- Links to create new or edit existing

### AdminItemPage
- Create or edit a single timeline item
- Fields: slug, date, event_type, size, status, visibility, **min_scale** (zoom tier), naor_title/shay_title, naor_label/shay_label
- Block editor: add/edit/reorder/delete content blocks (text, image, video, link, cta)
- All writes go through `timelineAdminQueries.js`

### Block types
`text | image | video | link | cta | youtube | facebook | instagram`

`text / image / video / link / cta` — have a `content` JSONB with naor/shay sub-objects.
`youtube / facebook / instagram` — embed blocks; URL is shared across modes (resolved by `resolveEmbedBlock`).

---

## 12. Email / SMTP

- Provider: **Resend**
- Key name: `KfarHirur` (ID: `eba83c8e-9b86-4ea0-9ac5-017c78718f0b`)
- Permission: `sending_access`
- Key owner: naorlevi87@gmail.com
- Actual token stored in `.env.local` as `RESEND_API_KEY` — never committed

---

## 13. OAuth Consent Screen & Legal Identity

**Canonical facts for any OAuth provider setup** (Google Cloud Console, Meta for Developers, Apple, etc.). When onboarding a new provider, copy these values into the provider's consent/app settings — do not invent new values.

### Company identity
| Field | Value |
|---|---|
| App name (display) | `כפר הירור` |
| Legal entity | `כפר הירעור בע"מ` (ח.פ 515647725) |
| Registered address | התנופה 7, תל אביב יפו |
| Primary domain | `kfarhirur.com` |
| Support email (user-facing) | `office@jozveloz.com` |
| Developer/owner email | `naorlevi87@gmail.com` |

### Legal URLs (live)
| URL | Purpose |
|---|---|
| `https://kfarhirur.com/privacy` | Privacy policy — required by Israeli privacy law; required by every OAuth consent screen |
| `https://kfarhirur.com/terms` | Terms of service — required by some OAuth providers and for Google app verification |
| `https://kfarhirur.com` | Application home page (consent screen "Home page" field) |

### Authorized domains (for OAuth consent screens)
- `kfarhirur.com`

### OAuth redirect URIs currently in use
- Supabase callback: `https://kqlfvwlzayinngrgafec.supabase.co/auth/v1/callback`
- Local dev: `http://localhost:5173` (add per provider when testing locally)

### Rules
- **Never fork these values into provider-specific copies** — if the company address changes, this section is the single place to update
- **Changes to `/privacy` or `/terms` content** must keep the URLs stable — providers cache and sometimes re-verify these
- **When Google/Facebook/etc. asks for a logo** — upload the same site logo everywhere, no per-provider variants
- Support email shown to end users is always `office@jozveloz.com`, not a personal Gmail

---

## 14. Layer Ownership

| Layer | Owns |
|---|---|
| App | `locale`, `mode`, global context, routing |
| Page | page structure, page composition, page-local resolvers/hooks |
| Feature | subsystem logic, feature-local layout, feature-local validation |
| Leaf component | exact payload shape, rendering |

---

## 15. Styling Rules

- `globals.css` — tokens, layout primitives, tiny shared elements only
- Large self-contained components: own CSS file in `styles/app/`, imported directly by the component
- Feature CSS: lives inside the feature folder (e.g., `TimelineFeature.css`)
- Page CSS: lives inside the page folder (e.g., `TimelineItemPage.css`)
- Tailwind 4 utilities for layout/spacing
- No hardcoded colors — always `var(--...)` from `globals.css`
- RTL via `dir` attribute on `.main-layout` (set by `MainLayout.jsx`)
- `min-h-[100dvh]` not `h-screen` — no fixed pixel dimensions that break on small viewports

---

## 16. Non-Negotiable Rules

1. Root structure is fixed: `App -> AppProviders -> MainLayout -> CurrentPage`
2. Exactly **one root layout**
3. `App` owns `locale` and `mode`
4. `Page` never manually passes `locale` or `mode`
5. Use built-in React mechanisms first — composition, props, Context, custom hooks
6. Do **not** invent custom infrastructure when a standard solution already fits
7. Resolver is a **local wrapper pattern** — not a giant central system
8. Leaf requests semantic payloads only — never raw content/data/style categories
9. `content/` is content-only — resolvers do not live inside it
10. `content/` and `data/` remain separate layers
11. Feature-local layout variation stays inside the feature
12. Timeline is a feature, not a root layout concern
13. Every decision happens **once**, at the correct layer
14. Mobile-first validation — desktop is a separate pass
15. **Never store full item objects in state when they must reflect mode changes** — store ID, derive item from live `items` array
16. **Never commit without user seeing the result in browser first**
17. `SUPABASE_SERVICE_ROLE_KEY` stays in `.env.local` only — never committed, never exposed to browser

---

## 17. Commons Engine (separate module)

The Community Commons Engine is a self-contained module at `src/commons/`, mounted at `/commons`,
sharing only auth + the Supabase client + deploy with the site. It has its own `commons` Postgres
schema, shell, routing, content, and styles, and is built to be extractable later.

- Module docs: `src/commons/COMMONS.md`
- Design spec: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`;
  routine/run model: `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`.
- **Tasks model (high level):** one `commons.nodes` tree; a recurring task is a *routine* whose nested
  items carry weekday day-masks + times and generate a dated *run* per operational day (08:00). An area
  shows temporal bands (today / earlier / upcoming) + a routine-definition section; a task screen shows
  only its own sub-tasks. One-off tasks have a start/deadline window. Detail lives in `COMMONS.md`.
- Not under `MainLayout`; no consciousness mode. Access requires active `commons.workspace_members`.

---

## 18. Account & Products model

Full spec: `docs/superpowers/specs/2026-06-14-account-and-products-model-design.md`.

Kfar Hirur runs **two products on one login**, organized as three layers:

```
ACCOUNT (neutral trunk)  →  one login, name, avatar, email, delete-account. Belongs to no product.
   ├─ Community site      →  product: you are part of the Kfar Hirur community (site `role`).
   └─ Commons             →  product by Kfar Hirur: you are a member of workspaces. "by Kfar Hirur" = a brand mark.
```

- **Account = neutral trunk:** `auth.users` + `user_profiles`, the `data/core/supabaseClient.js` handle, and
  `AccountContext`/`useAccount`. One OAuth app (Google/Facebook) authenticates the **account**, not a product.
- **Products are peers** on top. A product never assumes you belong to the other. Site `role` (`user_roles`) and
  Commons `permission_level` (`workspace_members`) are separate; neither is an account fact.
- **The test for any feature:** *account fact* (email, password, avatar, account name, delete-account → neutral,
  shared) vs *product fact* (community role/donations; or workspaces/assignments/per-workspace name).
- **Settings screens stack two tiers:** a shared **account section** (identical in every product) + a
  **product section** (only that product's settings). Commons has its own account screen at
  `/commons/:slug/account` — it never punts the user to the site's `/profile`.
- **Profile identity:** the account name/avatar is canonical; a Commons workspace **may** override the display
  name (avatar inherits). Rule lives in `src/data/commons/identity.js`. Latent today (Joz only).
- **Deferred (Bucket 3):** separate domain, platform-vs-community terms, notification branding, federated
  identity. One Supabase project, one OAuth app, one origin until a second tenant justifies otherwise.
