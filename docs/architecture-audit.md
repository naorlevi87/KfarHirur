# Architecture Audit — Kfar Hirur
> Last updated: 2026-03-27. Living document — update after structural changes.
>
> Purpose: honest current-state snapshot. What's solid, what's open, what to build correctly when the time comes.

---

## What's Solid

**Root structure** — `App -> AppProviders -> MainLayout -> CurrentPage` correctly wired via React Router nested routes. ✓

**App state ownership** — `locale` and `mode` live in `App.jsx`, injected via `AppProviders`, accessed via `useAppContext()`. Pages never receive them as props. ✓

**`useAppContext`** — throws if used outside the tree. ✓

**AppContext scope** — strictly `{ locale, mode, setMode }`. ✓

**`MainLayout`** — owns `SiteHeader`, `HamburgerMenu`, `isMenuOpen` state, `<Outlet>`. Doesn't know about pages. ✓

**Page-local resolver pattern** — `resolveKeepItGoingPageData.js` is correctly page-local. Exports both a pure function and a hook from the same file. ✓

**Content layer** — all copy in `src/content/site/{he,en}/`, no hardcoded strings inside components. ✓

**`getText` utility** — safe accessor, returns `''` for missing keys. ✓

**Locale fallback** — both resolvers fall back to Hebrew if locale is unrecognized. ✓

**Consciousness mode CSS** — color tokens on `.main-layout`, overridden by `[data-consciousness-mode="shay"]`. ✓

**RTL** — `dir` and `lang` set on `.main-layout`. Header uses `dir="ltr"` override to pin controls physically. ✓

**CSS boundaries** — `globals.css` contains only tokens, layout primitives, and `.page-placeholder`. Each component has its own CSS file imported directly. ✓

**Menu panel colors** — uses `var(--page-bg)` and `var(--surface-border)`, adapts to consciousness mode. ✓

**Active nav link** — `.site-menuLink.active` styled with accent color. ✓

**Vercel SPA routing** — `vercel.json` rewrites all paths to `index.html`. ✓

---

## What's Open

### ~~`App.jsx` uses default export~~ ✓ Fixed 2026-03-27
Converted to named export `export function App()`. `main.jsx` updated to `import { App }` accordingly.

### ~~No focus trap in `HamburgerMenu`~~ ✓ Fixed 2026-03-27
Focus trap implemented in `HamburgerMenu.jsx`: focuses first element on open, traps Tab/Shift+Tab within the panel, closes on Escape.

### `transition: ease` on support button hover
Borderline against the spring-physics taste rule. Acceptable for a simple button hover — not worth changing unless the button gets a broader interaction upgrade.

---

## What's Not Built Yet

Documenting these so they get built correctly when the time comes — not gaps that need fixing now.

### `src/features/` — timeline subsystem
When timeline gets built, the subsystem logic goes in `features/timeline/`. The existing `TimelinePage` in `pages/timeline/` is a placeholder — the page should only compose the feature, not contain it.

### `src/data/` — dynamic data layer
When real fundraising numbers, timeline items, or team data come from an API or DB, they belong here — not in the content layer.

### `SiteFooter`
`MainLayout` owns it by spec. Doesn't exist yet. Build it inside `app/` with its own `styles/app/SiteFooter.css`.

---

## Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Shared utilities location | `src/utils/` | Already established; `src/shared/` never created |
| ConsciousnessSwitcher | Simple CSS toggle | Clean, intentional — no drag redesign planned |
| Menu panel background | `var(--page-bg)` | Solid surface, mode-aware |
