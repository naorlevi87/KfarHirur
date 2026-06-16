# Commons — תמונת מצב (Snapshot / "מה קורה היום?") — Design

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: approved design, pre-implementation. Date: 2026-06-16. Module: `src/commons/`.
> Supersedes **Handoff B** (`docs/superpowers/handoffs/B-snapshot-screen.md`) and replaces the
> first-pass `src/commons/pages/OverviewPage/` (which predates the routines/runs model).
> Builds on the routines/runs model (`docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`).

---

## 1. Problem

The `תמונת מצב` tab is live but its `OverviewPage` predates the **routines/runs** model: it counts flat
leaf tasks by `due_date`/`updated_at` and derives a feed from `created_at`/`updated_at`. It knows nothing
about runs (`occurrence_date`), completion attribution (`completed_by/at`), or the `late`/`missed`/
`deferred`/`skipped` states.

Handoff B framed the rebuild as a **manager audit/triage console** — stat tiles, a "needs attention"
problem list, per-area progress bars, an admin "day view" to defer/skip/resolve. In conversation the
founder rejected that hard: it reads as **surveillance and top-down cleanup** — the opposite of the
vision (communal, circular, non-hierarchical, playful). It must also **generalize** to any collective
(garden, protest, עמותה), where a manager-dashboard framing fits nothing.

This spec redesigns the screen around the vision while still letting the group **see what's slipping and
act on it** — reframed as mutual aid, not management.

## 2. Concept — "מה קורה היום?"

`תמונת מצב` is the **"us" view**: a shared glance at *our* day. It sits between **שלי** (me) and **לוח**
(by area) as the third bottom tab. Three principles drive every element:

1. **Surface the work, never rank people.** No scoreboard, no per-person stats anywhere. Names appear
   only as *credit* on something that got done.
2. **Deficit → invitation.** "unassigned" → **"פנוי — מי לוקח?"**; "missed/failed" → **"נתקע — מי תופס?"**;
   the activity log → *what we pulled off*, with props.
3. **The day is a circle, and it should feel good.** The op-day (08:00→08:00) fills a ring that travels
   the colour **spectrum** as the group completes the day — red at the start, purple when it's closed.

Convey togetherness; never *say* it — the word **"ביחד" is banned from the UI copy** (see §9).

## 3. Placement & information architecture

- **Tab:** `/commons/:workspaceSlug/overview` — the `תמונת מצב` bottom tab (unchanged route; replaces the
  current `OverviewPage`). Visible to **all members** (decided): it's read-mostly; the few write actions
  it surfaces are permission-gated exactly as they already are (§8). It is **not** manager-only.
- **Relation to the other tabs:** **שלי** = my temporal aggregate; **לוח → מרחב** = one area's four
  temporal bands (the per-area detail surface). **תמונת מצב** = the whole workspace, at a glance.
- **Areas are lenses, not a breakdown.** A scope row (`הכל · <area> · <area> …`) lets you **focus** the
  ring + lists + count onto one area. Equal pills, **fixed order, never sorted by performance** — a lens,
  not a leaderboard. Default = **הכל**. Full per-area detail still lives in **לוח → מרחב**.

## 4. The screen (top → bottom, mobile-first)

