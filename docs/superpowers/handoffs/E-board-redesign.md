# Handoff E — redesign "כל הלוח" (BoardPage)

> Paste into a fresh Claude window. First read `CLAUDE.md`, `docs/architecture.md`,
> `src/commons/COMMONS.md`, `docs/commons-standards.md` (binding), and `docs/voice.md`. Commons feature
> (`src/commons/`). **Invoke `brainstorming` before building** (project rule). Mobile-first; the
> `design-taste-frontend` skill applies on every turn (dials below). Other windows may be editing the
> snapshot / task view concurrently — coordinate, prefer targeted edits, commit only after the user
> reviews in the browser.

## What this is
"לוח" / `BoardPage` (`src/commons/pages/BoardPage/BoardPage.jsx`, `board.css`) is the **areas board** —
the landing tab. Root containers ("areas") render as a stagger-in **card grid**; each card shows the
area name + a short dot-strip (overdue=danger, open=accent, capped at 7) + an open/overdue count.
Tapping a card → `AreaPage` (`/commons/:slug/board/:containerId`). A virtual "general tasks" card
collects top-level loose tasks. The FAB (manager/admin) creates a task. Data via `useWorkspaceTree`.

## Desired outcome
Make it feel like a real product surface, not a plain card list — per `design-taste-frontend`:
asymmetric/fractional layout, intentional whitespace, spring motion. Keep it **calm and scannable** on
mobile first. The board's job is "where's the work, and where does it need attention" at a glance.

Open design questions for the brainstorm (don't assume):
- Card content: keep the dot-strip, or move to a small progress ring / done-of-total like the snapshot?
- Surface **today's** state per area (done/total today) vs just open-count? (Data: today's runs +
  actionable one-offs, via the op-day in `src/commons/opDay.js`.)
- Ordering / emphasis: areas needing attention first? An "everything calm" state?
- Does an area card preview its top items, or stay a pure summary that drills into `AreaPage`?

## Row / list grammar — uniformity (important)
A **uniform task-row grammar** was just locked for the temporal bands:
**`[checkbox/circle] · name · done/total (parents) · time-or-date chip`, one line.** See the reference
implementations:
- `src/commons/pages/AreaPage/AreaPage.jsx` — the `bandRow` / `previewRow` helpers (today/past/future).
- `src/commons/pages/OverviewPage/SnapshotList.jsx` + `SnapshotSections.jsx` (the snapshot row look:
  leading colored dot, title, count chip, "עד" time chip).

If the board redesign introduces any task rows (e.g. previewing items in a card), they **must** use
this grammar. **Recommended:** extract a **shared band-row component** (e.g.
`src/commons/tasks/TaskRow.jsx`) and refactor `AreaPage`, the snapshot, and (handoff F) `MyTasksPage`
to use it — so "uniform across all screens" is structural, not copy-pasted. Confirm scope with the user
before a broad refactor.

## Design dials (Kfar Hirur)
`DESIGN_VARIANCE: 8` · `MOTION_INTENSITY: 6` · `VISUAL_DENSITY: 4`. No generic NGO/landing/startup
template, no centered hero, no 3-equal-column rows, no Inter, **no hardcoded colors** — only
`var(--commons-*)` / `var(--...)` tokens. Continuous motion via `motion/react` (`useMotionValue` /
springs), never `useState` for animation. RTL Hebrew. `min-h-[100dvh]`, no fixed pixel breakpoints.

## Constraints
- **Data-source opacity:** components call `useWorkspaceTree` / a resolver and get a payload; any new
  reads live in `src/data/commons/`. No component knows DB vs static.
- **No hardcoded strings:** copy in `src/content/commons/{he,en}/commonsShell.content.js` (the `board`
  keys exist; add there). EN mirrored for parity (locale hardcoded to `he` today).
- Conform to `docs/commons-standards.md` (two-band header via `useCommonsChrome`; FAB reserved for
  tasks; reading-start = right in RTL). Log any new locked standard there.
- Accessibility IS 5568: 4.5:1 contrast, keyboard-navigable, visible focus, meaningful `alt`/`aria`.

## Likely files
`src/commons/pages/BoardPage/BoardPage.jsx` + `board.css`; possibly a shared `src/commons/tasks/TaskRow.jsx`
(if extracting the row); `commonsShell.content.js`. Process: brainstorm → spec
(`docs/superpowers/specs/`) → plan (`docs/superpowers/plans/`) → implement. Backlog entry:
`docs/backlog.md`.
