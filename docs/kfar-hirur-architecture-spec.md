# Kfar Hirur — Architecture Spec
> Source of truth for architecture decisions. Updated: 2026-03-27.
> For current-state gaps and known drift, see `architecture-audit.md`.

---

## 1. Root Structure

```text
App -> AppProviders -> MainLayout -> CurrentPage
```

### Fixed rules
- `App` is the only root
- `AppProviders` is the only root provider wrapper
- `MainLayout` is the only root layout
- `CurrentPage` is rendered inside `MainLayout` via React Router `<Outlet>`
- No additional root layouts
- No hidden parallel shells

---

## 2. Root Ownership

### `App`
Owns:
- root bootstrap
- route / current page selection
- global app state source: `locale`, `mode`

### `AppProviders`
Owns:
- global context injection only
- exposes app state through React Context

### `MainLayout`
Owns:
- `SiteHeader`
- `SiteFooter` (not yet built)
- `HamburgerMenu`
- `isMenuOpen` state
- site shell / outer frame
- root theme wrapper (`data-consciousness-mode`, `dir`, `lang`)
- `children` via `<Outlet>`

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
    App.jsx
    AppProviders.jsx
    MainLayout.jsx
    SiteHeader.jsx
    SiteFooter.jsx          ← not yet built
    HamburgerMenu.jsx
    appState/
      AppContext.jsx
      useAppContext.js

  pages/
    home/
    keepItGoing/
    timeline/               ← placeholder only; real timeline goes in features/
    joinTeam/

  features/                 ← not yet created; timeline subsystem will live here
    timeline/

  utils/                    ← shared utilities (getText, etc.)
    content/
      getText.js

  content/
    site/
      he/
      en/

  data/                     ← not yet created; dynamic data access layer

  styles/
    globals.css             ← tokens, layout primitives, small shared elements only
    app/
      SiteHeader.css
      SiteFooter.css        ← not yet built
      HamburgerMenu.css
      ConsciousnessSwitcher.css
      KeepItGoingPage.css
