# Commons — Design & Interaction Standards

> **Living document.** This is the iron-rules / format-rules registry for the Commons module. It is
> not a dated spec — it is updated whenever a new standard is locked. Every existing and future
> Commons screen is measured against it.
>
> **How to use it:** before building or changing any Commons screen, read the relevant rules here and
> conform. If a screen needs to break a rule, that is a decision — raise it, decide it, and record the
> outcome in the Decision Log at the bottom (amend the rule or add an exception). Do not silently
> diverge.
>
> **Scope:** the Commons module (`src/commons/`). Site-wide rules live in `docs/architecture.md`;
> copy/voice rules live in `docs/voice.md`. This doc governs *interaction and layout structure* — how
> things behave and where controls live — not visual tokens (those are in `globals.css` /
> `commons-tokens.css`).
>
> **Status tags:** ✅ in force (code conforms) · 🔜 standard locked, not yet applied everywhere ·
> ⚠️ known violation to fix.

---

## 1. Chrome & navigation

### 1.1 Two-band header ✅
The top of every Commons screen is **two fixed bands**, owned by the shell — never re-built per page:

```
① App header   — PERSISTENT, identical on every screen:   ☰  …  שם המרחב
② Screen bar   — per screen:               [primary action]  …  ← back   כותרת המסך
```

- **Band ① (app header)** always shows the hamburger (`☰`) and the **workspace name**. A screen title
  must **never** overwrite the workspace name. You should always be able to see which workspace you
  are in, on every screen.
- **Band ② (screen bar)** shows the current screen's **title** (reading-start side), an optional
  **back chevron** beside the title, and the screen's **one primary action** (reading-end side).
- Band ② is present on **every** screen, tabs included — so the user always knows both *which
  workspace* and *which screen* they are on.
- Screens declare their bar via `useCommonsChrome({ title, showBack, action })`
  (`src/commons/commonsState/CommonsChromeContext.jsx`). The shell renders both bands; a screen never
  renders its own header.

**Why:** a screen title sharing one slot with the workspace name means the workspace identity
disappears the moment you open a focused screen. Two bands keep app identity and screen identity
separate and stable.

> Supersedes the single-bar rendering described in
> `docs/superpowers/specs/2026-06-12-commons-persistent-shell-and-guards-design.md` §A (where
> `title = chrome.title || workspace.name` shared one slot). The chrome *API* is unchanged; only the
> rendering splits into two bands.

### 1.2 Back chevron points to the reading-start ✅
In RTL (Hebrew), "back" points **→ right**. The back chevron (`IconChevronStart`) must follow reading
direction, not a hardcoded left-pointing glyph. This is the standard everywhere a back affordance
appears.

### 1.3 The FAB is reserved for tasks ✅
The floating action button (FAB) creates **tasks** — the core of the system — and nothing else.
Settings / management screens (capabilities, members, future config) never borrow the FAB. Their add
action lives in the **screen bar** (band ②). See §3.

**Why:** the FAB signals "create the core thing." Diluting it across settings screens makes "add a
task" and "add a config row" look identical when they are not.

---

## 2. List rows — the row grammar

This is the universal pattern for **any list of editable items** (capabilities, members, and every
future catalogue/list screen). All such rows behave identically.

### 2.1 Collapsed = read ✅
A collapsed row exposes **only identity and a way in**: the item name, a small read-only status/color
**indicator** (e.g. a color dot), and a **pencil** button on the reading-end side (left in RTL).
Nothing that mutates data appears on a collapsed row — no editable fields, no color swatches, no
delete.

> **Layout principle:** identity sits on the **reading-start** side (right in RTL), actions sit on the
> **reading-end** side (left in RTL). This holds across the whole module — the screen-bar `+`, the
> back-chevron-to-title pairing, and the row pencil all follow it.

**Why:** controls living permanently on every row create visual noise and accidental mutations
(a stray tap recolors or deletes an item). The resting state of a list must be calm and safe.

### 2.2 Pencil → expand in place ✅
Tapping the pencil **expands the row in place** (spring motion) into an edit panel containing **all**
of the item's editable fields — name, color, skills, etc. Editing is never a separate page or a native
dialog for list items.

- **Rename is not a separate action.** Renaming is editing the name field inside the expanded panel.
- **Native `window.prompt` / `window.confirm` are banned** for editing or confirming. Everything is
  in-app and theme-aware.

### 2.3 Save + Cancel ✅
The expanded panel commits via an explicit **Save** button and backs out via **Cancel**.

- Nothing is persisted until **Save**. **Cancel** discards all changes in the panel and closes it.
- Secondary attributes (color, etc.) may show a **live preview** inside the panel, but only persist on
  Save.

**Why:** an explicit commit moment is predictable on mobile and gives the user a guaranteed escape
hatch from a mis-edit. (This replaces save-on-blur, which has no clear committed moment.)

