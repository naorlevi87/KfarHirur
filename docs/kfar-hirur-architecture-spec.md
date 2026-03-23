# Kfar Hirur — Architecture Spec (Updated)

## 1. Root Structure

```text
App -> AppProviders -> MainLayout -> CurrentPage
```

### Fixed rules
- `App` is the only root
- `AppProviders` is the only root provider wrapper
- `MainLayout` is the only root layout
- `CurrentPage` is rendered inside `MainLayout`
- No additional root layouts
- No hidden parallel shells

---

## 2. Root Ownership

### `App`
Owns:
- root bootstrap
- route / current page selection
- global app state source:
  - `locale`
  - `mode`

### `AppProviders`
Owns:
- global context injection only
- app-level providers only
- exposes app state through React Context

### `MainLayout`
Owns:
- `SiteHeader`
- `SiteFooter`
- `HamburgerMenu`
- site shell / outer frame
- root theme wrapper
- `children`

### `CurrentPage`
Owns:
- page structure only
- page composition only
- page-local wrappers if needed

### Fixed rules
- `Page` does **not** own `locale`
- `Page` does **not** own `mode`
- `Page` does **not** manually pass `locale`
- `Page` does **not** manually pass `mode`
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
    SiteFooter.jsx
    HamburgerMenu.jsx
    appState/
      AppContext.jsx
      useAppContext.js
    providers/

  pages/
    home/
    about/
    team/
    donations/

  features/
    timeline/

  shared/
    components/
    ui/
    utils/

  content/
    site/
      he/
      en/

  data/
```

### Fixed rules
- `app/` = global shell + global app state + root providers only
- `pages/` = route pages + page-local wrappers/helpers only
- `features/` = self-contained subsystems only
- `shared/` = only truly reusable generic UI / utils
- `content/` = static locale-based authored content
- `data/` = DB / API / dynamic access layer

---

## 4. React-First Rule (Non-Negotiable)

Before writing custom architecture code, always check:

1. Is there already a standard React mechanism for this?
2. Is there already a common web-app convention for this?
3. Is there already an existing library / pattern that solves this cleanly?

### Prefer existing standard mechanisms when they fit
Use, in this order when appropriate:
- React composition
- props
- React Context
- custom hooks
- established app-level providers
- established data libraries when needed (for example query / cache libraries)

### Fixed rule
- Do **not** invent internal infrastructure if React or standard web-app architecture already covers the need
- Write custom wrappers only when there is no good existing fit, or when a local wrapper clearly improves separation of responsibility

---

## 5. Layer Ownership

### App layer
Owns:
- global context injection
- `locale`
- `mode`

### Page layer
Owns:
- page structure
- page-level composition
- page-family wrappers if needed

### Feature layer
Owns:
- subsystem logic
- feature-local wrappers
- feature-local layout wrappers
- feature-local validation

### Item-type layer
Owns:
- item specialization
- item-type wrappers
- item-type validation

### Leaf component layer
Owns:
- exact final payload shape
- exact final validation
- rendering

---

## 6. Resolver Rules

### Resolver definition
A resolver is a **local wrapper pattern**, not a required global folder.

### Fixed rules
- Do **not** create a giant global `resolvers/` folder
- Resolvers live close to the layer they belong to:
  - app-level in `app/`
  - page-level in page folder
  - feature-level in feature folder
  - item-level in item family
  - leaf-level in leaf component usage

### Resolver responsibilities
A resolver may:
- receive a request
- add the context it owns
- forward the request
- validate at its own abstraction level
- return a more specific result downward

### Resolver limits
A resolver must **not**:
- own full leaf schemas globally
- define every exact field shape in the app
- decide page structure

### Fixed rule
- Resolver is a local architecture tool, not a replacement for normal React mechanisms

---

## 7. Payload Rules

### Leaf request rule
A leaf component requests a **semantic payload**, not source categories.

### Allowed examples
- `buttonConfig`
- `heroPayload`
- `ctaConfig`
- `timelineItemPayload`

### Forbidden pattern
Do not design leaf components to separately request:
- content
- data
- style
- media

### Internal source split is allowed
Internally, the resolver chain may assemble from:
- `content`
- `data`
- `media`
- `style definitions`

### Fixed rule
- Leaf receives final meaningful payload
- Leaf validates final exact shape

---

## 8. Content / Data / Style Rules

### `content/`
For:
- static authored copy
- locale-based text
- page copy
- CTA text
- legal / informational text

### `data/`
For:
- DB access
- API access
- dynamic records
- timeline items
- normalization / mapping

### Style resolution
Allowed for:
- visual variants
- theme tokens
- style config
- background/media selection

### Fixed rule
- Resolver may resolve style config
- Resolver may **not** define page structure
- Page always owns structure

---

## 9. Layout Rules

### Root layout
- Exactly one root layout: `MainLayout`

### Feature-local layout
If a feature needs layout variation:
- it must stay inside the feature folder
- it may wrap shared layout primitives
- it must **not** become a second root layout

### Fixed rule
- No multi-layout root architecture

---

## 10. App State Rules

### Current app state scope
The default app-level context is:

- `locale`
- `mode`
- `setMode`

### Access rule
- Access app state through:
  - `useAppContext()`

### Fixed rules
- Do **not** manually drill `locale` / `mode` through pages unless there is a specific justified exception
- Keep app context small
- Do **not** turn `AppContext` into a dumping ground

---

## 11. Timeline Rules

### Timeline classification
- `timeline` is a **feature / subsystem**
- it lives only in:

```text
features/timeline/
```

### Timeline may own
- timeline wrapper
- timeline item source access
- item-type selection
- social-item family wrappers
- `FacebookTimelineItem`
- `InstagramTimelineItem`
- feature-local layout wrapper if needed

### Fixed rules
- Timeline is **not** a root layout concern
- Timeline item type is resolved **once**
- Lower layers do not re-decide item type

---

## 12. Non-Negotiable Rules

1. Root structure is fixed:

```text
App -> AppProviders -> MainLayout -> CurrentPage
```

2. There is exactly **one root layout**

3. `App` owns:
- `locale`
- `mode`

4. `Page` never manually passes:
- `locale`
- `mode`

5. Use built-in React mechanisms and standard web-app conventions first

6. Do **not** invent custom infrastructure when a standard solution already fits

7. Resolver is a **local wrapper pattern**, not a giant central system

8. Resolver does **not** own full leaf schemas

9. Page owns structure

10. Resolver may resolve:
- content
- data
- media
- style config

11. Resolver may **not** define page composition

12. Leaf requests semantic payloads only

13. `content/` and `data/` both remain

14. Feature-local layout variation stays inside the feature

15. Timeline is a feature, not a root layout concern

16. Every decision happens **once**, at the correct layer
