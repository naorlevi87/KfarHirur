# Commons — תמונת מצב (the pulse) + תמונת יום (the day) — Design

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: **v2 — evolved in conversation 2026-06-16/17, under external review.** Date: 2026-06-17. Module: `src/commons/`.
> Supersedes Handoff B and the v1 concept below. A first pass (v1: ring + free/stuck/recent + week) is
> already built on `feat/commons-snapshot`; this spec defines the **target** model and marks what's built
> vs pending. Builds on the routines/runs model (`docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`).

---

## 1. The core idea (read this first)

There is **one list** — an operational day's tasks — shown in **two views that differ only by filters**:

| | **תמונת מצב** (the *pulse*) | **תמונת יום** (the *day*) |
|---|---|---|
| Question | "what needs us **now**?" | "the **whole** day, in full" |
| States shown | פנוי · בדרך · נתקע | + בוצע + עוד-לא-רלוונטי (everything) |
| Relevance filter | **on** (hides not-yet-relevant) | **off** (shows all) |
| Row grammar | parent ▸ → items | same |
| It is | the calm action surface | the record |

**One sentence:** *the pulse is the day with two filters on (only-now + only-needs-hands); remove the filters and you get the full day.* This is an architecture (one source of truth) **and** the mental model.

Three tabs frame it: **שלי** = me · **לוח** = the board where you create/edit/browse by area · **תמונת מצב** = the communal pulse. The **day screen** is reached *from* the pulse (tap the ring or a day-cake), not a tab.

## 2. The pulse — `תמונת מצב`

Top → bottom:

