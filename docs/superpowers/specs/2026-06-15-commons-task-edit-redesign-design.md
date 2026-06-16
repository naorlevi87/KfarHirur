# Commons — Task / Routine Edit Redesign (Design)

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: approved design, pre-implementation. Date: 2026-06-15.
> Scope: `src/commons/tasks/TaskFormPage.jsx`, `RecurrenceField.jsx`, `TaskViewPage.jsx`,
> the Hebrew/English commons content, and `tasks.css` / `CommonsLayout.css`. **No schema or
> data-layer changes** — pure UI + content + CSS, plus one new capability (editing a single
> occurrence) that reuses the existing `saveTask` path.
> Builds on `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md` (the routine /
> definition / run model) and conforms to `docs/commons-standards.md`.

## 1. Problem

The task edit form (`TaskFormPage`) was built for one-off tasks and has drifted for routines:

- Pressing **עריכה** on a run instance silently jumps to the template with no signal that the edit
  hits *all future occurrences* — and offers no way to touch just today.
- The form **never shows a routine's orders** (its child definitions), so they can't be removed there.
- Entering edit **autofocuses the title** and pops the mobile keyboard, every time.
- Two stacked controls express the same thing — a `חד-פעמי / חוזר` toggle *and* `RecurrenceField`'s
  own `בלי חזרה / יומי / שבועי / חודשי` row — visual duplication.
- The recurrence interval box can't be cleared (`min=1` snaps any empty edit back to `1`).
- Fields each take a full row; the form is taller and noisier than it needs to be.

## 2. Decisions (locked with Naor)

