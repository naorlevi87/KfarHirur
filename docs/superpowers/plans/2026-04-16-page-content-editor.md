# Page Content Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Naor and Shay to edit all user-facing text on non-timeline pages from the admin panel, stored in Supabase, with static files as fallback.

**Architecture:** A new `page_content` Supabase table stores text fields as `(page_key, field_path, mode, locale) → jsonb value`. A shared merge utility (`resolvePageContent.js`) builds a DB overlay and deep-merges it over the static file. The existing page resolver hook is extended to fetch from DB and apply the overlay — components see no change. The admin UI (`/admin/content/:pageKey`) renders section cards with naor/shay inputs driven by a per-page schema file.

**Tech Stack:** React 19, Vite, React Router v6, Supabase JS client (`src/data/timeline/supabaseClient.js`), existing admin CSS patterns.

---

## File Map

| Action | File |
|---|---|
| Create | `src/data/pageContent/pageContent.queries.js` |
| Create | `src/data/pageContent/resolvePageContent.js` |
| Create | `src/data/pageContent/kenZeOved.schema.js` |
| Modify | `src/pages/kenZeOved/resolveKenZeOvedPageData.js` |
| Create | `src/pages/admin/AdminContentListPage.jsx` |
| Create | `src/pages/admin/AdminContentEditorPage.jsx` |
| Create | `src/pages/admin/AdminContentEditorPage.css` |
| Modify | `src/app/App.jsx` |
| Modify | `src/pages/admin/AdminDashboardPage.jsx` |

---

## Task 1: Create the `page_content` table in Supabase

**Files:** Supabase SQL editor (no local files)

- [ ] **Step 1: Run this SQL in the Supabase dashboard SQL editor**

```sql
create table public.page_content (
  id          uuid primary key default gen_random_uuid(),
  page_key    text not null,
  field_path  text not null,
  mode        text not null check (mode in ('naor', 'shay', 'shared')),
  locale      text not null default 'he',
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  unique (page_key, field_path, mode, locale)
);

-- Public read (site needs content without auth)
create policy "Public can read page_content"
  on public.page_content for select
  to anon, authenticated
  using (true);

-- Only admin/editor can write
create policy "Editors can upsert page_content"
  on public.page_content for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  );

alter table public.page_content enable row level security;
```

- [ ] **Step 2: Verify the table exists**

In Supabase dashboard → Table Editor → confirm `page_content` appears with columns: `id`, `page_key`, `field_path`, `mode`, `locale`, `value`, `updated_at`, `updated_by`.

---

## Task 2: Supabase query functions

**Files:**
- Create: `src/data/pageContent/pageContent.queries.js`

- [ ] **Step 1: Create the file**

```js
// src/data/pageContent/pageContent.queries.js
// Supabase fetch + upsert for the page_content table.

import { supabase } from '../timeline/supabaseClient.js';

/**
 * Fetch all content rows for a page + locale.
 * Returns array of { field_path, mode, value }.
 */
export async function fetchPageContent(pageKey, locale = 'he') {
  const { data, error } = await supabase
    .from('page_content')
    .select('field_path, mode, value')
    .eq('page_key', pageKey)
    .eq('locale', locale);

  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert a single content field.
 * value must be a string or array of strings.
 */
export async function upsertPageContent({ pageKey, fieldPath, mode, locale = 'he', value }) {
  const { error } = await supabase
    .from('page_content')
    .upsert(
      {
        page_key:   pageKey,
        field_path: fieldPath,
        mode,
        locale,
        value,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      },
      { onConflict: 'page_key,field_path,mode,locale' }
    );

  if (error) throw error;
}

/**
 * Upsert multiple fields at once (one section save).
 * rows: Array of { fieldPath, mode, value }
 */
export async function upsertPageContentBatch({ pageKey, locale = 'he', rows }) {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const now = new Date().toISOString();

  const records = rows.map(({ fieldPath, mode, value }) => ({
    page_key:   pageKey,
    field_path: fieldPath,
    mode,
    locale,
    value,
    updated_at: now,
    updated_by: userId,
  }));

  const { error } = await supabase
    .from('page_content')
    .upsert(records, { onConflict: 'page_key,field_path,mode,locale' });

  if (error) throw error;
}
```

