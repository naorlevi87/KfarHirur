# Commons — Recurring Task: Base vs Occurrence (Design)

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: approved design, pre-implementation. Date: 2026-06-16.
> Scope: `src/commons/tasks/TaskViewPage.jsx`, `TaskFormPage.jsx`, `useWorkspaceTree.js`
> (`addNode` args), `src/commons/icons.jsx`, `tasks/taskScreens.css`, `commons-tokens.css`,
> the Hebrew/English commons content, plus a small shared sub-task-defaults helper.
> **No schema or data-layer query changes** beyond passing inherited fields into the existing
> `addNode` / `createNode` path. Builds on and refines
> `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md` and
> `docs/superpowers/specs/2026-06-15-commons-task-edit-redesign-design.md`; conforms to
> `docs/commons-standards.md`.

## 1. Problem

The view and edit surfaces don't yet distinguish a recurring task's **base** (the editable
template — routine root and its order *definitions*, `occurrence_date` null) from a single
**occurrence** (a generated run instance, `occurrence_date` set). Symptoms:

- Opening a base **order** shows a `פתוחה` status chip — meaningless for a template (a definition isn't
  "open"). Its **שיוך** is also framed as a sterile "לא משויך" rather than the communal
  "מי שיכול לוקח", and the open-vs-specific assignment choice isn't expressed.
- A base order's actual settings — **which days** and **עד שעה** — are not shown in its view.
- A base order's `עד שעה` (`due_time`) never renders on sub-task rows in the view at all (the row
  only read `due_date`, and only for live, non-parent items).
- New sub-tasks start blank — they don't pick up the parent's **who-can** / **עד שעה**.
- The "has a note" marker is a `!`, which reads as alert/error, not "there's more here".
- An occurrence with no description still renders an "אין תיאור" block.
- The whole-day cancel is one undifferentiated **בטל את היום** with a stark danger-red.
- The add-note affordance sits flush against the cancel button, with no separation.

## 2. The organizing model — base **defines**, occurrence **does**

| | **Base** (definition) | **Occurrence** (instance) |
|---|---|---|
| Identity | routine root + order definitions; `occurrence_date` **null** | run root + run items; `occurrence_date` **set** |
| Declares | **who can** (מי יכול / skills) + **when** (days · עד שעה) + an **assignment choice** | the real doable thing for one day |
| שיוך (owner) | a **choice**: "מי שיכול לוקח" (open, default) *or* a specific person | inherited from the base (or taken/claimed per day) |
| Status | **none** (a template has no status) | open / done / missed / deferred / cancelled |

**Iron rule (locked):** *A base declares an **assignment choice**, never a status.* The owner of a base
is a deliberate choice between two modes:

- **"מי שיכול לוקח"** (open — the **default**): the base has no owner. Each generated run is
  **ownerless** and surfaces as "פנוי — מי לוקח?" — work is taken fresh each day. This is the natural
  resting state, so the communal ethos holds by default; assignment is the opt-in exception.
- **שיוך ספציפי** (a specific person): some routines really do belong to one person every time
  (e.g. "הזמנה מספק X"). When a base names an owner, that owner **inherits automatically** — into every
  generated run and into sub-tasks created under it.

This keeps `…recurring-routines-design.md` §5.1 (owner inherits into runs) — now **conditional**: an
open base inherits nothing (ownerless runs); an assigned base inherits its person. A base still **never**
carries a status (a template isn't "open" or "done").

## 3. Base view (`TaskViewPage`)

Detect the node's role: `isRoutine` = has `recurrence` (routine root); `underRoutine` = an ancestor
has `recurrence` and the node itself has `occurrence_date` null (a base **order** definition);
`isRun` = `occurrence_date` set. "Base" = `isRoutine || underRoutine`.

- **No status chip** on a base. (Routine root already hides it; extend the guard to base orders.)
- **Owner block shows the assignment choice**, framed communally: a specific person when assigned, or
  **"מי שיכול לוקח"** (not the sterile "לא משויך") when open — so the base reads as "anyone takes this
  each day" rather than "nobody owns this". No per-day claim button on a base (claiming happens on
  occurrences).
- **Settings line.** A base order shows a quiet settings row (alongside the assignment, in place of the
  status chip):
  **ימים** (its effective day-mask, via `effectiveDaysFor`, rendered with `rc.dayShort`) · **עד שעה**
  (`due_time`). The routine root already conveys its schedule through the recurrence chip, so it needs
  no extra line. Format: `ימים: א׳ ג׳ ה׳ · עד 11:00` (omit a side that's absent; "כל יום" when the
  mask is the full parent set).

## 4. Sub-task rows — always show עד שעה (`TaskViewPage` → `ItemRow`)

