# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always respond in English — regardless of what language the user writes in.

## On conversation start

Read all files in `docs/` before doing anything else:
- `docs/kfar-hirur-architecture-spec.md`
- `docs/kfar_hirur_development_workflow.md`
- `docs/architecture-audit.md`

These are the source of truth for architecture and workflow decisions.

## Brainstorming

Before any creative work — new features, new components, new behavior, or UI changes — invoke the `brainstorming` skill automatically. Do not wait to be asked.

## Design taste

All visual/UI work in this project is governed by the `design-taste-frontend` skill (`~/.claude/skills/taste-skill/SKILL.md`). Apply it automatically on every conversation — do not wait to be asked.

Active dial settings for Kfar Hirur:
- `DESIGN_VARIANCE: 8` — asymmetric layouts, fractional grids, intentional whitespace
- `MOTION_INTENSITY: 6` — spring physics, fluid CSS transitions, no linear easing
- `VISUAL_DENSITY: 4` — daily-app mode, clean spacing, no cockpit packing

Key constraints that align with this project's personality:
- No generic NGO / landing page / startup template aesthetic
- No centered hero layouts
- No 3-column equal card rows
- No Inter font
- No hardcoded colors — always `var(--...)` tokens from `globals.css`
- Animations via `useMotionValue` / Framer Motion — never `useState` for continuous motion
- Mobile-first baseline; desktop is a separate pass

## Mobile-first — non-negotiable

Mobile is the primary target. Every UI decision is validated on mobile first. Desktop is always a separate pass.

- Build for mobile. Then adapt for desktop.
- Never validate a visual decision on desktop only.
- `min-h-[100dvh]` not `h-screen`. No fixed pixel dimensions that break on small viewports.

## Accessibility & Privacy — Israeli law

This site must comply with Israeli accessibility and privacy law at all times:

- **Israeli Standard 5568 (IS 5568)** — based on WCAG 2.1 AA. All new UI must meet this standard.
  - Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
  - All interactive elements must be keyboard-navigable
  - All images must have meaningful `alt` text
  - Focus indicators must be visible (`focus-visible` styles required)
  - No content that flashes more than 3 times per second
- **Israeli Privacy Protection Law (חוק הגנת הפרטיות)** — no personal data collected or stored without explicit user consent and a clear privacy policy.
- When adding any feature that touches user data, forms, or tracking — flag it and handle it according to these requirements.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

No test suite is configured.

## Architecture

React 19 SPA built with Vite and React Router v6.

### Root structure (fixed, non-negotiable)

```
App -> AppProviders -> MainLayout -> CurrentPage
```

- `App` — bootstrap, routing, owns `locale` and `mode`
- `AppProviders` — context injection only
- `MainLayout` — site shell: `SiteHeader`, `SiteFooter`, `HamburgerMenu`, theme wrapper
- `CurrentPage` — page structure and composition only

Pages never manually receive or pass `locale` / `mode` — always via `useAppContext()`.

### Folder structure

```
src/
  app/          # Global shell + app state + root providers only
  pages/        # Route pages + page-local helpers only
  features/     # Self-contained subsystems (e.g. timeline)
  utils/        # Truly reusable generic utilities (getText, formatters, etc.)
  content/      # Static locale-based authored copy
  data/         # DB / API / dynamic access layer
```

Each folder owns its layer strictly. Do not blur boundaries.

### Layer ownership

| Layer | Owns |
|---|---|
| App | `locale`, `mode`, global context |
| Page | page structure, page composition |
| Feature | subsystem logic, feature-local layout/wrappers |
| Leaf component | exact payload shape, validation, rendering |

### Resolver pattern

Resolvers are **local wrapper patterns**, not a global central system. They live next to the layer they serve (page folder, feature folder, etc.). A resolver may assemble content + data + style config and forward a semantic payload downward. A resolver must **not** define page structure or own full leaf schemas.

Leaf components request **semantic payloads** (e.g. `heroPayload`, `ctaConfig`) — never separate `content` / `data` / `style` props.

### App state

`AppContext` exposes `{ locale, mode, setMode }` only. Access via `useAppContext()`. Do not add to it without a clear decision — keep it small.

### The two core systems

**1. Consciousness Mode (Naor / Shay)**

Two visual/emotional personas. Naor = cool blue/purple, Shay = warm coral/honey. Mode is stored in `AppContext`, applied as `data-consciousness-mode` on `.main-layout`. All color tokens are CSS custom properties overridden by `[data-consciousness-mode="shay"]` in `globals.css`. Page content can also branch on mode.

`ConsciousnessSwitcher.jsx` (`src/styles/app/ConsciousnessSwitcher.css`) is the toggle. **Current implementation:** a simple `<button role="switch">` with a CSS knob that slides via `margin` transition. No Framer Motion, no drag.

Structure: `.cs-block` → `[cs-label--shay]` `[.cs-toggle-wrap]` `[cs-label--naor]`. The toggle-wrap stacks the track and a sublabel underneath. Mode class on `.cs-block--{mode}` drives knob position and track color.

**Content keys in use:** `consciousness.label`, `consciousness.optionShay`, `consciousness.optionNaor`.

**2. Content / i18n**

All copy lives in `src/content/site/{he,en}/` as plain JS objects. Resolver functions pick the right locale. Locale is currently hardcoded to `'he'` in `App.jsx`. `getText(contentObj, 'key')` is a safe accessor — returns `''` for missing keys. Page content can have `naor`/`shay` sub-objects for mode-specific copy.

### Timeline

The timeline is a **feature**, lives entirely in `features/timeline/`. It is not a root layout concern. Item type is resolved once at the feature layer — lower layers do not re-decide.

### Styling

`globals.css` — site-wide tokens, layout primitives, small shared elements only.

Large self-contained components get their own file: `src/styles/app/<ComponentName>.css`, imported directly by the component. Do not put large component blocks in `globals.css`.

Tailwind 4 utilities for layout/spacing. Theme colors are CSS variables — do not hardcode colors, use `var(--...)` from `globals.css`. RTL via `dir` attribute on `.main-layout` (set by `MainLayout.jsx`).

## Code rules (from project workflow)

- **No hardcoded user-facing strings** — all copy goes through content files
- **No layout/content mixing** — layout lives in layout components, copy comes from content layer
- **No naming or architecture changes without an explicit decision** — raise it, decide, then change
- **No broad cleanup on the way** — only change what was asked
- **React-first** — use React composition, props, Context, custom hooks before inventing custom infrastructure
- **Every decision happens once, at the correct layer**

### Comments standard

- **File header:** short comment stating what the file does and its responsibility
- **Before complex functions:** only if non-trivial or non-obvious
- **Inline:** only for non-obvious logic, workarounds, important fallbacks, or local decisions that need context
- Do not rewrite code in words, do not comment obvious things, do not use comments as a substitute for good naming
