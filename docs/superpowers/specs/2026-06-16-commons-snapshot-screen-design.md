# Commons — תמונת מצב (the pulse) + תמונת יום (the day) — Design

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: **v3 — locked after external review + founder decisions. Building.** Date: 2026-06-17. Module: `src/commons/`.
> A first pass (v1: ring + free/stuck + week) is built on `feat/commons-snapshot`; this spec is the
> target and §11 marks built vs pending. Builds on the routines/runs model
> (`docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`).

---

## 1. The core idea

One **op-day** task list, shown in **two views that differ only by filters**:

| | **תמונת מצב** (the *pulse*) | **תמונת יום** (the *day*) |
|---|---|---|
| Question | "what needs us **now**?" | "the **whole** day, in full" |
| Shows | overdue · free · in-progress (action states) | + done + not-yet-relevant (everything) |
| Relevance filter | on | off |
| It is | the calm action surface | the record |

*The pulse is the day with two filters on; remove them → the full day.* Tabs: **שלי** (me) · **לוח** (build/edit by area) · **תמונת מצב** (pulse). The **day** screen is reached *from* the pulse (tap the ring or a day-cake).

## 2. The pulse — `תמונת מצב` (top → bottom)

1. **Living line** — "מה קורה היום?" + one warm op-day-phase sentence ending on an invitation. Never says "ביחד".
2. **Area lens** — `הכל · <area> …` focuses everything below onto one area. Equal pills, fixed order.
3. **The ring** — collective completion: a single arc filled to the done-fraction, coloured along the spectrum (§7). Centre = "מה מצבנו?" + count `X מתוך Y` (no % digit). **Tapping the ring → today's day screen.**
4. **Three state-sections, in this order:**
   1. **עבר הזמן** *(overdue/missed)* — **first and visually emphasised; the most urgent.** Warm wording, clear urgency.
   2. **מה פנוי?** *(free / no one took it)*.
   3. **מה בדרך?** *(taken, not done yet — you see who's on it and can still step in)*.
   Row grammar: a task **with sub-items** = `▸ title · X/Y · time`, expanding to that section's relevant children; a task **without** = a single row. **A parent may appear in several sections**, each showing only its matching items — the `X/Y` count makes clear it's one shared task seen from different angles. *(Founder decision: keep multi-section over the reviewers' one-row, because seeing "what's needed here" per state is the point.)*
5. **"+N מופיעים מאוחר יותר ←"** — a quiet, tappable line when items are hidden by the relevance filter (§4); tap → today's day screen. Nothing is ever silently hidden.
6. **לאחרונה** — a short playful strip of the last ~4 completions, each with its **random credit line + who + when** (e.g. *"שי סידר את הבר · נסגר בקלות 💪 · לפני 5 דק׳"*). The fun is on the main screen for everyone — *kept playful on purpose*. 100% → a celebration banner.
7. **Week** — seven small **pie-cakes** (cut + coloured by each day's completion; neutral when empty), weekday letters; tap a cake → that day's screen.
8. **Accessible list** — always-present visually-hidden ordered list mirroring the items (§8).

Relevance filter (§4) gates what enters the pulse.

## 3. The day — `תמונת יום`

The **full record of one op-day** (route `/commons/:slug/day/:date`), reached by tapping the ring (today) or a week-cake. Same ring + same row grammar, but **everything**: done (with who + when + its credit line), in-progress, free, **not-yet-relevant**, overdue. It is literally "מה היום with the relevance filter off." The full who-did-what record lives here (the pulse only shows the short לאחרונה strip).

## 4. Relevance window (model C)

- Each item has an **optional `show_from`** time-of-day. **Default none → visible all op-day.** Only time-sensitive items set one ("להזמין דגים" from 21:00).
- Read on the **op-day clock (08:00→08:00)**, so 21:00 and 02:00 are both inside the same op-day, in order. `show_from` is one-sided (a *from*, no *until*); the deadline (`due_time`) is separate and unchanged.
- The **pulse hides** an item before its `show_from` and shows the **"+N מופיעים מאוחר יותר"** line instead; the **day screen shows** it as "עוד לא רלוונטי". Rule: **the clock brings a task in; only a state change takes it out** (nothing vanishes under you).
- **Propagation:** `show_from` is a column on `commons.nodes`; `run_recurrences` copies it from each routine *definition* item to its cloned *run* item at generation (exactly like the per-item target time). Ad-hoc one-offs set it directly.
- **Authoring:** an optional **"מופיע מ-"** time input in the create/edit form (`TaskFormPage`).

## 5. Parent / child grammar & taking a whole task

Per `docs/commons-standards.md`: a parent (has sub-items) = caret + `X/Y` + time, no checkbox; a leaf = its action. **Taking a parent** uses the **same "מי לוקח?" action**; taking the whole thing cascades ownership to all its sub-items (already how `effectiveOwner` works), **behind a confirm dialog**: *"לקחת את כל סגירת יום? כל תת-המשימות יעברו עליך."* Most of the time people take the whole parent; taking a single child is also fine.

## 6. Actions — mutual aid, not management

| Action | Copy | Behaviour | Who |
|---|---|---|---|
| Take it | **מי לוקח? → אני 🙌** | claim onto me (parent cascades, with confirm §5) | anyone eligible |
| Suggest it to someone | **מי לוקח? → מציע ל-X** | marks **"הוצע ל-X"**; X taps **accept** (becomes theirs) or **pass** (back to open) | **anyone** (flat — no manager push) |
| It did happen | **זה כן קרה 🫢** | resolve missed → who + when picker | any member |
| Push to another day | **דחה למחר 🙆 / תאריך אחר 📅** | defer | manager+ |
| Not needed | **לא צריך 🤷** | skip | manager+ |

- **Founder decision:** the old manager-only **"עליו" (direct assign) is removed**, replaced by the flat **"מציע ל-X"** invite that the person accepts — same for everyone, no hierarchy. (Supersedes the v1 `assign`/`עליו` built in Phase 2.)
- "מציע ל-X" at launch shows an **in-app "הוצע ל-X" marker**; a real phone/notification nudge comes with the future **notifications** feature.
- `resolve_missed` already takes `done_at` (migration applied) for the who+when picker.

## 7. Colour, ring & playful layer

- **Spectrum: orange → yellow → green → blue → purple. No red at all.** Low/empty = warm **orange** (friendly, never "you're behind"). The arc fills and travels the spectrum as completion rises.
- **Big ring at 100%** → a **full rainbow** across the whole wheel 🌈 (celebration). **Small week-cakes** fill the same spectrum and **end at purple** at 100%.
- Colour reinforces; the **count always carries the meaning** (never colour-only — §8).
- **Credit lines stay playful and shared** — random per completion from big pools (split on-time vs late so a line never lands cruelly), shown in לאחרונה and at the completion moment. The jokes are a feature, not noise.
- **Never say "ביחד"** — convey togetherness via the "we" framing. All copy in `src/content/commons/{he,en}`.

## 8. Accessibility (IS 5568 / WCAG 2.1 AA — legal)

Number/text carries meaning (colour only reinforces); emoji `aria-hidden` with meaning in adjacent words; the ring is presentational over an always-present hidden ordered list (keyboard + SR); state sections distinguished by text + label, not hue alone; contrast ≥ 4.5:1; visible `focus-visible`; honour `prefers-reduced-motion`.

## 9. Data & derivation

`fetchTree` + `fetchRoster` already load everything — the screens derive in memory via pure `buildSnapshot` / `buildDay` (`OverviewPage/snapshot.js`, `node:assert` tested). New write-path data: **`show_from`** (column + `run_recurrences` copy + form field) and the in-app **"הוצע ל-X"** proposal marker (a `proposed_to` member ref on the node, cleared on accept/pass). `resolve_missed(done_at)` is done.

## 10. Affected surfaces

`OverviewPage/` (pulse, DayPage, `snapshot.js` build helpers, section/ring/week/list/sheet components, `overview.css`) · `styles/spectrum.js` + tokens (orange→purple, no red, 100% rainbow) · `tasks/TaskFormPage.jsx` + schema (`show_from`) · `data/commons` + `useWorkspaceTree` (proposal accept/pass; `show_from`) · `run_recurrences` (copy `show_from`) · `commons-standards.md` (done) + `COMMONS.md`.

## 11. Build status

**Built — steps 1–4 (on `feat/commons-snapshot`):**
1. ✅ **Palette** — orange→purple, no red; big ring 100% rainbow; week cakes %-pies ending purple (`spectrum.js`).
2. ✅ **Three states + order** — `pulse` grouping (overdue/free/in-progress) by parent; **עבר הזמן** first + emphasised; **parent-collapsible** rows with this-block count chips ("2 פנויות") beside the title; **one-line** items + sub-task elbow; **cascade-take** with confirm; **ring → today's day**; per-section expand keys.
3. ✅ **Day screen** — the done-list is the day's **log** (credit line + who + when).
4. ✅ **Relevance window** — `show_from` column + `run_recurrences` copy (migration `20260617000000`, applied) + pulse filter + **"+N מופיעים מאוחר יותר"** line + **"מופיע מ-"** input in `TaskFormPage` (orders + one-offs).

**Pending — step 5 (deferred to its own window):**
5. ⏳ **Flat "מציע ל-X" invite**, replacing the manager-only `עליו`. Needs **backend RPCs** (members can't write `owner_id`/`proposed_to` directly): `propose_node`, `respond_proposal` (accept→claim self, pass→clear), a `proposed_to` column, the unified **"מי לוקח? → אני / מציע ל-X"** menu, and a "הוצע ל-X" marker. In-app only at launch; phone push waits for the notifications feature. **Full brief: `docs/superpowers/handoffs/D-snapshot-invite.md`.**

## 12. Decisions (resolved from review)

1. **Parent in multiple sections — kept** (founder), with `X/Y` to signal it's one task; plus take-the-whole-parent (cascade + confirm).
2. **Overdue kept as its own section, emphasised, first** (founder) — the urgency signal the crew needs; wording stays warm.
3. **"מציע ל-X" flat invite replaces manager assign** — non-hierarchical; anyone can suggest, the person accepts.
4. **"Day" kept now**; op-day boundary stays a single constant + per-workspace label later; variable-length "cycle" deferred (YAGNI until a second, non-kitchen workspace exists).
5. **"+N later" line locked**; relevance is entry-by-clock, exit-by-state.
6. **No red**; spectrum starts orange, 100% rainbow.
7. **Credit lines stay playful & shared** in לאחרונה (big, split pools); the day record keeps them too.

## 13. Decision log

- **2026-06-16** — Snapshot reframed to a communal, circular, playful "us" view (v1 built).
- **2026-06-17** — Locked v3 after a two-round external review (designer / standards / values lenses). Founder decisions: keep multi-section parents + take-whole-parent (cascade + confirm); overdue stays its own emphasised first section; flat "מציע ל-X" invite replaces manager "עליו"; spectrum drops red (orange→purple, 100% rainbow); relevance window C with "+N later" legibility; playful shared credit log kept. Notifications design deferred. Pulse + day-screen = one list, two filters.
- **2026-06-17 (build)** — Shipped steps 1–4 (palette · 3-state pulse · day-log · relevance window incl. `show_from` migration + form input). Step 5 (the flat invite) deferred to `docs/superpowers/handoffs/D-snapshot-invite.md` — it needs member-permission RPCs, so it gets its own focused window. Late-night UI follow-ups still open: the parent chip count copy is per-block; verify the relevance filter against the real seeded "הזמנות יומיות" routine (set a "מופיע מ-"); confirm overdue-meta placement on a phone.