- [ ] **Step 2: Verify no import errors**

Run dev server:
```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```
Expected: no console errors on startup.

---

## Task 3: DB overlay merge utility

**Files:**
- Create: `src/data/pageContent/resolvePageContent.js`

- [ ] **Step 1: Create the file**

```js
// src/data/pageContent/resolvePageContent.js
// Utilities for merging DB content rows over a static content payload.

/**
 * Set a value at a dot-notation path on an object (mutates).
 * setNestedValue(obj, 'hero.heading', 'val') → obj.hero.heading = 'val'
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cursor[keys[i]] == null || typeof cursor[keys[i]] !== 'object') {
      cursor[keys[i]] = {};
    }
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
}

/**
 * Build a payload-shaped overlay from DB rows for the given mode.
 * Includes rows where mode === currentMode OR mode === 'shared'.
 * DB rows: Array of { field_path, mode, value }
 */
export function buildDbOverlay(rows, currentMode) {
  const overlay = {};
  for (const row of rows) {
    if (row.mode !== 'shared' && row.mode !== currentMode) continue;
    setNestedValue(overlay, row.field_path, row.value);
  }
  return overlay;
}

/**
 * Deep-merge source into target. Source wins on conflict.
 * Arrays are replaced wholesale (not concatenated).
 * Returns a new object — does not mutate either argument.
 */
export function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
```

- [ ] **Step 2: Verify no import errors** — dev server still clean.

---

## Task 4: kenZeOved field schema

**Files:**
- Create: `src/data/pageContent/kenZeOved.schema.js`

This schema drives the admin editor UI. Each field declares its `path` (matches `field_path` in DB and final payload), `label` (Hebrew), `type` (`input` | `textarea` | `paragraphs`), and `mode` (`both` = naor + shay inputs | `shared` = single input).

- [ ] **Step 1: Create the file**

```js
// src/data/pageContent/kenZeOved.schema.js
// Field schema for the kenZeOved page content editor.
// path = dot-notation matching field_path in DB and payload keys.
// mode: 'both' = separate naor + shay inputs; 'shared' = single shared input.
// type: 'input' | 'textarea' | 'paragraphs'

export const kenZeOvedSchema = {
  pageKey: 'kenZeOved',
  label: 'כן זה עובד',
  sections: [
    {
      key: 'hero',
      label: 'כותרת ראשית',
      fields: [
        { path: 'hero.heading', label: 'כותרת',     type: 'input',    mode: 'both' },
        { path: 'hero.body',    label: 'גוף הטקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'cta',
      label: 'כפתורים',
      fields: [
        { path: 'cta.donateLabel',    label: 'תווית כפתור תרומה',       type: 'input', mode: 'both' },
        { path: 'cta.donateAriaLabel',label: 'Aria כפתור תרומה',        type: 'input', mode: 'both' },
        { path: 'cta.visitLabel',     label: 'תווית כפתור ביקור',       type: 'input', mode: 'both' },
        { path: 'cta.visitAriaLabel', label: 'Aria כפתור ביקור',        type: 'input', mode: 'both' },
      ],
    },
    {
      key: 'progress',
      label: 'מד התקדמות',
      fields: [
        { path: 'progress.goalALabel',  label: 'תווית יעד א׳',    type: 'input', mode: 'both' },
        { path: 'progress.goalBLabel',  label: 'תווית יעד ב׳',    type: 'input', mode: 'both' },
        { path: 'progress.goalCLabel',  label: 'תווית יעד ג׳',    type: 'input', mode: 'both' },
        { path: 'progress.raisedLabel', label: 'גויס עד כה',      type: 'input', mode: 'both' },
        { path: 'progress.outOfLabel',  label: 'מתוך',            type: 'input', mode: 'both' },
      ],
    },
    {
      key: 'longText',
      label: 'טקסט ארוך',
      fields: [
        { path: 'longText.paragraphs', label: 'פסקאות', type: 'paragraphs', mode: 'both' },
      ],
    },
    {
      key: 'share',
      label: 'שיתוף',
      fields: [
        { path: 'share.heading',          label: 'כותרת שיתוף',        type: 'input',    mode: 'both' },
        { path: 'share.whatsappLabel',    label: 'תווית וואטסאפ',      type: 'input',    mode: 'shared' },
        { path: 'share.facebookLabel',    label: 'תווית פייסבוק',      type: 'input',    mode: 'shared' },
        { path: 'share.copyLabel',        label: 'תווית העתקת לינק',   type: 'input',    mode: 'shared' },
        { path: 'share.whatsappMessage',  label: 'הודעת וואטסאפ',      type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'transparency',
      label: 'שקיפות כלכלית',
      fields: [
        { path: 'transparency.heading',     label: 'כותרת',      type: 'input',    mode: 'shared' },
        { path: 'transparency.placeholder', label: 'טקסט זמני',  type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'video',
      label: 'וידאו',
      fields: [
        { path: 'video.placeholder', label: 'טקסט placeholder', type: 'input', mode: 'shared' },
      ],
    },
    {
      key: 'footer',
      label: 'תחתית',
      fields: [
        { path: 'footer.backLabel', label: 'כפתור חזרה', type: 'input', mode: 'shared' },
      ],
    },
  ],
};
```

