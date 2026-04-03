# Kfar Hirur — Architecture Spec
> Source of truth for architecture decisions. Last updated: 2026-04-04.
> For workflow, briefing, and development process — see `kfar_hirur_development_workflow.md`.

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
- `AuthProvider` (Supabase auth subscription)
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
      AuthContext.jsx                — Supabase auth: user, role, loading

  pages/
    home/
      HomePage.jsx
    kenZeOved/
      KenZeOvedPage.jsx
      resolveKenZeOvedPageData.js    — page-local resolver + hook
      ProgressBar.jsx
      DonateButton.jsx
    timeline/
      TimelinePage.jsx               — thin shell: renders TimelineFeature
      TimelineItemPage.jsx           — full-screen item detail at /timeline/:slug
      TimelineItemPage.css
    joinTeam/
      JoinTeamPage.jsx
    login/
      LoginPage.jsx
    admin/
      AdminListPage.jsx              — list of all timeline items
      AdminItemPage.jsx              — create/edit a single item + blocks
      AdminPage.jsx
      components/
        NaorShayInput.jsx
        BlockEditor.jsx
        BlockField.jsx
        MediaInput.jsx

  features/
    timeline/
      TimelineFeature.jsx            — root orchestrator: pan/zoom state, items, preview
      TimelineCanvas.jsx             — zoom+pan input layer (wheel, pinch, drag)
      TimelineRoad.jsx               — bezier path rendering
      TimelineNode.jsx               — node circle + counter-scaled label
      TimelinePreview.jsx            — tap-to-open preview card
      TimelineItemView.jsx           — (legacy overlay, superseded by route)
      timelinePath.js                — bezier math, evaluateAtDate()
      timelineData.js                — all constants (zoom, scale tiers, offsets)
      timelineUtils.js               — geometry helpers (outward normal, label sizing)
      TIMELINE.md                    — full subsystem documentation
      TimelineFeature.css

  utils/
    content/
      getText.js                     — safe key accessor, returns '' for missing keys

  content/
    site/
      he/
        siteShell.content.js
        kenZeOved.content.js         — naor + shay branches with real copy differences
        timeline.content.js          — UI strings (zoom buttons etc.)
      en/
        (mirrors he/)

  data/
    timeline/
      supabaseClient.js              — Supabase client (anon key)
      timelineQueries.js             — fetchTimelineItems(), fetchTimelineItemBySlug()
      resolveTimelineItem.js         — resolves raw DB item → semantic payload (geometry optional)
      resolveBlock.js                — routes block_type to correct resolver
      useTimelineItems.js            — hook: all items, resolved for current mode + geometry
      useTimelineItem.js             — hook: single item by slug, no geometry
      blockResolvers/
        text.js / image.js / video.js / link.js / cta.js
    admin/
      timelineAdminQueries.js        — CRUD: fetchAllItems, fetchItemBySlug, create/update/deleteItem, blocks
      eventTypes.js
    auth/
      authQueries.js                 — fetchUserRole()

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
/                          → HomePage         (public, under MainLayout)
/ken-ze-oved               → KenZeOvedPage    (public)
/timeline                  → TimelinePage     (public)
/timeline/:slug            → TimelineItemPage (public)
/join-team                 → JoinTeamPage     (public)
/login                     → LoginPage        (no MainLayout)
/admin                     → AdminListPage    (ProtectedRoute: admin|editor)
/admin/timeline            → AdminListPage
/admin/timeline/items/new  → AdminItemPage
/admin/timeline/items/:slug → AdminItemPage
```

`ProtectedRoute` uses `useAuth()` to check `role`. Redirects to `/login` if role not allowed.

---

## 5. Authentication (Supabase)

- **Project:** `kqlfvwlzayinngrgafec.supabase.co`
- **Auth:** Supabase email/password auth
- **Roles table:** `user_roles` — columns: `user_id`, `role` (enum: `admin | editor | member`)
- **RLS:** enabled on `timeline_items` and `timeline_item_blocks`
- **AuthContext** subscribes to `supabase.auth.onAuthStateChange` → exposes `{ user, role, loading }`
- **Hook:** `useAuth()` from `AuthContext.jsx`

### Admin users
- `naorlevi87@gmail.com` — Naor (owner, admin)
- `sknic83@gmail.com` — Shay (pending: create account → grant admin via `user_roles`)

### Service role key
- Stored as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Used only in local scripts (never exposed to browser, never committed to git)
- Required for DB writes that bypass RLS (seeding, admin scripting)

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

Full documentation: `src/features/timeline/TIMELINE.md`

### Architecture summary

`TimelineFeature` is the root orchestrator. It owns:
- Pan/zoom MotionValues (`worldX`, `worldY`, `worldScale`) — 60fps without React re-renders
- `currentScale` React state — only updated when `worldScale` crosses a visibility threshold
- `previewId` state — ID of the currently open preview (item object derived fresh each render)
- Item fetch via `useTimelineItems()` — resolves for current mode
- `savePosition()` — writes pan/zoom to `sessionStorage` before navigating to item detail

### Item visibility tiers (min_scale)
| Constant | Value | Meaning |
|---|---|---|
| SCALE_ALWAYS | 0 | Always visible — main milestones |
| SCALE_MID | 0.45 | Visible at mid zoom |
| SCALE_CLOSE | 0.9 | Visible only when close |

`min_scale` is stored per item in Supabase. Editable via `/admin/timeline/items/:slug`.

### Preview → item detail navigation
1. Tap node → `handleNodeTap` pans camera, sets `previewId`
2. `TimelinePreview` shows — `previewItem` derived from `items.find(id === previewId)`
3. "פתח" → saves pan/zoom to `sessionStorage`, navigates to `/timeline/:slug`
4. `TimelineItemPage` fetches item via `useTimelineItem(slug)`
5. Back button OR browser back → `navigate('/timeline')` → `TimelineFeature` restores pan/zoom from `sessionStorage`

### Label placement
Always horizontal. Placed by outward normal of bezier path. SVG Hebrew RTL quirk: `textAnchor="end"` = LEFT visual edge. Full algorithm in `TIMELINE.md`.

### Zoom
- Wheel, pinch, +/− buttons all call `handleZoom(newScale, originX, originY)`
- Zoom-toward-pointer math: `newPan = origin - worldPt * newScale`
- `wheel` and `touchmove` registered with `{ passive: false }` via `addEventListener` (React's synthetic events are passive — can't preventDefault)

---

## 11. Admin System

Protected at `/admin/**` via `ProtectedRoute` (requires `admin` or `editor` role).

### AdminListPage
- Lists all timeline items (all statuses)
- Links to create new or edit existing

### AdminItemPage
- Create or edit a single timeline item
- Fields: slug, date, event_type, size, status, visibility, **min_scale** (zoom tier), naor_title/shay_title, naor_label/shay_label
- Block editor: add/edit/reorder/delete content blocks (text, image, video, link, cta)
- All writes go through `timelineAdminQueries.js`

### Block types
`text | image | video | link | cta` — each has a `content` JSONB with naor/shay sub-objects.

---

## 12. Email / SMTP

- Provider: **Resend**
- Key name: `KfarHirur` (ID: `eba83c8e-9b86-4ea0-9ac5-017c78718f0b`)
- Permission: `sending_access`
- Key owner: naorlevi87@gmail.com
- Actual token stored in `.env.local` as `RESEND_API_KEY` — never committed

---

## 13. Layer Ownership

| Layer | Owns |
|---|---|
| App | `locale`, `mode`, global context, routing |
| Page | page structure, page composition, page-local resolvers/hooks |
| Feature | subsystem logic, feature-local layout, feature-local validation |
| Leaf component | exact payload shape, rendering |

---

## 14. Styling Rules

- `globals.css` — tokens, layout primitives, tiny shared elements only
- Large self-contained components: own CSS file in `styles/app/`, imported directly by the component
- Feature CSS: lives inside the feature folder (e.g., `TimelineFeature.css`)
- Page CSS: lives inside the page folder (e.g., `TimelineItemPage.css`)
- Tailwind 4 utilities for layout/spacing
- No hardcoded colors — always `var(--...)` from `globals.css`
- RTL via `dir` attribute on `.main-layout` (set by `MainLayout.jsx`)
- `min-h-[100dvh]` not `h-screen` — no fixed pixel dimensions that break on small viewports

---

## 15. Non-Negotiable Rules

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
