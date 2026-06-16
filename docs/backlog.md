# Backlog — משימות עתידיות

Standing list of deferred work (not yet scheduled). Each item is a future session's starting point.
Newest first. When one is picked up, it goes through the normal brainstorm → spec → plan flow.

---

## Commons UI

### Redesign "כל הלוח" (BoardPage) — prettier
The board (the areas list, `src/commons/pages/BoardPage/`) needs a visual redesign — currently a plain
list of areas. Make it feel like a real product surface (per `design-taste-frontend`: asymmetric,
spacious, motion). Should share the **unified task-row grammar** locked for the temporal bands
(`[checkbox/circle] · name · done/total · time/date`, one line) so rows look identical to the snapshot
and the area bands. Added 2026-06-17.

### Redesign "המשימות שלי" (MyTasksPage) — prettier
`src/commons/pages/MyTasksPage` — the individual's temporal aggregate ("what do I do today, across
areas"). Same redesign goal: nicer layout + the unified row grammar, consistent with the board, the
area bands, and the snapshot. Added 2026-06-17.

> Both are the natural home for a **shared band-row component** — today the row grammar is duplicated
> (AreaPage `bandRow`, snapshot `SnapshotList`/`SnapshotSections`). The redesign should extract one
> shared row used everywhere, so "uniform across all screens" is structural, not copy-pasted.

## Infrastructure

### Reliable recurrence generation
`commons-recurrences` (pg_cron, 08:00) doesn't fire when the dev project sleeps, so tomorrow's runs
aren't materialized until something wakes the DB. The "מה יהיה" preview is schedule-derived and shows
regardless, but materialization (for pre-editing tomorrow) depends on the cron. Options: a keep-alive,
or lazy materialization on first open of a future run. Flagged 2026-06-17.