---

## Task 5: Extend the kenZeOved resolver hook to overlay DB content

**Files:**
- Modify: `src/pages/kenZeOved/resolveKenZeOvedPageData.js`

The pure function `resolveKenZeOvedPageData` stays unchanged. Only the hook changes — it now fetches DB rows and merges them over the static payload.

- [ ] **Step 1: Read the current file** (confirm it matches what was read during planning)

Current file: `src/pages/kenZeOved/resolveKenZeOvedPageData.js`

- [ ] **Step 2: Replace the hook** — add DB fetch + merge, keep pure function identical

Replace the entire file with:

```js
// src/pages/kenZeOved/resolveKenZeOvedPageData.js
// Page-local resolver: merges shared + mode branch into a semantic payload.
// Hook overlays DB content on top of the static file. Pure function stays sync
// for use outside React (tests, scripts).

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { kenZeOvedContent as kenZeOvedHe } from '../../content/site/he/kenZeOved.content.js';
import { kenZeOvedContent as kenZeOvedEn } from '../../content/site/en/kenZeOved.content.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay, deepMerge } from '../../data/pageContent/resolvePageContent.js';

const byLocale = {
  he: kenZeOvedHe,
  en: kenZeOvedEn,
};

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

function resolveMode(root, mode) {
  const key = mode === 'shay' ? 'shay' : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function resolveKenZeOvedPageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const branch = resolveMode(root, mode);

  return {
    hero:         branch.hero ?? {},
    cta:          { ...branch.cta, donateUrl: shared.donateUrl, visitUrl: shared.visitUrl },
    progress:     { ...shared.progress, ...branch.progress },
    video:        shared.video ?? {},
    longText:     branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share:        { ...shared.share, ...branch.share },
    footer:       shared.footer ?? {},
  };
}

export function useKenZeOvedPageData() {
  const { locale, mode } = useAppContext();
  const [dbRows, setDbRows] = useState([]);

  useEffect(() => {
    fetchPageContent('kenZeOved', locale)
      .then(setDbRows)
      .catch(() => {
        // DB unavailable — static fallback already in place, no action needed
      });
  }, [locale]);

  const staticPayload = resolveKenZeOvedPageData(locale, mode);
  const overlay = buildDbOverlay(dbRows, mode);
  return deepMerge(staticPayload, overlay);
}
```

- [ ] **Step 3: Verify kenZeOved page still renders**

Open `http://localhost:5173/ken-ze-oved` — page should look identical to before. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/pageContent/pageContent.queries.js src/data/pageContent/resolvePageContent.js src/data/pageContent/kenZeOved.schema.js src/pages/kenZeOved/resolveKenZeOvedPageData.js
git commit -m "feat(content): add page_content DB layer + kenZeOved resolver overlay"
```

---

## Task 6: Admin — page picker

**Files:**
- Create: `src/pages/admin/AdminContentListPage.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/pages/admin/AdminContentListPage.jsx
// Admin: list of editable content pages. Entry point of /admin/content.