Compute the row time the way the form's `subTime` does: `k.due_time?.slice(0,5)` (definition) or the
time-of-day of `k.due_date` (instance). Render an `עד HH:MM` chip **whenever a time exists** —
including on **done** rows and **parent** rows (today the chip is suppressed for both, and definition
`due_time` was never read). Keep the `↪` next-morning prefix for pre-08:00 times (`beforeOpDay`); keep
the overdue accent only for live instances (`open|in_progress` + `isOverdue`); a done row's chip is
muted.

## 5. Sub-task creation inherits the parent's defaults

A shared helper `inheritedSubDefaults(parentNode)` → `{ ownerId, roleIds, dueTime }`, used wherever a
sub-task is created so the rule lives once:

- **Quick-add** (`quickAddSub` in the form, `addSub` in the view) passes the inherited values into
  `addNode`, which is extended to accept `ownerId` and `roleIds` (it already accepts `dueTime`).
- **Detailed-add** (the new-task form opened with `?parent=…`) seeds the form's initial **שיוך**,
  **מי יכול** (skills) and **עד שעה** from the parent so the inherited values are **visible and
  editable** before Save; the all-skills default no longer overrides an inherited skill set.

Scope: **שיוך (owner)** inherits the parent's assignment choice — an assigned parent passes its person
down; an open parent ("מי שיכול לוקח") passes "open" down (empty owner). **מי יכול (skills)** inherits
for any sub-task. **עד שעה (`due_time`)** inherits where the field exists (orders under a routine).
Everything inherited is a pre-filled default, fully editable — never a lock. `day_mask` continues to
inherit implicitly (`null` = the parent's effective days).

## 6. Base **edit** form (`TaskFormPage`)

The base **keeps** the owner control — it *is* the assignment choice. Reframe its empty/default option
from "לא משויך" to **"מי שיכול לוקח"** (open), so the picker reads `[ מי שיכול לוקח · …members ]`:
selecting "מי שיכול לוקח" leaves the base open (ownerless runs), selecting a person sets שיוך ספציפי
(inherits to runs + sub-tasks, §5). New bases default to open. The owner+skill row, day-mask, and
`עד שעה` controls are otherwise unchanged. (The "מי שיכול לוקח" framing of the open state is the
communal default — it applies wherever an owner can be open, but it matters most on a base, where the
choice decides every future day.)

## 7. Occurrence view — clean description

When a node has no description, **omit the description block entirely** (no "אין תיאור" placeholder).
Applies anywhere the description is empty — surfaced by the occurrence view but not occurrence-only.

## 8. Defer / skip — one per-item menu, with a conditional "דחה למחר"

Unify the two existing controls — the per-item **דחה / דלג** menu and the run-root **בטל את היום** —
into **one** defer/skip menu shown on **any** run item a manager can act on (leaf, parent, *or* the run
root): `isRun && canManage && status ∈ {open, in_progress}`. Each option carries the snapshot credit
emoji (`docs/commons-standards.md` §6; emoji decorative / `aria-hidden`, the Hebrew label carries the
meaning per IS 5568):

- **🤷 לא צריך הפעם** — **always present** → `cancelRun(item.id)`. `cancel_run` cascades the item's
  subtree to `cancelled`, so it is correct for a leaf, a parent branch, **and** the whole-day root
  alike. It replaces both the old root-only `בטל את היום` *and* the old leaf `defer_occurrence(null)`
  skip — one primitive for "not needed", at any level.
- **🙆 דחה למחר** — present **only** when the item does **not** already recur tomorrow **and** it is a
  **leaf** (a single occurrence `defer_occurrence` can cleanly respawn) → `deferOccurrence(item.id,
  tomorrowStr())`.
  - *Recurs tomorrow* = tomorrow's op-day weekday ∈ the item's definition effective days
    (`effectiveDaysFor(nodes, item.template_id)`). A **daily** item always recurs tomorrow → **no defer
    button** (it returns on its own; nothing to defer). This is the user's corollary.
  - Non-leaf items (a parent, or the run root) never show defer: `defer_occurrence` cannot cascade a
    subtree, and the only case it would otherwise arise (a non-daily parent on an off-day) needs a
    backend `defer_run` — deferred to a future change (§14).
- **📅 דחה לתאריך אחר…** — kept for **leaf** items (existing functionality) →
  `deferOccurrence(item.id, chosenDate)`.

Backdrop = cancel. **No backend change** — `cancel_run` and `defer_occurrence` are used strictly within
their proven scope (cascade-cancel any subtree; single-occurrence respawn for a leaf). The separate
`cancelDay` / `confirmCancel` path is removed; a daily routine's run root simply shows the one
meaningful action (🤷 לא צריך הפעם) in the unified menu.

**Retone the cancellation indication.** Replace the stark `--commons-danger` on the skip affordance
with a new warm **reddish-orange** token `--commons-cancel` (orange-red, ~`#ff8a4d`, verified ≥ 4.5:1
against the surface for any text use) — reads as "called off", not "error/danger". Hard-danger red
stays reserved for true destructive delete.

## 9. "Has a note" marker — circled-i, not `!`

Add a shared **`IconInfo`** (circle + i) to `src/commons/icons.jsx`, stroke-style to match the set.
In `ItemRow`, swap the `!` text for `<IconInfo size={14} />` inside the existing
`commons-subRow__note` span (keep `aria-label={v.hasNote}`). In CSS, strip the badge background (the
icon draws its own circle — no circle-in-circle) and recolor to `var(--commons-text-dim)` so it reads
as "more here", not alert.

## 10. Add-note block layout

Separate the `DocumentationBox` from the `commons-view__actions` row (which holds complete / cancel)
with the existing hairline divider + spacing (the `commons-formDivider` language), so "➕ הוסף הערה"
no longer sits flush against "בטל".

## 11. Accessibility & standards (IS 5568)

- The day-cancel sheet reuses the `role="dialog" aria-modal` sheet pattern; real `<button>`s,
  keyboard-reachable, module `focus-visible` rings. Emoji are `aria-hidden`; the Hebrew label carries
  the meaning.
- `IconInfo` is `aria-hidden`; the note marker's meaning is on the span's `aria-label`.
- New `--commons-cancel` token verified for contrast where used as text/icon on a surface.
- Colours stay on `var(--commons-*)` tokens; no hardcoded colours.

## 12. Content keys

- Open-assignment label: `form.ownerOpen` / `view.ownerOpen` ("מי שיכול לוקח") — replaces the
  "לא משויך" placeholder/first option on the owner picker (form) and the open-state owner label (view).
- Base settings line: `view.settingsDays` ("ימים"), `view.settingsUntil` (reuse `recurrence.until` /
  "עד"), `view.everyDay` ("כל יום") — reuse existing recurrence day labels (`rc.dayShort`).
- Defer/skip menu: reuse `view.deferTitle` ("דחה / דלג"), `view.deferTomorrow` ("דחה למחר"),
  `view.deferDate` ("דחה לתאריך אחר…"), `view.deferSkip` ("לא צריך הפעם"). The old `view.cancelDay` /
  `cancelDayTitle` / `cancelDayBody` keys fall out of use (leave them in content; no new key needed).
  Emoji are literals in the component, not content.
- Note marker keeps `view.hasNote`.

## 13. Affected files

- `src/commons/tasks/TaskViewPage.jsx` — base detection (`underRoutine`), hide status on base + frame
  the owner as the assignment choice ("מי שיכול לוקח" when open, no per-day claim), settings line,
  row `עד שעה` everywhere, empty-description omission, unified per-item defer/skip menu (conditional
  "דחה למחר"), `IconInfo` marker, doc-box separation.
- `src/commons/tasks/TaskFormPage.jsx` — reframe the owner picker's open option as "מי שיכול לוקח";
  seed שיוך + skills + עד שעה from parent on detailed-add; use `inheritedSubDefaults` for quick-add.
- `src/commons/commonsState/useWorkspaceTree.js` — `addNode` accepts `ownerId` + `roleIds` (passes to
  `createNode`).
- `src/commons/icons.jsx` — new `IconInfo`.
- `src/commons/tasks/taskScreens.css` — note-marker restyle, settings-line, day-cancel sheet,
  doc-box divider.
- `src/commons/commons-tokens.css` — `--commons-cancel`.
- `src/content/commons/{he,en}/commonsShell.content.js` — keys in §12.
- a small shared `inheritedSubDefaults` helper (co-located with the tasks module).
- `docs/commons-standards.md` — lock the new standards in the Decision Log: the base/occurrence split
  (base declares an assignment choice + cadence, never status; "מי שיכול לוקח" is the open default),
  sub-task inheritance, the circled-i note marker, and the warm `--commons-cancel` retone.

## 14. Out of scope

- Re-syncing today's run after a series edit ("apply to today too", routines spec §4.3).
- A backend `defer_run` RPC (cascade-defer a whole run/parent + regenerate it on a chosen off-schedule
  day). Until it exists, "דחה למחר" is offered only on leaf items that don't already recur tomorrow
  (§8); parents and the run root get "לא צריך הפעם" only.
- Replacing `DocumentationBox`'s `window.prompt` link entry (a pre-existing standards §2.2 violation —
  tracked separately, not part of this change).
- Any schema / RLS / generation change. Run generation already inherits the routine root's owner
  (routine spec §5.1); §2 only makes that owner a deliberate base-level choice (open vs specific) — no
  generation-code change is required.