1. **Header — the living line.** Small label **"מה קורה היום?"** + one warm sentence that re-renders
   through the op-day and ends on a question (e.g. *"חצי יום ו-14 דברים כבר קרו. נשארו 5 — אחד מהם פנוי.
   מי לוקח?"*). The line is **tappable → scrolls to "פנוי — מי לוקח?"**. Copy rules in §9.
2. **Area-lens row** — horizontally scrollable pills: `הכל` (default, active) + one per root area.
   Selecting focuses the ring, the count, and the lists below. Fixed order.
3. **The ring** (§6) — collective completion of the selected scope, as a **banded-spectrum** arc. Centre:
   **"מה מצבנו?"** + a small count (`14 מתוך 19`). **No percentage number.**
4. **Time-aware sections** (time lives here, not on the ring):
   - **תכף נגמר הזמן** — open items whose target time is approaching within the op-day (default window:
     next ~90 min; tunable). Each row shows the time remaining.
   - **פנוי — מי לוקח?** — actionable-now items with no effective owner. Action: **עליי 🙌** (claim).
   - **נתקע קצת — מי תופס?** — overdue (past target time today) or missed (past op-day), still open.
     Actions: **עליי 🙌** · **זה כן קרה 🫢** · **דחה למחר 🙆 / לא צריך 🤷** (§8).
5. **לאחרונה** — a short, happy **credit** strip: recent *completions* with the doer + an emoji + a warm
   one-liner (props, never ranking). Capped (~4). A **"כל היומן ←"** link opens the full chronological
   feed (separate `יומן` view — out of scope here, §11). At 100% a small celebration banner appears
   (*"סגרתם את כל היום! איזה צוות 🌈🎉"*).
6. **השבוע** — seven small spectrum rings, one per op-day of the last 7 (today highlighted). The week reads
   as a little rainbow — trend without a chart. Tapping a day → that day's view (deferred, §11).
7. **Accessible list (visually hidden, always present)** — an ordered `<ul>` mirroring the ring's items as
   focusable rows with full `aria-label`s; a visible **"רשימה"** toggle surfaces it. The radial form is an
   *enhancement* over an accessible linear base (§10).

The create **FAB** (manager/admin) stays per `docs/commons-standards.md` §1.3.

## 5. Data & derivation (no new queries)

`fetchTree(workspaceId)` already loads **every** node (incl. historical runs), and `fetchRoster` gives
member names — so the whole screen derives from data already in memory. **No new data-layer reads.**

A pure, co-located helper **`src/commons/pages/OverviewPage/snapshot.js`** turns
`(nodes, byParent, roster, opDayStart, scopeAreaId | null)` into the view model. The page stays thin and
the logic is unit-testable. Shapes (illustrative):

```
buildSnapshot(...) => {
  progress: { doneLeaves, totalLeaves, fraction },   // fraction drives the ring + spectrum colour
  approaching: Item[],   // open, due_time within the window, today
  free:        Item[],   // actionable today, open, no effective owner
  stuck:       Item[],   // overdue (past due_time today) or missed (past op-day), still open
  recent:      Event[],  // completions: { doer, title, at, late } — newest first, capped
  week:        DayStat[7],            // per op-day: { date, fraction }
  closedToday: boolean,               // fraction === 1 → celebration
}
```

Definitions (all op-day aware via `src/commons/opDay.js`, never midnight):

- **Leaf** = a `task` node with no task-children **in its own layer** (run items + actionable one-offs;
  excludes routine *definitions* and run *roots*). Reuses the layer-aware logic already in
  `useWorkspaceTree.progress` / `hasChildren`.
- **Progress / partial credit.** `fraction = doneLeaves / totalLeaves` over today's in-scope leaves.
  Partial credit is automatic: a parent that's 7-of-10 contributes its 7 done leaves. The centre count is
  `doneLeaves מתוך totalLeaves`.
- **Scope.** `scopeAreaId = null` → whole workspace; set → restrict every set above to that area's subtree.
- **completed_by / completed_at / completed_late** (already on `commons.nodes`, already selected by
  `FIELDS`) power the credit strip and the `late` flag; `completed_by` resolves to a member via the roster.
- **Generality:** nothing here is restaurant-specific — "areas", "leaves", "completions" hold for a garden
  or a protest.

## 6. The ring

- **Form:** a thick (~40px stroke) circular arc on a recessed track, a glass centre, and a soft colour
  glow. The arc fills clockwise from the top (12 o'clock) by `progress.fraction`. Rounded caps on the
  start and the leading end. **Centre:** "מה מצבנו?" + count — **no % digit**.
- **Banded spectrum.** The arc's colour travels the spectrum by fraction: **red → orange → yellow → green
  → blue → purple**. Each hue holds a **plateau** with short transitions (not a smooth mush) so every
  colour reads as itself. At **100%** the purple bridges through **magenta back to red** at the top — the
  wheel closes.
- **Meaning:** colour = progress (reinforced by the count, never colour-only). Red = *just starting*, not
  alarm. Purple/closed = done.
- **The week strip** reuses the same colour function per day.

## 7. Colour system (tokens)

Defined in `src/commons/styles/` as a spectrum scale — **no hardcoded colours in the component**. A
small helper maps `fraction → colour` (and produces the banded conic stops); the component consumes
tokens / the helper, never literals. The scale (six stops + the magenta closing bridge) lives next to the
other commons tokens so it's themable and reusable (e.g. the week strip, the celebration banner).

## 8. Actions — mutual aid, not management

The screen surfaces **existing** occurrence operations from a new place — it invents **no new mutations**.
This is a deliberate, logged deviation from Handoff B's "read-only / no new write paths": the screen is
read-*mostly*, and the actions are framed as helping, available inline:

| Action | Copy | Maps to | Who |
|---|---|---|---|
| Claim a free / stuck item | **עליי 🙌** | `claimNode` | any eligible member |
| Resolve a missed item | **זה כן קרה 🫢** | `resolveMissed` | any member (logged) |
| Push to another day | **דחה למחר 🙆** / **תאריך אחר 📅** | `deferOccurrence(id, date)` | manager+ |
| Not needed this time | **לא צריך 🤷** | `deferOccurrence(id, null)` | manager+ |

Permission gating is unchanged from the routines/runs model — members see the actions they're allowed to
take; defer/skip stay manager+. The view itself is for everyone. Tapping an item **title** opens the
existing item detail (`TaskViewPage`), which already hosts the full occurrence menu + per-item history.

## 9. Copy & voice

Per `docs/voice.md`: warm, light, **less is more**, **questions land harder than statements**, no
spoon-feeding.

- **Iron rule — never say "ביחד".** Togetherness is *conveyed* through the "we" framing
  ("מה איתנו", "מה מצבנו", "מי לוקח", "מי תופס"), never stated. (Recorded in `docs/commons-standards.md`.)
- **The living line** is generated from `(time-of-day bucket, counts)` — a small set of in-voice
  templates, always ending on an invitation/question. It tells the truth on a hard day too
  (*"יום עמוס — כמה דברים נתקעו. שווה מבט?"*), without drama.
- **Emoji language** (decorative; the words carry meaning — see §10):
  | Emoji | Meaning |
  |---|---|
  | 🙌 | עליי — I took it |
  | 🫢 | זה כן קרה — late, but it happened |
  | 🙆 | דחה למחר — *the Naor & Shay classic* |
  | 🤷 | לא צריך הפעם |
  | 😇 | done on time · 😎 smooth as always |
  | 🌈🎉 | day closed (100%) |
- All strings live in `src/content/commons/{he,en}/` (no hardcoded UI text). The existing `snapshot.*`
  keys are extended; `en/` is scaffolded in parallel (not implemented now).

## 10. Accessibility (IS 5568 / WCAG 2.1 AA — legal)

- **Never colour-only.** The spectrum reinforces; the **count** (`14 מתוך 19`) and the section contents
  carry the meaning. Status in lists uses text + shape, not hue alone.
- **Emoji are decorative** — `aria-hidden`, with the meaning in adjacent text (so a screen reader never
  reads "hand-over-mouth").
- **Radial over linear.** The ring is presentational; the always-present **hidden ordered list** (with a
  visible "רשימה" toggle) is the real semantic/keyboard layer — every item a focusable control with a full
  `aria-label` ("כיריים · ניקוי גריל · הושלם 21:40 ע״י דנה, באיחור").
- **Contrast** ≥ 4.5:1 for text; glass-centre text is near-white on dark. Verify each spectrum stop behind
  any text/cap.
- **Focus-visible** on every interactive element; the header line, lens pills, action buttons, and item
  rows are all keyboard-reachable.
- **Reduced motion:** honour `prefers-reduced-motion` — ring fill and reveals settle instantly, no
  continuous motion.

## 11. Motion

Per `design-taste` (`MOTION_INTENSITY: 6`) — spring physics via `motion/react`, no linear easing:

- Ring **fills** with a spring on load and when `fraction` changes; a completion springs the count and (at
  100%) triggers the celebration banner.
- Lists reveal with the existing `staggerChildren`. Lens switch springs the focused set in.
- No continuous/ambient animation (kept the clock idea out, so there's no perpetual motion). All gated by
  `prefers-reduced-motion`.

## 12. Affected surfaces

- **`src/commons/pages/OverviewPage/OverviewPage.jsx`** — rewritten around the new model.
- **`src/commons/pages/OverviewPage/snapshot.js`** — new pure derivation helper.
- **`src/commons/pages/OverviewPage/overview.css`** — ring, sections, week, lens, log; new spectrum tokens
  in `src/commons/styles/`.
- **Content:** `src/content/commons/{he,en}/commonsShell.content.js` — extend `snapshot.*` (living-line
  templates, section labels, emoji-line copy).
- **Reuse (no change):** `useWorkspaceTree` (`progress`, `hasChildren`, `claim`, `resolveMissed`,
  `deferOccurrence`), `fetchRoster`, `opDay.js`, `TaskViewPage`.
- **Docs:** record the "never say ביחד" rule + the spectrum/credit conventions in
  `docs/commons-standards.md`; update `src/commons/COMMONS.md` status when built.

## 13. Out of scope / deferred

- **The full `יומן` view** (chronological add/edit/done/claim feed behind "כל היומן ←") — its own screen,
  already anticipated in the work-engine spec §8. This screen ships only the short **לאחרונה** credit strip.
- **Per-day drill-in** from the week strip — a read-only past-day view; later.
- **English copy** — keys scaffolded, not authored now.
- **Realtime live updates** — nice-to-have; first pass renders from the loaded tree on mount.

## 14. Open decisions

- **"Approaching" window** for *תכף נגמר הזמן* — default ~90 min; confirm during build.
- **Living-line template set** — final strings are a dedicated copy pass with the founder.
- **Exact spectrum stops / plateau widths** — tune in-browser against real data.
- **Credit-strip cap** (≈4) and whether claims (🙌) appear there alongside completions.

## 15. Decision log

- **2026-06-16** — Snapshot reframed from a manager audit/triage console (Handoff B) to a communal,
  circular, playful "us" view. Ring = completion as a banded colour spectrum (red→purple, magenta close),
  no % digit. Areas are equal lenses, not a ranked breakdown. Actions reuse existing occurrence ops as
  *mutual aid* (logged deviation from Handoff B's read-only constraint). "ביחד" banned from UI copy;
  togetherness conveyed via "we" framing. Emoji language incl. the 🙆 "דחה למחר" classic.