1. **Living line** — "מה קורה היום?" + one warm, op-day-phase sentence ending on an invitation. Tappable → jumps to פנוי. Never says "ביחד" (§7).
2. **Area lens** — `הכל · <area> …` pills focus the ring + sections onto one area. Equal, fixed order — a lens, not a leaderboard.
3. **The ring** — collective completion. **A single solid colour filling the arc to the done-fraction**, the colour chosen by the % along the spectrum (red→…→purple). Centre = "מה מצבנו?" + the count `X מתוך Y` (**no % digit**). Tapping the ring → **today's day screen**.
4. **Three live state-sections** — each a list of **parent-collapsible rows**:
   - **מה פנוי?** — free / no one took it.
   - **מה בדרך?** — taken, not done yet (stays visible: you see who's on it, and can still step in).
   - **מה נתקע?** — overdue / missed.
   Row grammar: a task **with sub-items** is `▸ title · X/Y · time`; expanding shows **only that section's relevant children**. A task **without** sub-items is a single row. **A parent may appear in more than one section**, each showing only its matching items. Per-item actions in §6.
5. **Week** — seven small **pie-cakes** (each *cut* to that day's done-fraction and *coloured* by it; neutral when the day had no tasks), with weekday letters. Tapping a cake → that day's day screen. *(Trend without a chart.)*
6. **Accessible list** — an always-present visually-hidden ordered list mirroring the items (a11y, §8).

**Relevance filter:** the pulse shows an item only once its relevance window has started (§4). The log/credit feed does **not** live on the pulse — it lives in the day screen.

## 3. The day — `תמונת יום`

The **full record of one op-day**. Reached by tapping the ring (today) or any week-cake (that day). Route: `/commons/:slug/day/:date`.

- Header: the date; back to the pulse.
- The same ring for that day.
- The same parent-▸ row grammar, but grouped to show **everything**: **בוצע** (done — with who + when), **בדרך**, **פנוי / עוד-לא-רלוונטי**, **נתקע**. Relevance filter **off**.
- The **credit log** ("who did what, when") lives here — this is the record, not the pulse.
- Handling actions (claim / resolve / defer / skip) available per item, same as the pulse.

## 4. Relevance window (model C)

Tasks become relevant at a time, not at 08:00. "להזמין דגים" matters from ~21:00, not the morning.

- Each item has an **optional `show_from`** time-of-day. **Default: none → visible all op-day** (today's behaviour). Only the few time-sensitive items set one.
- Read on the **op-day clock (08:00→08:00)**, so a window like **21:00→02:00 is one contiguous span** (02:00 is "later" in the same op-day). No wrap-around special-casing.
- The **pulse** hides an item before its `show_from`; the **day screen** shows it (as "עוד לא רלוונטי"). Rule of thumb: **the clock can bring a task *in*; only a state change takes it *out*** (so things don't vanish under you).
- **New data + authoring:** `show_from` is a new field on items (and on routine definitions), with an optional **"מופיע מ-"** input in the create/edit form (`לוח`). This touches the schema + `TaskFormPage`, not just the pulse.

## 5. Parent / child row grammar

From `docs/commons-standards.md` (row grammar): a task with sub-items is **made of other things** → caret + `X/Y` progress + time, **no checkbox**; a leaf is **done directly** → its action. Why it matters here: future daily tasks decompose ("סגירת יום", "רשימת הכנות") into many small items; flattening them is clutter. So in every list the parent is one collapsible row; open it for the items.

## 6. Actions — mutual aid, not management

Reuse existing occurrence ops; surface them inline.

| Action | Copy | Maps to | Who |
|---|---|---|---|
| Take it onto me | **עליי 🙌** | `claimNode` | any eligible member |
| It did happen (resolve missed) | **זה כן קרה 🫢** | `resolveMissed(id, who, when)` — **who + when picker** | any member |
| Push to another day | **דחה למחר 🙆 / תאריך אחר 📅** | `deferOccurrence` | manager+ |
| Not needed | **לא צריך 🤷** | `deferOccurrence(id, null)` | manager+ |
| Put it on someone | **עליו 🫵** | `assignNode` | **manager/admin only** |

- **`resolve_missed` gained `done_at`** (migration `20260616100000`, applied) so "זה כן קרה" records *who* + *when*; the who+when picker is `AttributionSheet`.
- Attribution to **another** person (עליו) is manager/admin-only. "עליי" (self) is everyone.
- Tapping a title opens the existing item detail (`TaskViewPage`).

## 7. Playful layer & copy

- **The ring blooms through the spectrum** as the day fills; 100% = a celebration banner. Colour = progress, always reinforced by the count (never colour-only).
- **Credit lines are pools** — each completion shows a warm one-liner picked per item, so it's a small surprise (😇🔥🐢…). On-time and late have separate pools. Celebrate the **act and the group**, never an individual tally.
- **Never say "ביחד"** — convey togetherness via the "we" framing ("מה איתנו", "מה מצבנו", "מי לוקח / תופס"). (Locked in `docs/commons-standards.md`.)
- All copy in `src/content/commons/{he,en}`. No hardcoded strings.

## 8. Accessibility (IS 5568 / WCAG 2.1 AA — legal)

Number/text carries meaning (colour only reinforces); emoji are `aria-hidden` with meaning in adjacent words; the radial ring is presentational over an always-present hidden ordered list (keyboard + SR); contrast ≥ 4.5:1; visible `focus-visible`; honour `prefers-reduced-motion`.

## 9. Data & derivation

`fetchTree` already loads every node; `fetchRoster` gives names — the screens derive from memory. **No new *reads*.** Pure helpers `buildSnapshot` / `buildDay` in `OverviewPage/snapshot.js` produce the view models (tested with `node:assert`). The only new *write-path* data is `show_from` (§4) and the already-applied `resolve_missed(done_at)`.

## 10. Affected surfaces

- `OverviewPage/` — `OverviewPage` (pulse), `DayPage` (day), `snapshot.js` (`buildSnapshot`/`buildDay`), the section/ring/week/list/sheet components, `overview.css`. *(v1 built; this spec evolves it.)*
- `styles/spectrum.js` + tokens — colour-by-fraction.
- `tasks/TaskFormPage.jsx` + schema — the new **`show_from`** field.
- `data/commons` + `useWorkspaceTree` — `assign`, `resolveMissed(done_at)` *(done)*; a `show_from` column.
- Docs: `commons-standards.md` (done) + `COMMONS.md` status.

## 11. Built vs pending

- **Built (v1, on branch):** ring (solid colour by %), area lens, free/stuck sections, credit strip, week pies, accessible list, day screen (basic), who+when picker, manager assign, the `resolve_missed(done_at)` migration.
- **Pending (this spec's evolution):** the **three-state** model incl. **בדרך**; **parent-collapsible** row grammar in the lists; the **relevance window** (`show_from` + form field); making the **day screen the full record** + moving the credit log into it; the ring/cake tap → day-screen navigation; resolving the open questions below.

## 12. Open questions — under review (decide before building the evolution)

These are the genuinely contested points (raised in conversation + flagged for external review):

1. **Three states or two?** Keep פנוי / בדרך / נתקע, or collapse "נתקע" into a *warm property* of פנוי ("מחכה ליד" — work re-enters the open pool rather than a standing "overdue" section)? Trade-off: triage clarity vs. the non-hierarchical/circular value.
2. **Parent in multiple sections vs. one row.** Show a parent once per relevant section (scoped children) — or once, in its most-urgent section, with a mixed-state child list? Risk: the same title appearing 2–3× reads as duplication on a phone.
3. **"עליו" (assign to another) — keep manager-only, or replace with invite/“call-for-help” anyone can do?** The value tension: any role-gated capability is, by definition, hierarchy.
4. **"Day" vs "Cycle" for generality.** The 08:00→08:00 op-day fits a kitchen; a garden/protest/NGO may need "cycle" (a day / week / event). How far to abstract now vs. later.
5. **Relevance legibility.** A persistent "+N מופיעים מאוחר יותר ←" line on the pulse so deferred items never feel hidden; entry-by-clock, exit-by-state only.
6. **Red-at-zero.** The empty/0% ring shouldn't read as alarm at 08:00 — soften the spectrum's low end to "potential," not "behind."
7. **Credit lines: ephemeral vs logged**, and context-fit vs pure-random, to avoid tonal misfires and staleness.

## 13. Decision log

- **2026-06-16** — Snapshot reframed from a manager audit console to a communal, circular, playful "us" view. Ring = completion spectrum; areas = lenses; actions = mutual aid; "ביחד" banned. (v1 built.)
- **2026-06-17** — Evolved to **pulse + day-screen** (one list, two filters); added **בדרך** state + **parent-collapsible** grammar; added the **relevance window** (`show_from`, op-day clock); the **day screen becomes the full record** and hosts the credit log; cakes/ring navigate to day screens; `resolve_missed` gained `done_at` + who/when picker; manager "עליו" assign. Open questions (§12) sent to external review before building.
