# Commons — Task / Routine Edit Redesign (Design)

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

| Mode | Condition | Series controls | Orders list | Notice |
|---|---|---|---|---|
| **plain task** | not under a routine, no recurrence | one-off date/time | — | — |
| **routine root** | `node.recurrence` set | recurrence (`RecurrenceField`) | yes | — (series is implicit) |
| **order** (under routine) | an ancestor has `recurrence` | day-mask + `עד שעה` | yes | — |
| **occurrence** | `node.occurrence_date` set (`?scope=occurrence`) | none | — | "עריכת המופע של היום בלבד" |

`occurrence` mode is the new branch: it hides recurrence, day-mask, orders, and start/deadline; it
shows title · description · מי לקח? · מי יכול? · עד שעה, and saves to the instance node. It guards
against ever writing a `recurrence` onto an instance.

### 4.2 Layout changes

- **No `autoFocus`** on the title input.
- **Owner + skill** wrapped in a `.commons-fieldRow` (flex, two equal columns; both are compact
  dropdown buttons, so they fit a mobile row). Stacks under ~320px via `flex-wrap`.
- **Recurrence**: delete the `scheduling` (`חד-פעמי / חוזר`) block. Render `RecurrenceField` as the
  single control (its `בלי חזרה` button is the "one-off" state). The one-off date fields
  (`startDate`, `due`, `dueTime`) render **below it only when `recurrence` is null**.
- **"כל X ימים"** stays a tight inline row directly under the frequency buttons.

### 4.3 Orders list (series edit only)

In edit mode, for a routine root or an order, list the node's **same-layer child definitions**
(`tree.byParent.get(node.id)`, `kind === 'task'`, `occurrence_date` null):

```
הזמנות
 • עגבניות                     🗑
 • דגים                        🗑
 [ שם ההזמנה…              ] [ + ]
```

- The name is a button → `navigate(.../task/<childId>/edit)` (edit that order).
- A trailing `IconTrash` button → `ConfirmDialog` → `tree.removeNode(childId)`.
- An **add row** at the bottom mirrors the view's `commons-subAdd` grammar: a text input + `+`.
  Enter / quick-add inserts immediately (`tree.addNode({ parentId: node.id, kind: 'task', title })`);
  the `+` opens the full new-order page (`/task/new?parent=<node.id>&title=…`) so days/time can be set.
- Add **and** remove act **immediately** (direct `tree` writes), independent of the form's Save/Cancel —
  consistent with how sub-task add/remove already behave in the view. They do not arm the form's
  unsaved-changes guard.
- Empty list (no orders yet) → the rows are omitted but the add row still shows.

Content keys (`form`): `orders`, `addOrder`, `addOrderDetailed`, `removeOrderTitle`, `removeOrderBody`.

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
