# Handoff F — redesign "המשימות שלי" (MyTasksPage)

> Paste into a fresh Claude window. First read `CLAUDE.md`, `docs/architecture.md`,
> `src/commons/COMMONS.md`, `docs/commons-standards.md` (binding), `docs/voice.md`, and the routine/run
> spec `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md` (§7 defines what "שלי"
> is meant to be). Commons feature (`src/commons/`). **Invoke `brainstorming` before building**
> (project rule). Mobile-first; the `design-taste-frontend` skill applies (dials below). Other windows
> may be editing the snapshot / task view concurrently — coordinate, prefer targeted edits, commit only
> after the user reviews in the browser.

## What this is
"שלי" / `MyTasksPage` (`src/commons/pages/MyTasksPage/MyTasksPage.jsx`, `myTasks.css`) is the
signed-in member's own list: tasks where `owner_id === me` (excluding ones whose ancestor is already
mine), filtered by **pills** (all / today / overdue). Each row: a leading **progress chip (parents)
OR checkbox (leaves)**, then title + area name, then a missed/due chip. Rows open the read-only task
view; the leaf checkbox completes inline. No tree, no creation here. Data via `useWorkspaceTree`.

## Desired outcome
A nicer, clearer "what do I do today, across all areas" surface (per `design-taste-frontend`). Two
things to reconcile in the brainstorm:

1. **Vision vs current.** The routine/run spec §7 frames "שלי" as the individual's **temporal
   aggregate** sharing the **same four bands** as the area view (מה היום / מה היה / מה יהיה / …). The
   current screen is instead a flat filter-pill list. Decide with the user: adopt the temporal bands
   (consistent with `AreaPage`) or keep/refine the pills? This is the core design call.
2. **Row grammar uniformity (important).** A uniform row grammar was just locked:
   **`[checkbox/circle] · name · done/total (parents) · time-or-date chip`, one line.** The current
   MyTasks rows use the *old* pattern (progress chip as the leading element for parents, no checkbox;
   title+area stacked). Bring them to the locked grammar. References:
   - `src/commons/pages/AreaPage/AreaPage.jsx` — `bandRow` / `previewRow` helpers.
   - `src/commons/pages/OverviewPage/SnapshotList.jsx` + `SnapshotSections.jsx` (the snapshot look).
   **Recommended:** extract a **shared band-row component** (`src/commons/tasks/TaskRow.jsx`) used by
   `AreaPage`, the snapshot, and this screen, so uniformity is structural, not copy-pasted. (Same
   recommendation as handoff E — coordinate so both redesigns share one row.)

## Design dials (Kfar Hirur)
`DESIGN_VARIANCE: 8` · `MOTION_INTENSITY: 6` · `VISUAL_DENSITY: 4`. No generic template, no centered
hero, no 3-equal-column rows, no Inter, **no hardcoded colors** — only `var(--...)` tokens. Motion via
`motion/react` springs, never `useState` for animation. RTL Hebrew. `min-h-[100dvh]`.

## Constraints
- **Data-source opacity:** read via `useWorkspaceTree` / a resolver; new reads (if any) in
  `src/data/commons/`.
- **No hardcoded strings:** copy in `commonsShell.content.js` (`myTasks` keys exist; add there). EN
  mirrored.
- Conform to `docs/commons-standards.md`; two-band header via `useCommonsChrome`. Completion still
  records attribution (who/when) — reuse the hook (`tree.toggleDone` / the completion flow); don't
  invent a new write path. Protect from accidental loss (confirm destructive).
- Accessibility IS 5568: contrast 4.5:1, keyboard, visible focus, `aria`.

## Likely files
`src/commons/pages/MyTasksPage/MyTasksPage.jsx` + `myTasks.css`; the shared `src/commons/tasks/TaskRow.jsx`
(if extracting); `commonsShell.content.js`. Process: brainstorm → spec (`docs/superpowers/specs/`) →
plan (`docs/superpowers/plans/`) → implement. Backlog entry: `docs/backlog.md`.