import { Link } from 'react-router-dom';

const PAGES = [
  { key: 'kenZeOved', label: 'כן זה עובד', desc: 'עמוד הגיוס — כותרות, כפתורים, פסקאות, יעדים' },
];

export function AdminContentListPage() {
  return (
    <div className="admin-dashboard" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__right">
          <Link to="/admin" className="admin-back-btn">← חזרה</Link>
          <h1 className="admin-header__title">עריכת תוכן</h1>
        </div>
      </header>

      <main className="admin-dashboard__main">
        <div className="admin-dashboard__grid">
          {PAGES.map(page => (
            <Link
              key={page.key}
              to={`/admin/content/${page.key}`}
              className="admin-dashboard__card"
            >
              <div className="admin-dashboard__card-icon">📝</div>
              <h2 className="admin-dashboard__card-title">{page.label}</h2>
              <p className="admin-dashboard__card-desc">{page.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
```

Note: reuses `.admin-dashboard`, `.admin-header`, `.admin-dashboard__card` CSS classes from `AdminDashboardPage.css` — no new CSS needed.

---

## Task 7: Admin — page content editor

**Files:**
- Create: `src/pages/admin/AdminContentEditorPage.jsx`
- Create: `src/pages/admin/AdminContentEditorPage.css`

This is the largest task. The editor:
1. Fetches all DB rows for the page on mount
2. Maintains local `edits` state: `{ naor: { [fieldPath]: value }, shay: { [fieldPath]: value }, shared: { [fieldPath]: value } }`
3. Initializes edits from DB rows
4. Per-section save button → upserts only that section's fields
5. Unsaved indicator per section (dirty tracking)

- [ ] **Step 1: Create the CSS**

```css
/* src/pages/admin/AdminContentEditorPage.css */
/* Admin page content editor — section cards with naor/shay field inputs. */

.ace-page {
  min-height: 100dvh;
  background: var(--color-bg, #f9fafb);
  color: var(--color-text, #111);
}

.ace-main {
  padding: 1.5rem 1.25rem;
  max-width: 900px;
}

/* Section card */
.ace-section {
  background: #fff;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 14px;
  margin-bottom: 1.25rem;
  overflow: hidden;
}

.ace-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
  gap: 0.75rem;
}

.ace-section__title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ace-section__dirty {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent, #f59e0b);
}

.ace-section__chevron {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  transition: transform 0.2s ease;
}

.ace-section__chevron--open {
  transform: rotate(180deg);
}

.ace-section__body {
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Field row */
.ace-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ace-field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

/* naor + shay side by side */
.ace-field__cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .ace-field__cols {
    grid-template-columns: 1fr;
  }
}

.ace-field__col-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.25rem;
}

.ace-input,
.ace-textarea {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  background: #fafafa;
  color: var(--color-text, #111);
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.ace-input:focus,
.ace-textarea:focus {
  outline: none;
  border-color: var(--focus-ring, #6366f1);
  background: #fff;
}

.ace-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Paragraphs field */
.ace-paragraphs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ace-para-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.ace-para-row__controls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.25rem;
}

.ace-para-btn {
  background: none;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  cursor: pointer;
  line-height: 1;
  color: var(--color-text, #111);
}

.ace-para-btn:hover {
  background: var(--color-border, #e5e7eb);
}

.ace-para-btn--delete {
  color: #dc2626;
  border-color: #fecaca;
}

.ace-para-btn--delete:hover {
  background: #fef2f2;
}

.ace-add-para-btn {
  align-self: flex-start;
  padding: 0.4rem 0.75rem;
  border: 1px dashed var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: none;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 0.25rem;
}

.ace-add-para-btn:hover {
  border-color: var(--focus-ring, #6366f1);
  color: var(--focus-ring, #6366f1);
}

/* Section footer */
.ace-section__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: #fafafa;
}

.ace-save-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.ace-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ace-save-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.ace-save-status {
  font-size: 0.82rem;
  color: var(--color-text-secondary, #6b7280);
}

.ace-save-status--error {
  color: #dc2626;
}

.ace-save-status--ok {
  color: #16a34a;
}

/* Loading / error states */
.ace-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary, #6b7280);
}
```

- [ ] **Step 2: Create the editor component**

```jsx
// src/pages/admin/AdminContentEditorPage.jsx
// Admin: edit all user-facing text for a specific page.
// Sections driven by page schema. Per-section save with dirty tracking.

import { useEffect, useReducer, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { fetchPageContent, upsertPageContentBatch } from '../../data/pageContent/pageContent.queries.js';
import { kenZeOvedSchema } from '../../data/pageContent/kenZeOved.schema.js';
import './AdminContentEditorPage.css';

const SCHEMAS = {
  kenZeOved: kenZeOvedSchema,
};

// edits shape: { naor: { [path]: value }, shay: { [path]: value }, shared: { [path]: value } }
function initEdits(rows) {
  const edits = { naor: {}, shay: {}, shared: {} };
  for (const row of rows) {
    if (edits[row.mode]) {
      edits[row.mode][row.field_path] = row.value;
    }
  }
  return edits;
}

// saved shape mirrors edits — used for dirty detection
function editsReducer(state, action) {
  switch (action.type) {
    case 'init':
      return action.edits;
    case 'set': {
      const { mode, path, value } = action;
      return {
        ...state,
        [mode]: { ...state[mode], [path]: value },
      };
    }
    default:
      return state;
  }
}

function isSectionDirty(section, edits, saved) {
  for (const field of section.fields) {
    const modes = field.mode === 'shared' ? ['shared'] : ['naor', 'shay'];
    for (const m of modes) {
      const cur = edits[m]?.[field.path];
      const sav = saved[m]?.[field.path];
      if (JSON.stringify(cur) !== JSON.stringify(sav)) return true;
    }
  }
  return false;
}

// Get current value for a field+mode from edits, falling back to '' or []
function getValue(edits, mode, path, type) {
  const val = edits[mode]?.[path];
  if (val !== undefined) return val;
  return type === 'paragraphs' ? [] : '';
}

function ParagraphsField({ value, onChange }) {
  const paras = Array.isArray(value) ? value : [];

  function update(i, text) {
    const next = [...paras];
    next[i] = text;
    onChange(next);
  }
  function moveUp(i) {
    if (i === 0) return;
    const next = [...paras];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }
  function moveDown(i) {
    if (i === paras.length - 1) return;
    const next = [...paras];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }
  function remove(i) {
    onChange(paras.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...paras, '']);
  }

  return (
    <div className="ace-paragraphs">
      {paras.map((p, i) => (
        <div key={i} className="ace-para-row">
          <textarea
            className="ace-textarea"
            value={p}
            onChange={e => update(i, e.target.value)}
            rows={3}
          />
          <div className="ace-para-row__controls">
            <button className="ace-para-btn" onClick={() => moveUp(i)} disabled={i === 0} aria-label="העלה">↑</button>
            <button className="ace-para-btn" onClick={() => moveDown(i)} disabled={i === paras.length - 1} aria-label="הורד">↓</button>
            <button className="ace-para-btn ace-para-btn--delete" onClick={() => remove(i)} aria-label="מחק">×</button>
          </div>
        </div>
      ))}
      <button className="ace-add-para-btn" onClick={add}>+ הוסף פסקה</button>
    </div>
  );
}

function FieldInput({ field, edits, dispatch }) {
  if (field.mode === 'shared') {
    const value = getValue(edits, 'shared', field.path, field.type);
    const onChange = v => dispatch({ type: 'set', mode: 'shared', path: field.path, value: v });

    return (
      <div className="ace-field">
        <span className="ace-field__label">{field.label} — משותף</span>
        {field.type === 'paragraphs' ? (
          <ParagraphsField value={value} onChange={onChange} />
        ) : field.type === 'textarea' ? (
          <textarea className="ace-textarea" value={value} onChange={e => onChange(e.target.value)} />
        ) : (
          <input className="ace-input" type="text" value={value} onChange={e => onChange(e.target.value)} />
        )}
      </div>
    );
  }

  // mode === 'both' — naor + shay side by side
  return (
    <div className="ace-field">
      <span className="ace-field__label">{field.label}</span>
      <div className="ace-field__cols">
        {['naor', 'shay'].map(m => {
          const value = getValue(edits, m, field.path, field.type);
          const onChange = v => dispatch({ type: 'set', mode: m, path: field.path, value: v });
          const colLabel = m === 'naor' ? 'נאור' : 'שי';
          return (
            <div key={m}>
              <div className="ace-field__col-label">{colLabel}</div>
              {field.type === 'paragraphs' ? (
                <ParagraphsField value={value} onChange={onChange} />
              ) : field.type === 'textarea' ? (
                <textarea className="ace-textarea" value={value} onChange={e => onChange(e.target.value)} />
              ) : (
                <input className="ace-input" type="text" value={value} onChange={e => onChange(e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ section, pageKey, edits, dispatch, saved, onSaved }) {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'ok' | string(error)

  const dirty = isSectionDirty(section, edits, saved);

  async function handleSave() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const rows = [];
      for (const field of section.fields) {
        const modes = field.mode === 'shared' ? ['shared'] : ['naor', 'shay'];
        for (const m of modes) {
          const value = edits[m]?.[field.path];
          if (value !== undefined) {
            rows.push({ fieldPath: field.path, mode: m, value });
          }
        }
      }
      await upsertPageContentBatch({ pageKey, rows });
      setSaveStatus('ok');
      onSaved(section, edits);
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus(err.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ace-section">
      <div
        className="ace-section__header"
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
      >
        <h2 className="ace-section__title">
          {dirty && <span className="ace-section__dirty" aria-label="שינויים לא שמורים" />}
          {section.label}
        </h2>
        <span className={`ace-section__chevron${open ? ' ace-section__chevron--open' : ''}`}>▼</span>
      </div>

      {open && (
        <>
          <div className="ace-section__body">
            {section.fields.map(field => (
              <FieldInput key={field.path} field={field} edits={edits} dispatch={dispatch} />
            ))}
          </div>
          <div className="ace-section__footer">
            {saveStatus === 'ok' && <span className="ace-save-status ace-save-status--ok">נשמר ✓</span>}
            {saveStatus && saveStatus !== 'ok' && <span className="ace-save-status ace-save-status--error">{saveStatus}</span>}
            <button
              className="ace-save-btn"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminContentEditorPage() {
  const { pageKey } = useParams();
  const schema = SCHEMAS[pageKey];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [edits, dispatch] = useReducer(editsReducer, { naor: {}, shay: {}, shared: {} });
  const [saved, setSaved] = useState({ naor: {}, shay: {}, shared: {} });

  useEffect(() => {
    if (!schema) return;
    fetchPageContent(pageKey, 'he')
      .then(rows => {
        const init = initEdits(rows);
        dispatch({ type: 'init', edits: init });
        setSaved(init);
      })
      .catch(err => setLoadError(err.message ?? 'שגיאה בטעינה'))
      .finally(() => setLoading(false));
  }, [pageKey, schema]);

  // Merge saved snapshot when a section is saved successfully
  function handleSaved(section, currentEdits) {
    setSaved(prev => {
      const next = { naor: { ...prev.naor }, shay: { ...prev.shay }, shared: { ...prev.shared } };
      for (const field of section.fields) {
        const modes = field.mode === 'shared' ? ['shared'] : ['naor', 'shay'];
        for (const m of modes) {
          if (currentEdits[m]?.[field.path] !== undefined) {
            next[m][field.path] = currentEdits[m][field.path];
          }
        }
      }
      return next;
    });
  }

  if (!schema) return <Navigate to="/admin/content" replace />;

  return (
    <div className="ace-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__right">
          <Link to="/admin/content" className="admin-back-btn">← חזרה</Link>
          <h1 className="admin-header__title">{schema.label}</h1>
        </div>
      </header>

      <main className="ace-main">
        {loading && <p className="ace-state">טוען...</p>}
        {loadError && <p className="ace-state" style={{ color: '#dc2626' }}>{loadError}</p>}

        {!loading && !loadError && schema.sections.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            pageKey={pageKey}
            edits={edits}
            dispatch={dispatch}
            saved={saved}
            onSaved={handleSaved}
          />
        ))}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminContentListPage.jsx src/pages/admin/AdminContentEditorPage.jsx src/pages/admin/AdminContentEditorPage.css src/data/pageContent/kenZeOved.schema.js
git commit -m "feat(admin): add page content list + editor UI"
```

---

## Task 8: Wire routes into App.jsx and add dashboard card

**Files:**
- Modify: `src/app/App.jsx`
- Modify: `src/pages/admin/AdminDashboardPage.jsx`

- [ ] **Step 1: Add imports and routes to App.jsx**

Add these two imports after the existing admin imports (around line 19):

```js
import { AdminContentListPage } from '../pages/admin/AdminContentListPage.jsx';
import { AdminContentEditorPage } from '../pages/admin/AdminContentEditorPage.jsx';
```

Add these two routes inside the existing `<Route element={<ProtectedRoute allowedRoles={['admin', 'editor']} />}>` block, after the existing admin routes (after line 56 `path="admin/timeline/items/:slug"`):

```jsx
<Route path="admin/content" element={<AdminContentListPage />} />
<Route path="admin/content/:pageKey" element={<AdminContentEditorPage />} />
```

- [ ] **Step 2: Add content card to AdminDashboardPage.jsx**

In `AdminDashboardPage.jsx`, add this card after the timeline card (after the closing `</Link>` of the timeline card, around line 32):

```jsx
<Link to="/admin/content" className="admin-dashboard__card">
  <div className="admin-dashboard__card-icon">📝</div>
  <h2 className="admin-dashboard__card-title">עריכת תוכן</h2>
  <p className="admin-dashboard__card-desc">עריכת טקסטים, כותרות וכפתורים לפי עמוד</p>
</Link>
```

- [ ] **Step 3: Verify in browser**

1. Open `http://localhost:5173/admin` — confirm "עריכת תוכן" card appears
2. Click it → `/admin/content` — confirm page picker with "כן זה עובד"
3. Click "כן זה עובד" → `/admin/content/kenZeOved` — confirm section cards render
4. Edit a short field (e.g. `hero.heading` for naor) → click Save → confirm "נשמר ✓"
5. Reload the kenZeOved page (`/ken-ze-oved`) → confirm the edited text appears

- [ ] **Step 4: Commit**

```bash
git add src/app/App.jsx src/pages/admin/AdminDashboardPage.jsx
git commit -m "feat(admin): wire content editor routes + dashboard card"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `page_content` Supabase table with RLS | Task 1 |
| Fetch + upsert query functions | Task 2 |
| DB overlay merge utility | Task 3 |
| kenZeOved field schema | Task 4 |
| Resolver hook overlays DB over static | Task 5 |
| Fallback: static file when DB empty | Task 5 — `deepMerge(staticPayload, overlay)` where overlay is `{}` when DB empty |
| Dashboard card | Task 8 |
| Page picker `/admin/content` | Task 6 |
| Page editor `/admin/content/:pageKey` | Task 7 |
| Sections grouped by semantic area | Task 7 — `schema.sections` |
| Naor + shay side by side | Task 7 — `ace-field__cols` grid |
| Shared fields = single input | Task 7 — `FieldInput` branches on `field.mode` |
| Paragraph arrays: edit, add, reorder, delete | Task 7 — `ParagraphsField` |
| Save per section, not whole page | Task 7 — `SectionCard.handleSave` |
| Unsaved indicator per section | Task 7 — `dirty` flag + `ace-section__dirty` dot |
| Routes added | Task 8 |
| Hebrew locale only | `fetchPageContent` called with `'he'` |
| Config values (URLs, amounts) stay in static file | Not in schema — only text fields in `kenZeOved.schema.js` |