```

### Fixed rules
- `app/` = global shell + global app state + root providers only
- `pages/` = route pages + page-local wrappers/helpers only
- `features/` = self-contained subsystems only (timeline, etc.)
- `utils/` = truly reusable generic utilities
- `content/` = static locale-based authored content
- `data/` = DB / API / dynamic access layer
- `styles/globals.css` = tokens, layout primitives, `.page-placeholder` and equivalent tiny shared primitives only — **no page or component blocks**
- Each component with large self-contained CSS gets its own file in `styles/app/`, imported directly by the component

---

## 4. React-First Rule (Non-Negotiable)

Before writing custom architecture code, always check:

1. Is there already a standard React mechanism for this?
2. Is there already a common web-app convention for this?
3. Is there already an existing library / pattern that solves this cleanly?

Use, in this order:
- React composition
- props
- React Context
- custom hooks
- established app-level providers
- established data libraries when needed

Do **not** invent internal infrastructure if React or standard web-app architecture already covers the need.

---

## 5. Layer Ownership

### App layer
Owns: global context injection, `locale`, `mode`

### Page layer
Owns: page structure, page-level composition, page-family wrappers if needed

### Feature layer
Owns: subsystem logic, feature-local wrappers, feature-local layout wrappers, feature-local validation

### Item-type layer
Owns: item specialization, item-type wrappers, item-type validation

### Leaf component layer
Owns: exact final payload shape, exact final validation, rendering

---

## 6. Resolver Rules

A resolver is a **local wrapper pattern**, not a required global folder.

- Resolvers live close to the layer they belong to (page folder, feature folder, etc.)
- A resolver may: receive a request, add context it owns, forward downward, validate at its abstraction level
- A resolver must **not**: own full leaf schemas globally, define page structure

See `resolveKeepItGoingPageData.js` as a reference implementation — it exports both a pure function and a hook from the same page-local file.

---

## 7. Payload Rules

A leaf component requests a **semantic payload**, not source categories.

**Allowed:** `buttonConfig`, `heroPayload`, `ctaConfig`, `timelineItemPayload`

**Forbidden:** separate `content` / `data` / `style` props to a leaf

Internally the resolver chain may assemble from content, data, media, and style config — that split is resolver-private.

---

## 8. App State Rules

Current app-level context scope: `{ locale, mode, setMode }`

Access only via `useAppContext()`. `useAppContext` throws if used outside the provider tree.

- Do **not** drill `locale` / `mode` through pages manually
- Do **not** add to `AppContext` without an explicit decision
- Keep it small

---

## 9. The Two Core Systems

### Consciousness Mode (Naor / Shay)

Two visual/emotional personas. Naor = cool blue/purple. Shay = warm coral/honey.

Mode is stored in `AppContext`, applied as `data-consciousness-mode` on `.main-layout`. All color tokens are CSS custom properties defined on `.main-layout` (Naor default) and overridden by `[data-consciousness-mode="shay"]` in `globals.css`. Page content can branch on mode via `naor`/`shay` sub-objects.

**ConsciousnessSwitcher — current implementation:**
A simple `<button role="switch">` with a CSS knob that slides via `margin` transition. Mode class `.cs-block--{mode}` drives track color and knob position. No Framer Motion. Structure: `.cs-block` → `[cs-label--shay]` `[.cs-toggle-wrap]` `[cs-label--naor]`.


**Content keys in use:** `consciousness.label`, `consciousness.optionShay`, `consciousness.optionNaor`

### Content / i18n

All copy lives in `src/content/site/{he,en}/` as plain JS objects. Resolver functions pick the right locale. Locale is currently hardcoded to `'he'` in `App.jsx`. `getText(contentObj, 'key')` is a safe accessor — returns `''` for missing keys.

---

## 10. Timeline Rules

- Timeline is a **feature / subsystem** — lives in `features/timeline/`
- It is **not** a root layout concern
- `TimelinePage` in `pages/timeline/` is currently a placeholder — when the feature gets built, the subsystem logic goes in `features/timeline/`, the page only composes it
- Item type is resolved **once** at the feature layer — lower layers do not re-decide

---

## 11. Styling Rules

- `globals.css` — tokens, layout primitives, tiny shared elements (e.g. `.page-placeholder`) only
- Large self-contained components get their own CSS file in `styles/app/`, imported directly by the component
- Tailwind 4 utilities for layout/spacing
- No hardcoded colors — always `var(--...)` from `globals.css`
- RTL via `dir` attribute on `.main-layout` (set by `MainLayout.jsx`)

---

## 12. Visual System Rules

- Mobile is the baseline visual reference — spacing, proportion, hierarchy, sticky behavior, component feel
- Desktop is not solved in the same pass unless explicitly requested
- Desktop adaptation happens in a **separate pass** after mobile is correct
- All implementation choices must remain extensible for a later desktop pass
- No layout choices that require teardown to support desktop
- No hardcoded dimensions that can't be overridden at a responsive breakpoint

---

## 13. Non-Negotiable Rules

1. Root structure is fixed: `App -> AppProviders -> MainLayout -> CurrentPage`
2. Exactly **one root layout**
3. `App` owns `locale` and `mode`
4. `Page` never manually passes `locale` or `mode`
5. Use built-in React mechanisms and standard web-app conventions first
6. Do **not** invent custom infrastructure when a standard solution already fits
7. Resolver is a **local wrapper pattern**, not a giant central system
8. Resolver does **not** own full leaf schemas
9. Page owns structure
10. Resolver may resolve content, data, media, style config — but not page composition
11. Leaf requests semantic payloads only
12. `content/` and `data/` both remain separate layers
13. Feature-local layout variation stays inside the feature
14. Timeline is a feature, not a root layout concern
15. Every decision happens **once**, at the correct layer
16. Visual systems are validated **mobile-first** by default — desktop is a separate pass