1. **Edit-instance → choice dialog**, not a silent redirect. (Calendar's "this event / all events".)
2. **Owner label `אחראי/ת` → `מי לקח?`** everywhere (form + view + reassign dialog), matching the
   module's claim/"לקיחה" language (`עלי`, `לקחת על עצמי`). EN mirrored for parity.
3. **Owner + skill share one row.**
4. **Recurrence collapses to one control** — the `חד-פעמי / חוזר` toggle is removed; `RecurrenceField`
   is the single source.
5. **Tapping an order's name in series-edit opens that order's own edit.**
6. **No autofocus** on entry.

## 3. The edit-entry dialog (TaskViewPage)

Pressing **עריכה** while viewing a **run instance** (`node.occurrence_date` set) opens a branded
sheet (same pattern as the existing resolve/defer sheets — not a native dialog):

```
עריכת משימה קבועה
עורכים את המשימה הקבועה. הריצה של היום כבר יצאה — השינוי יתפוס ממחר.
[ ערוך רק את היום ]            [ אישור ]
```

- **אישור** (primary) → `navigate(.../task/<template_id>/edit)` — edits the **series** (future runs).
- **ערוך רק את היום** → `navigate(.../task/<instanceId>/edit?scope=occurrence)` — edits **today's
  instance only**.
- Backdrop tap = cancel.

Pressing עריכה on the **definition itself** (routine root or an order, `occurrence_date` null) opens
the form directly — no dialog (you are already on the series).

Content keys (`view`): `editSeriesTitle`, `editSeriesBody`, `editSeriesConfirm` ("אישור"),
`editTodayOnly` ("ערוך רק את היום").

## 4. The form (TaskFormPage)

### 4.1 Modes

The form derives its mode from the node:

| Mode | Condition | Series controls | Sub-tasks | Notice |
|---|---|---|---|---|
| **plain task** | not under a routine, no recurrence | one-off date/time | yes | — |
| **routine root** | `node.recurrence` set | recurrence (`RecurrenceField`) | yes | — (series is implicit) |
| **order** (under routine) | an ancestor has `recurrence` | day-mask + `עד שעה` | yes | — |
| **occurrence** | `node.occurrence_date` set (`?scope=occurrence`) | none | — | "עריכת המופע של היום בלבד" |

`occurrence` mode is the new branch: it hides recurrence, day-mask, sub-tasks, and start/deadline; it
shows title · description · מי לקח? · מי יכול? · עד שעה, and saves to the instance node. It guards
against ever writing a `recurrence` onto an instance.

### 4.2 Save model & visual hierarchy

**Save model (amends `docs/commons-standards.md` §2.3 — see Decision Log).** The form keeps an
**explicit Save / Cancel** commit for its own *fields* (title, description, who, recurrence, days,
time). It is the same on Create and Edit. The **sub-tasks** section is the one exception: sub-tasks
are independent objects (their own page, status, completion), so add/remove write **immediately** —
and the UI makes that honest rather than hiding it (see §4.3). Cancel discards field edits; it does
not undo a sub-task add/remove (each sub-task carries its own trash). This is the Notion/Linear
split: fields commit, child objects are live. Auto-save was rejected — Create can't auto-save, and
silent saves on a weak mobile connection conflict with the project's "never lose work" rule.

**Three zones.** The form reads as three stacked zones with thin separation between them, not one flat
list: **זהות** (title, description, who) → **תזמון** (recurrence / days / time, or one-off dates) →
**תת-משימות** (the live card). Zone separation is quiet (spacing + a hairline rule), not heavy boxes.

**Layout changes:**

- **No `autoFocus`** on the title input.
- **Owner + skill** share one row (`.commons-fieldRow`, flex). Split **60/40** toward "מי יכול?"
  (skills run longer than a single owner name); wraps to stacked under ~340px. Verify truncation on a
  real narrow viewport before shipping.
- **Recurrence**: delete the `scheduling` (`חד-פעמי / חוזר`) block. Render `RecurrenceField` as the
  single control (its `בלי חזרה` button is the "one-off" state). The one-off date fields
  (`startDate`, `due`, `dueTime`) render **below it only when `recurrence` is null**.
- **"כל X ימים"** stays a tight inline row directly under the frequency buttons.
- **Motion (MOTION_INTENSITY 6).** Wrap the appear/disappear of the day chips, the one-off date
  fields, and sub-task rows in `AnimatePresence` + `layout` spring transitions — no instant
  show/hide. Continuous values via Framer Motion, never `useState` (project rule).
- **Delete separation (standards §4).** `מחיקה` sits well below `שמירה` with a clear gap and a
  hairline rule above it, low-emphasis (danger text, not a filled button), so it is never fat-fingered
  next to the commit.

### 4.3 Sub-tasks — the live card (edit mode)

In edit mode, list the node's **same-layer child sub-tasks**
(`tree.byParent.get(node.id)`, `kind === 'task'`, `occurrence_date` null). Everything here is a
**תת-משימה** — the same generic vocabulary the view already uses (`view.subtasks`, `view.addSub`); no
domain-specific "order" wording.

The section is a **visually distinct card** (its own surface/border, set apart from the fields above)
with a quiet inline hint that it **saves immediately** (`form.subtasksLive`, e.g. "נשמר מיד"). This is
what resolves the mixed-save confusion: the card *looks* live, so add/remove acting outside Save/Cancel
reads as intentional, not a bug.

```
┌ תת-משימות ························· נשמר מיד ┐
│ • עגבניות                              🗑    │
│ • דגים                                 🗑    │
│ [ הוספת תת-משימה…                  ] [ + ]   │
└──────────────────────────────────────────────┘
```

- The name is a button → `navigate(.../task/<childId>/edit)` (edit that sub-task).
- A trailing `IconTrash` button → `ConfirmDialog` → `tree.removeNode(childId)`.
- An **add row** at the bottom mirrors the view's `commons-subAdd` grammar: a text input + `+`.
  Enter / quick-add inserts immediately (`tree.addNode({ parentId: node.id, kind: 'task', title })`);
  the `+` opens the full new-sub-task page (`/task/new?parent=<node.id>&title=…`) so days/time can be set.
- Add **and** remove act **immediately** (direct `tree` writes), independent of the form's Save/Cancel —
  consistent with how sub-task add/remove already behave in the view. They do not arm the form's
  unsaved-changes guard.
- Empty list (no sub-tasks yet) → the rows are omitted but the add row still shows.

Content keys: reuse `view.subtasks`, `view.addSub`, `view.addSubDetailed`; new `form.subtasksLive`,
`form.removeSubTitle`, `form.removeSubBody`.

### 4.4 Clearable interval (RecurrenceField)

The number input gets a local **draft string** so it can be momentarily empty while typing. On each
change, if the draft parses to ≥1 it emits `interval = min(99, n)`; an empty/zero draft does **not**
emit (the rule keeps its last valid interval). On blur, an empty/invalid draft resets to the current
interval. The draft re-syncs when the rule's interval changes from outside.

## 5. Accessibility & standards (IS 5568)

- The choice sheet reuses the existing `role="dialog" aria-modal` sheet pattern; buttons are real
  `<button>`s, keyboard-reachable, with the module's `focus-visible` rings.
- Trash buttons carry `aria-label` (`removeOrder` aria text); every removal confirms via
  `ConfirmDialog` (no bare delete) — `docs/commons-standards.md` §4.
- Colors stay on `var(--commons-*)` tokens; the two-column row keeps 4.5:1 contrast (unchanged tokens).
- Removing autofocus does not trap or hide focus — the first tap lands wherever the user intends.

## 6. Out of scope

- Re-syncing today's run after a series edit ("apply to today too" from the routines spec §4.3).
- Any schema, RLS, or generation change.

## 7. Affected files

- `src/commons/tasks/TaskViewPage.jsx` — edit-entry choice sheet for instances.
- `src/commons/tasks/TaskFormPage.jsx` — modes, occurrence branch, owner+skill row, recurrence
  de-dupe, orders list, drop autofocus.
- `src/commons/tasks/RecurrenceField.jsx` — clearable interval draft.
- `src/content/commons/{he,en}/commonsShell.content.js` — `מי לקח?` rename + new keys (§3, §4.3).
- `src/commons/tasks/tasks.css` (+ `CommonsLayout.css` if needed) — `.commons-fieldRow`, orders-row,
  notice styles. Tokens only.