> **Child-object exception (2026-06-15).** When an edit surface manages **child objects** (e.g. a
> task's sub-tasks inside the task edit form), those add/remove actions commit **immediately**, outside
> the Save/Cancel of the parent's fields — a sub-task is its own object (own page, status, completion),
> not a field of this form. The exception must be made **visually honest**: the child-object section is
> a distinct "live" card carrying a quiet "saves immediately" hint, so the divergent commit model reads
> as intentional. Cancel discards field edits only; it does not undo child add/remove (each child
> carries its own delete). Full auto-save of the *fields* was considered and rejected (Create cannot
> auto-save; silent saves on weak connections conflict with the "never lose work" rule).

### 2.4 Secondary attributes live in the panel ✅
Color pickers, toggles, multi-selects, and any control beyond plain identity belong **inside the
expanded edit panel**, not on the collapsed row. The collapsed row may *display* the current value
(a color dot, a badge) but never lets you *change* it.

---

## 3. Create / Add

- The **screen-bar primary action** (band ②) is the add affordance for management screens. Its icon is
  `+`.
- **Lightweight create** (one or two fields — e.g. a capability: name + color) opens the **same edit
  panel as §2**, empty, at the top of the list. Add and edit are the *same* interaction.
- **Heavier create** (e.g. inviting a member: email + permission + skills) may open a modal. Placement
  is still the band-② `+`; only the target scales to the weight of the form.
- Task creation is the exception: it uses the **FAB** (§1.3), not the screen bar.

---

## 4. Destructive actions

(Carried from `…/specs/2026-06-12-commons-persistent-shell-and-guards-design.md` — the user-protection
principle. Restated here as an interaction standard.)

- **Every irreversible action requires explicit confirmation** through the branded `ConfirmDialog` —
  never a native `window.confirm`, never a one-tap delete on a bare row.
- **Delete lives inside the expanded edit panel**, as a low-emphasis control set apart from Save/Cancel
  (so it is never fat-fingered next to the commit button). It opens the `ConfirmDialog`.
- **Never lose in-progress work silently.** Leaving a dirty form prompts to confirm discarding
  (`NavGuardContext`).

---

## 5. Format rules

- **No hardcoded colors.** Colors come from `var(--...)` tokens (`commons-tokens.css`). Item colors are
  driven by the `data-role-color` attribute, which is the single source of truth for color rendering.
- **No hardcoded user-facing strings.** All copy resolves through the content layer
  (`src/content/commons/{he,en}/`).
- **Icons are shared.** Use the icon set in `src/commons/icons.jsx`; do not inline one-off SVGs in a
  screen.
- **Mobile-first.** Every interaction here is validated on mobile first; desktop is a separate pass.

---

## Decision Log

> Append a dated entry whenever a standard is added, changed, or an exception is granted. Newest first.

### 2026-06-15 — Child-object exception to the Save/Cancel model (§2.3)
- Triggered by the task/routine **edit-form redesign**
  (`docs/superpowers/specs/2026-06-15-commons-task-edit-redesign-design.md`). The form manages its own
  fields via explicit Save/Cancel (unchanged) **and** lists the task's sub-tasks for add/remove. Decided
  with Naor: sub-task add/remove commit **immediately** (they are independent objects), shown in a
  distinct "live" card with a "saves immediately" hint so the mixed model is honest. Auto-saving the
  fields was rejected (Create can't auto-save; silent mobile saves risk losing work). Recorded as the
  child-object exception under §2.3.

### 2026-06-14 — Standard applied to Roles + Members
- Chrome two-band header + RTL back-chevron flip shipped (the parallel-session shell work) → §1.1, §1.2 now ✅.
- **RolesPage** rebuilt to the row grammar: `+` in the screen bar opens an empty edit panel; each row is a color dot + name + pencil; the pencil expands a shared panel (name + color picker + Save/Cancel); delete moved inside the panel. `window.prompt`, the always-live row swatches, and the open inline add-form are gone → §2, §3 now ✅.
- **MembersPage** moved off save-on-blur to the same Save + Cancel model and adopted the shared panel classes → §2.3 now ✅.
- Added shared `commons-editPanel*` classes (`CommonsLayout.css`) so both screens render one identical panel.

### 2026-06-12 — Initial standard locked
Triggered by the capabilities (RolesPage) screen, whose interactions had drifted: add via an
always-open inline form, rename via native `window.prompt`, and color swatches living live on every
row (accidental recolors). Decisions made with Naor:

- **Two-band header** (§1.1) — workspace name persists in band ①; screen title + primary action live
  in band ②. Revises the just-built single-bar persistent shell.
- **Row grammar** (§2) — collapsed = read (name + color dot + pencil); pencil expands an in-place edit
  panel holding all fields; **Save + Cancel** commit model; color picker and all secondary controls
  move into the panel.
- **Add** (§3) — screen-bar `+`; lightweight add reuses the empty edit panel; FAB stays reserved for
  tasks.
- **Back chevron** (§1.2) — flipped to follow RTL reading direction.

**Conformance at time of writing:** MembersPage already uses pencil-expand (but saves on blur — to be
moved to Save+Cancel). RolesPage violates §1.1/§2/§3 and is the first screen to be rebuilt to this
standard. Chrome (`CommonsLayout` + `CommonsChromeContext`) to be split into two bands.
