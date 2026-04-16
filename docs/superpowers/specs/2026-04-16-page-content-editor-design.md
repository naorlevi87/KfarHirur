# Page Content Editor — Design Spec
**Date:** 2026-04-16

## Goal

Allow Naor and Shay to edit all user-facing text on non-timeline pages (kenZeOved, home, joinTeam, etc.) from the admin panel — without touching code.

---

## Scope

**In scope:**
- All user-facing strings: headings, body text, paragraph arrays, button labels, goal labels, progress labels, share text
- Per-mode editing: naor / shay variants (and shared fields)
- Hebrew locale only (en is placeholder, not in active use)
- Paragraph arrays (e.g. `longText.paragraphs`): edit existing, add new, reorder

**Out of scope (this phase):**
- Page structure / block ordering (fixed in code)
- Media / video management (future addition to this same system)
- Configuration values: URLs, numeric goal amounts, IDs — stay in static files
- English locale content

---

## What moves to DB vs stays in static files

**Rule:** if a user sees it as text → DB. If it drives code behavior → static file.

**kenZeOved examples:**

| Field | Goes to |
|---|---|
| `hero.heading`, `hero.body` | DB |
| `cta.donateLabel`, `cta.visitLabel` | DB |
| `progress.goalALabel`, `raisedLabel` | DB |
| `longText.paragraphs` | DB |
| `share.heading`, `share.whatsappLabel` | DB |
| `transparency.heading`, `transparency.placeholder` | DB |
| `footer.backLabel` | DB |
| `donateUrl`, `visitUrl` | static file |
| `progress.goalA: 180000`, `goalB`, `goalC` | static file |
| `currencySymbol` | static file |

---

## DB Schema — Supabase

New table: `page_content`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
page_key     text NOT NULL        -- "kenZeOved" | "home" | "joinTeam"
field_path   text NOT NULL        -- dot-notation: "hero.heading", "longText.paragraphs"
mode         text NOT NULL        -- "naor" | "shay" | "shared"
locale       text NOT NULL DEFAULT 'he'
value        jsonb NOT NULL       -- string or string[] for paragraph arrays
updated_at   timestamptz NOT NULL DEFAULT now()
updated_by   uuid REFERENCES auth.users(id)

UNIQUE (page_key, field_path, mode, locale)
```

RLS: read = public (anon), write = authenticated + admin/editor role only.

---

## Resolver Pattern

Each page keeps its existing resolver function. The resolver:

1. Fetches all rows from `page_content` where `page_key = <page>`
2. Builds a content map from DB rows
3. Deep-merges over the static file (DB wins on conflict)
4. Returns semantic payload — component sees nothing change

```
resolveKenZeOvedContent(locale, mode)
  → fetch page_content WHERE page_key = 'kenZeOved' AND locale = locale
  → build map: { [mode]: { [field_path]: value } }
  → merge: staticFile ← DB (DB wins)
  → return payload
```

Fallback guarantee: if DB is empty or unreachable, static file is the floor. The site never breaks.

---

## Admin UI

### Dashboard

New card added to `/admin`:
- Icon + title: "עריכת תוכן"
- Links to `/admin/content`

### Page picker — `/admin/content`

List of editable pages:
- כן זה עובד (`kenZeOved`)
- דף הבית (`home`) — when content is defined
- הצטרף לצוות (`joinTeam`) — when content is defined

### Page editor — `/admin/content/:pageKey`

- Sections grouped by semantic area (hero, cta, progress, longText, share, transparency, footer)
- Each section is a collapsible card
- Each field shows **two inputs side by side: נאור | שי**
  - If the field is "shared" (same value for both modes), a single input with a "shared" label
- Text fields: `<textarea>` for anything longer than ~60 chars, `<input>` for short labels
- Paragraph arrays (`longText.paragraphs`):
  - One textarea per paragraph
  - Drag-to-reorder handle
  - "הוסף פסקה" button at bottom
  - Delete button per paragraph
- Save button per section (not one giant save for whole page)
- Unsaved changes indicator per section
- On save: upsert rows to `page_content` (one row per field_path + mode)

---

## File structure

```
src/
  data/
    pageContent/
      pageContent.queries.js     -- Supabase fetch + upsert functions
      resolvePageContent.js      -- shared merge utility (DB over static)
  pages/
    admin/
      AdminContentListPage.jsx   -- page picker
      AdminContentEditorPage.jsx -- page editor
      AdminContentEditorPage.css
  content/
    site/he/
      kenZeOved.content.js       -- stays, becomes fallback only
```

Routes added to router:
```
/admin/content              → AdminContentListPage
/admin/content/:pageKey     → AdminContentEditorPage
```

---

## Future extensions (not in this spec)

- Video/media fields: add `type` column to `page_content` (`text` | `text[]` | `media`)
- English locale: flip locale toggle in editor when EN content is authored
- Merge with timeline admin: both use Supabase, can share the upsert pattern
