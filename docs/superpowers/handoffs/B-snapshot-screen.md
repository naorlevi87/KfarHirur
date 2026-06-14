# Handoff B — תמונת מצב (snapshot) screen

> Paste into a fresh Claude window. First read `CLAUDE.md`, `docs/architecture.md` §17,
> `src/commons/COMMONS.md`, and the routine/run spec
> `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`. Commons feature
> (`src/commons/`). Invoke `brainstorming` before building. Mobile-first; design-taste skill applies.

## Context
There's a placeholder route already: `/commons/:workspaceSlug/overview` → `ComingSoonPage` (the
**תמונת מצב** tab). The data is in place: `commons.nodes` carries `status`, `occurrence_date` (runs vs
definitions), `completed_by / completed_at / completed_late`, and the operational day is 08:00→08:00
(`src/commons/opDay.js`). `useWorkspaceTree` already loads the tree; `fetchRoster` gives member names.

## Desired outcome
A manager-facing "today at a glance" screen that turns the data we already collect into a clear picture:
- **Per-area progress** — done / total across today's runs + actionable one-offs, with a % or bar.
- **Needs attention** — overdue items + unclaimed tasks, with quick drill-in to the item.
- **Activity feed** — who completed what today (from `completed_by/at`), late completions flagged.
- **End-of-op-day rollup** + a light **7-day completion trend** (optional v2).

## Behavior to nail down (brainstorm)
- Scope: whole workspace or per-area sections? (Likely workspace overview with area breakdown.)
- Who sees it — all members or manager+? What's the default tab landing.
- "Today" = current operational day (use `opDay.js`), not midnight.
- Performance: derive from the already-loaded tree where possible; avoid heavy new queries.

## Constraints
- Read-only/aggregating screen; no new write paths. Keep data-source opacity (any new reads in
  `src/data/commons/`). No hardcoded strings (content in `commonsShell.content.js`, the `snapshot`/`overview`
  keys already exist as a start). Reuse Commons tokens/animations (`motion/react`).

## Likely files
`src/commons/pages/OverviewPage/` (replace the ComingSoon placeholder), maybe a
`src/data/commons/snapshotQueries.js`, content files, route wiring in `CommonsModule.jsx`.
