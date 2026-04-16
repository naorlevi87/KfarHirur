# Media Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add media gallery management (upload / reorder / delete) to the admin content editor for home page sections, add video slots to the kenZeOved page, and fix the textarea resize handle on mobile.

**Architecture:** New field types (`media-gallery`, `media-single`, `video`) are added to the schema system. Each triggers a native `<dialog>` modal in the admin editor. Media is stored as URL arrays / objects in the existing `page_content` table. Files upload to Supabase Storage bucket `homepage`; deletes call `supabase.storage.remove()` only for our own bucket URLs.

**Tech Stack:** React 19, Supabase JS client, native `<dialog>`, existing `upsertPageContentBatch` / `deletePageContentRows`

**Spec:** `docs/superpowers/specs/2026-04-16-media-management-design.md`

**Run commands as:**
```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" <command>
```

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/data/admin/mediaQueries.js` | `uploadToHomepage(file)`, `deleteStorageFile(url)` |
| Create | `src/pages/admin/components/MediaGalleryModal.jsx` | Modal UI for gallery / single / video editing |
| Create | `src/pages/admin/components/MediaGalleryModal.css` | Modal styles |
| Create | `src/pages/kenZeOved/VideoEmbed.jsx` | Routes `{type, url}` to correct embed element |
| Modify | `src/data/pageContent/home.schema.js` | Add 6 media sections |
| Modify | `src/data/pageContent/kenZeOved.schema.js` | Add 2 video sections |
| Modify | `src/pages/admin/AdminContentEditorPage.jsx` | Wire new field types → modal |
| Modify | `src/pages/admin/AdminContentEditorPage.css` | Mobile textarea resize fix |
| Modify | `src/pages/kenZeOved/KenZeOvedPage.jsx` | Restructure layout, hide transparency |
| Modify | `src/pages/kenZeOved/resolveKenZeOvedPageData.js` | Add videoShort + videoLong to payload |
| Modify | `src/content/site/he/kenZeOved.content.js` | Add placeholder videoShort + videoLong keys |

---

## Task 1: Media query helpers

**Files:**
- Create: `src/data/admin/mediaQueries.js`

- [ ] **Create `src/data/admin/mediaQueries.js`**

```js
// src/data/admin/mediaQueries.js
// Upload and delete helpers for the homepage Supabase Storage bucket.
// Used by admin media UI only — never called from public-facing components.

import { supabase } from '../timeline/supabaseClient.js';

const BUCKET = 'homepage';
const BUCKET_HOST = 'kqlfvwlzayinngrgafec.supabase.co/storage';

/**
 * Upload a file to the homepage bucket.
 * Returns the public URL.
 */
export async function uploadToHomepage(file) {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from the homepage bucket.
 * Skips silently if the URL is not from our own storage bucket.
 */
export async function deleteStorageFile(url) {
  if (!url || !url.includes(BUCKET_HOST)) return;
  // Extract the path after /object/public/homepage/
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/data/admin/mediaQueries.js
git commit -m "feat(admin): add homepage storage upload + delete helpers"
```

---

## Task 2: MediaGalleryModal component

**Files:**
- Create: `src/pages/admin/components/MediaGalleryModal.jsx`
- Create: `src/pages/admin/components/MediaGalleryModal.css`

- [ ] **Create `src/pages/admin/components/MediaGalleryModal.css`**

```css
/* src/pages/admin/components/MediaGalleryModal.css */
/* Native dialog modal for media gallery / single / video editing. */

.mgm-backdrop::backdrop {
  background: rgba(0, 0, 0, 0.45);
}

.mgm-backdrop {
  border: none;
  border-radius: 16px;
  padding: 0;
  width: min(92vw, 640px);
  max-height: 88dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}

.mgm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.mgm-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.mgm-close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.mgm-close-btn:hover { background: #f3f4f6; }

.mgm-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Gallery grid */
.mgm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .mgm-grid { grid-template-columns: repeat(4, 1fr); }
}

.mgm-thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.mgm-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mgm-thumb__controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0.25rem;
  background: rgba(0,0,0,0.45);
  gap: 0.25rem;
}

.mgm-thumb__btn {
  flex: 1;
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.2rem;
  min-height: 28px;
  line-height: 1;
  color: #111;
}

.mgm-thumb__btn:hover { background: #fff; }

.mgm-thumb__btn--delete {
  color: #dc2626;
  flex: 0 0 auto;
  padding: 0.2rem 0.4rem;
}

/* Single image */
.mgm-single {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.mgm-single__preview {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.mgm-single__empty {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  border: 2px dashed #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.mgm-single__actions {
  display: flex;
  gap: 0.5rem;
}

/* Video */
.mgm-video {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mgm-video__tabs {
  display: flex;
  gap: 0.5rem;
}

.mgm-video__tab {
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.82rem;
  cursor: pointer;
  color: #374151;
  transition: background 0.15s, border-color 0.15s;
}

.mgm-video__tab--active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.mgm-video__input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background: #fafafa;
  box-sizing: border-box;
  direction: ltr;
}

.mgm-video__preview {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #000;
}

.mgm-video__preview iframe,
.mgm-video__preview video {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.mgm-video__current {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #374151;
  word-break: break-all;
  direction: ltr;
}

/* Add button */
.mgm-add-btn {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border: 1.5px dashed #e5e7eb;
  border-radius: 8px;
  background: none;
  font-size: 0.875rem;
  cursor: pointer;
  color: #6b7280;
  transition: border-color 0.15s, color 0.15s;
  min-height: 44px;
}

.mgm-add-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
}

.mgm-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Secondary action button (shared style) */
.mgm-action-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  color: #374151;
  min-height: 44px;
  transition: border-color 0.15s;
}

.mgm-action-btn:hover { border-color: #9ca3af; }

.mgm-action-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
}

.mgm-action-btn--danger:hover { background: #fef2f2; }

/* Footer */
.mgm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  flex-shrink: 0;
}

.mgm-cancel-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  color: #6b7280;
  min-height: 44px;
}

.mgm-save-btn {
  padding: 0.5rem 1.25rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s;
}

.mgm-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mgm-save-btn:hover:not(:disabled) { opacity: 0.88; }

.mgm-error {
  color: #dc2626;
  font-size: 0.82rem;
}
```

- [ ] **Create `src/pages/admin/components/MediaGalleryModal.jsx`**

```jsx
// src/pages/admin/components/MediaGalleryModal.jsx
// Native <dialog> modal for editing media: gallery, single image, or video.
// Props:
//   open       {boolean}
//   title      {string}
//   type       {'gallery' | 'single' | 'video'}
//   value      {string[] | string | {type:'youtube'|'upload', url:string} | null}
//   onSave     {(newValue) => void}
//   onClose    {() => void}

import { useEffect, useRef, useState } from 'react';
import { uploadToHomepage, deleteStorageFile } from '../../../data/admin/mediaQueries.js';
import './MediaGalleryModal.css';

// ── YouTube embed URL ──────────────────────────────────────────────────────────
function toYouTubeEmbed(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

// ── Gallery (multi-image) ──────────────────────────────────────────────────────
function GalleryEditor({ items, setItems }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function moveUp(i) {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  }

  function moveDown(i) {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setItems(next);
  }

  async function remove(i) {
    const url = items[i];
    await deleteStorageFile(url).catch(() => {});
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToHomepage(f)));
      setItems([...items, ...urls]);
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <div className="mgm-grid">
        {items.map((url, i) => (
          <div key={url + i} className="mgm-thumb">
            <img src={url} alt={`תמונה ${i + 1}`} />
            <div className="mgm-thumb__controls">
              <button className="mgm-thumb__btn" onClick={() => moveUp(i)} disabled={i === 0} aria-label="הזז למעלה">↑</button>
              <button className="mgm-thumb__btn" onClick={() => moveDown(i)} disabled={i === items.length - 1} aria-label="הזז למטה">↓</button>
              <button className="mgm-thumb__btn mgm-thumb__btn--delete" onClick={() => remove(i)} aria-label="מחק">×</button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mgm-error">{error}</p>}
      <button
        className="mgm-add-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'מעלה...' : '+ הוסף תמונות'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
    </>
  );
}

// ── Single image ───────────────────────────────────────────────────────────────
function SingleEditor({ value, setValue }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadToHomepage(file);
      setValue(url);
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    await deleteStorageFile(value).catch(() => {});
    setValue('');
  }

  return (
    <div className="mgm-single">
      {value
        ? <img className="mgm-single__preview" src={value} alt="תמונה נוכחית" />
        : <div className="mgm-single__empty">אין תמונה</div>
      }
      {error && <p className="mgm-error">{error}</p>}
      <div className="mgm-single__actions">
        <button
          className="mgm-action-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'מעלה...' : value ? 'החלף' : 'העלה תמונה'}
        </button>
        {value && (
          <button className="mgm-action-btn mgm-action-btn--danger" onClick={handleRemove}>
            מחק
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

// ── Video (YouTube or upload) ──────────────────────────────────────────────────
function VideoEditor({ value, setValue }) {
  const fileRef = useRef(null);
  const [tab, setTab] = useState(value?.type ?? 'youtube');
  const [urlInput, setUrlInput] = useState(value?.type === 'youtube' ? (value.url ?? '') : '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const embedUrl = tab === 'youtube' ? toYouTubeEmbed(urlInput) : null;

  function handleUrlChange(e) {
    setUrlInput(e.target.value);
    setValue({ type: 'youtube', url: e.target.value });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadToHomepage(file);
      setValue({ type: 'upload', url });
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemove() {
    setValue(null);
    setUrlInput('');
  }

  return (
    <div className="mgm-video">
      <div className="mgm-video__tabs">
        {['youtube', 'upload'].map(t => (
          <button
            key={t}
            className={`mgm-video__tab${tab === t ? ' mgm-video__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'youtube' ? 'YouTube' : 'העלאה ישירה'}
          </button>
        ))}
      </div>

      {tab === 'youtube' && (
        <>
          <input
            className="mgm-video__input"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={urlInput}
            onChange={handleUrlChange}
          />
          {embedUrl && (
            <div className="mgm-video__preview">
              <iframe src={embedUrl} title="YouTube preview" allowFullScreen />
            </div>
          )}
        </>
      )}

      {tab === 'upload' && (
        <>
          {value?.type === 'upload' && value.url && (
            <div className="mgm-video__current">{value.url}</div>
          )}
          <button
            className="mgm-action-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'מעלה...' : 'בחר קובץ וידאו'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </>
      )}

      {error && <p className="mgm-error">{error}</p>}

      {value?.url && (
        <button className="mgm-action-btn mgm-action-btn--danger" onClick={handleRemove}>
          הסר וידאו
        </button>
      )}
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────
export function MediaGalleryModal({ open, title, type, value, onSave, onClose }) {
  const dialogRef = useRef(null);

  // Local working copy — discarded on cancel, committed on save
  const [localValue, setLocalValue] = useState(value);

  // Sync local state when modal opens with new value
  useEffect(() => {
    if (open) {
      setLocalValue(type === 'gallery' ? (Array.isArray(value) ? [...value] : []) : value ?? (type === 'single' ? '' : null));
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open, value, type]);

  // Close on backdrop click
  function handleDialogClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleSave() {
    onSave(localValue);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="mgm-backdrop"
      onClick={handleDialogClick}
      onClose={onClose}
      dir="rtl"
    >
      <div className="mgm-header">
        <h2 className="mgm-title">{title}</h2>
        <button className="mgm-close-btn" onClick={onClose} aria-label="סגור">×</button>
      </div>

      <div className="mgm-body">
        {type === 'gallery' && (
          <GalleryEditor items={localValue} setItems={setLocalValue} />
        )}
        {type === 'single' && (
          <SingleEditor value={localValue} setValue={setLocalValue} />
        )}
        {type === 'video' && (
          <VideoEditor value={localValue} setValue={setLocalValue} />
        )}
      </div>

      <div className="mgm-footer">
        <button className="mgm-cancel-btn" onClick={onClose}>ביטול</button>
        <button className="mgm-save-btn" onClick={handleSave}>שמור</button>
      </div>
    </dialog>
  );
}
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/pages/admin/components/MediaGalleryModal.jsx src/pages/admin/components/MediaGalleryModal.css
git commit -m "feat(admin): add MediaGalleryModal for gallery/single/video editing"
```

---

## Task 3: Wire modal into AdminContentEditorPage

**Files:**
- Modify: `src/pages/admin/AdminContentEditorPage.jsx`
- Modify: `src/pages/admin/AdminContentEditorPage.css`

- [ ] **Add imports to `AdminContentEditorPage.jsx`**

At the top of the file, add:

```jsx
import { MediaGalleryModal } from './components/MediaGalleryModal.jsx';
```

- [ ] **Add `MediaFieldButton` component** (add before `FieldInput`)

```jsx
// Trigger button + modal for media-gallery, media-single, and video field types
function MediaFieldButton({ field, edits, dispatch, mode }) {
  const [open, setOpen] = useState(false);

  const type = field.type === 'media-gallery' ? 'gallery'
             : field.type === 'media-single'  ? 'single'
             : 'video';

  const rawValue = edits[mode]?.[field.path];
  const value = rawValue !== undefined
    ? rawValue
    : (type === 'gallery' ? [] : type === 'single' ? '' : null);

  const count = type === 'gallery' && Array.isArray(value) ? value.length : null;

  function handleSave(newValue) {
    dispatch({ type: 'set', mode, path: field.path, value: newValue });
  }

  return (
    <>
      <button
        type="button"
        className="ace-media-btn"
        onClick={() => setOpen(true)}
      >
        {type === 'video'
          ? `🎬 ${value?.url ? 'ערוך וידאו' : 'הוסף וידאו'}`
          : count !== null
            ? `📷 ערוך תמונות (${count})`
            : `📷 ${value ? 'ערוך תמונה' : 'הוסף תמונה'}`
        }
      </button>
      <MediaGalleryModal
        open={open}
        title={field.label}
        type={type}
        value={value}
        onSave={handleSave}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

- [ ] **Update `renderInput` inside `FieldInput`** to handle the three new types

Replace the existing `renderInput` function body:

```jsx
function renderInput(mode, value, onChange) {
  if (field.type === 'paragraphs') return <ParagraphsField value={value} onChange={onChange} />;
  if (field.type === 'textarea')   return <textarea className="ace-textarea" value={value ?? ''} onChange={e => onChange(e.target.value)} />;
  if (field.type === 'media-gallery' || field.type === 'media-single' || field.type === 'video') {
    return <MediaFieldButton field={field} edits={edits} dispatch={dispatch} mode={mode} />;
  }
  return <input className="ace-input" type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} />;
}
```

Note: `MediaFieldButton` manages its own dispatch — `onChange` is not used for media types. The existing `isShared` rendering path in `FieldInput` still works because `MediaFieldButton` reads from `edits` directly via the `mode` prop.

- [ ] **Update `getValue` to handle media defaults correctly**

Replace the existing `getValue` function:

```jsx
function getValue(edits, mode, path, type) {
  const val = edits[mode]?.[path];
  if (val !== undefined) return val;
  if (type === 'paragraphs') return [];
  if (type === 'media-gallery') return [];
  if (type === 'media-single') return '';
  if (type === 'video') return null;
  return '';
}
```

- [ ] **Add `.ace-media-btn` to `AdminContentEditorPage.css`**

Append to the end of the file:

```css
/* Media field trigger button */
.ace-media-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  color: #374151;
  min-height: 44px;
  transition: border-color 0.15s;
  text-align: start;
}

.ace-media-btn:hover { border-color: #9ca3af; }
```

- [ ] **Mobile textarea resize fix** — also in `AdminContentEditorPage.css`

Append after the `.ace-media-btn` block:

```css
/* Textarea resize handle is too small to grab on mobile — disable it */
@media (max-width: 768px) {
  .ace-textarea {
    resize: none;
    min-height: 120px;
  }
}
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

- [ ] **Commit**

```bash
git add src/pages/admin/AdminContentEditorPage.jsx src/pages/admin/AdminContentEditorPage.css
git commit -m "feat(admin): wire MediaGalleryModal into content editor + mobile textarea fix"
```

---

## Task 4: Home page schema — add media sections

**Files:**
- Modify: `src/data/pageContent/home.schema.js`

- [ ] **Replace contents of `home.schema.js`**

```js
// src/data/pageContent/home.schema.js
// Field schema for the home page content editor.

export const homeSchema = {
  pageKey: 'home',
  label: 'דף בית',
  sections: [
    {
      key: 'origin',
      label: 'פתיחה',
      fields: [
        { path: 'origin.heading', label: 'כותרת', type: 'input',    mode: 'shared' },
        { path: 'origin.body',    label: 'טקסט',  type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'community',
      label: 'כפר הירעור',
      fields: [
        { path: 'community.heading', label: 'כותרת',      type: 'input',    mode: 'both' },
        { path: 'community.body',    label: 'גוף טקסט',   type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'media_atlit',
      label: 'תמונות עתלית',
      fields: [
        { path: 'images.atlit', label: 'תמונות עתלית', type: 'media-gallery', mode: 'shared' },
      ],
    },
    {
      key: 'joz',
      label: "ג'וז ולוז",
      fields: [
        { path: 'joz.heading', label: 'כותרת',    type: 'input',    mode: 'both' },
        { path: 'joz.body',    label: 'גוף טקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'media_joz',
      label: "תמונות ג'וז ולוז",
      fields: [
        { path: 'images.joz', label: "תמונות ג'וז ולוז", type: 'media-gallery', mode: 'shared' },
      ],
    },
    {
      key: 'visit',
      label: 'תגיעו לבקר',
      fields: [
        { path: 'visit.heading',        label: 'כותרת',           type: 'input', mode: 'shared' },
        { path: 'visit.reserveLabel',   label: 'תווית הזמנה',     type: 'input', mode: 'shared' },
        { path: 'visit.instagramLabel', label: 'תווית אינסטגרם',  type: 'input', mode: 'shared' },
        { path: 'visit.facebookLabel',  label: 'תווית פייסבוק',   type: 'input', mode: 'shared' },
      ],
    },
    {
      key: 'fundraising',
      label: 'גיוס',
      fields: [
        { path: 'fundraising.heading',  label: 'כותרת',      type: 'input',    mode: 'shared' },
        { path: 'fundraising.subtext',  label: 'טקסט משנה',  type: 'textarea', mode: 'both' },
        { path: 'fundraising.ctaLabel', label: 'כפתור',      type: 'input',    mode: 'shared' },
        { path: 'fundraising.videoUrl', label: 'וידאו',      type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'join',
      label: 'הצטרפות לצוות',
      fields: [
        { path: 'join.heading',  label: 'כותרת',     type: 'input',    mode: 'both' },
        { path: 'join.subtext',  label: 'טקסט משנה', type: 'textarea', mode: 'both' },
        { path: 'join.ctaLabel', label: 'כפתור',     type: 'input',    mode: 'shared' },
      ],
    },
    {
      key: 'media_crew',
      label: 'תמונת צוות',
      fields: [
        { path: 'images.crew', label: 'תמונת צוות', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'timeline',
      label: 'ציר הזמן',
      fields: [
        { path: 'timeline.heading',      label: 'כותרת',        type: 'input', mode: 'shared' },
        { path: 'timeline.teaser',       label: 'טקסט הזמנה',   type: 'input', mode: 'shared' },
        { path: 'timeline.label',        label: 'תווית כפתור',  type: 'input', mode: 'shared' },
        { path: 'timeline.previewImage', label: 'תמונת preview',type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'media_zola',
      label: 'תמונות זולה',
      fields: [
        { path: 'images.zola', label: 'תמונות זולה', type: 'media-gallery', mode: 'shared' },
      ],
    },
  ],
};
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

- [ ] **Commit**

```bash
git add src/data/pageContent/home.schema.js
git commit -m "feat(admin): add media sections to home page schema"
```

---

## Task 5: KenZeOved schema — add video sections

**Files:**
- Modify: `src/data/pageContent/kenZeOved.schema.js`

- [ ] **Add two video sections to `kenZeOved.schema.js`**

Add before the closing `]` of `sections`:

```js
    {
      key: 'video_short',
      label: 'סרטון קצר (למעלה, autoplay)',
      fields: [
        { path: 'videoShort.src', label: 'סרטון קצר', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'video_long',
      label: 'סרטון ארוך (למטה)',
      fields: [
        { path: 'videoLong', label: 'סרטון ארוך', type: 'video', mode: 'shared' },
      ],
    },
```

The full `sections` array in `kenZeOved.schema.js` now ends:

```js
    // ... existing sections ...
    {
      key: 'video',
      label: 'וידאו',
      fields: [
        { path: 'video.placeholder', label: 'טקסט placeholder', type: 'input', mode: 'shared' },
      ],
    },
    {
      key: 'video_short',
      label: 'סרטון קצר (למעלה, autoplay)',
      fields: [
        { path: 'videoShort.src', label: 'סרטון קצר', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'video_long',
      label: 'סרטון ארוך (למטה)',
      fields: [
        { path: 'videoLong', label: 'סרטון ארוך', type: 'video', mode: 'shared' },
      ],
    },
  ],
};
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

- [ ] **Commit**

```bash
git add src/data/pageContent/kenZeOved.schema.js
git commit -m "feat(admin): add video sections to kenZeOved schema"
```

---

## Task 6: VideoEmbed component + resolveKenZeOvedPageData + content defaults

**Files:**
- Create: `src/pages/kenZeOved/VideoEmbed.jsx`
- Modify: `src/pages/kenZeOved/resolveKenZeOvedPageData.js`
- Modify: `src/content/site/he/kenZeOved.content.js`

- [ ] **Create `src/pages/kenZeOved/VideoEmbed.jsx`**

```jsx
// src/pages/kenZeOved/VideoEmbed.jsx
// Renders a video from { type: 'youtube'|'upload', url: string }.
// Returns null if no value or url.

function toYouTubeEmbed(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function VideoEmbed({ value, className = '' }) {
  if (!value?.url) return null;

  if (value.type === 'youtube') {
    const embedUrl = toYouTubeEmbed(value.url);
    if (!embedUrl) return null;
    return (
      <div className={className} style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px' }}>
        <iframe
          src={embedUrl}
          title="סרטון"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    );
  }

  if (value.type === 'upload') {
    return (
      <video
        className={className}
        src={value.url}
        controls
        style={{ width: '100%', borderRadius: '12px', display: 'block' }}
      />
    );
  }

  return null;
}
```

- [ ] **Update `resolveKenZeOvedPageData.js`** to include videoShort and videoLong in the payload

In the `resolveKenZeOvedPageData` function, add to the returned object:

```js
  return {
    hero:         branch.hero ?? {},
    cta:          {
      ...branch.cta,
      donateUrl:       shared.donateUrl,
      visitUrl:        shared.visitUrl,
      donateAriaLabel: branch.cta?.donateLabel ?? '',
      visitAriaLabel:  branch.cta?.visitLabel ?? '',
    },
    progress:     { ...shared.progress, ...branch.progress },
    video:        shared.video ?? {},
    videoShort:   shared.videoShort ?? {},
    videoLong:    shared.videoLong ?? null,
    longText:     branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share:        { ...shared.share, ...branch.share },
  };
```

- [ ] **Add placeholder keys to `kenZeOved.content.js`**

In the `shared` object, add after the existing `video` block:

```js
    videoShort: {
      // Upload a short autoplay clip via admin. Empty = section hidden.
      src: '',
    },
    videoLong: null,
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

- [ ] **Commit**

```bash
git add src/pages/kenZeOved/VideoEmbed.jsx src/pages/kenZeOved/resolveKenZeOvedPageData.js src/content/site/he/kenZeOved.content.js
git commit -m "feat(kenZeOved): add VideoEmbed component + videoShort/videoLong to resolver"
```

---

## Task 7: KenZeOvedPage layout restructure

**Files:**
- Modify: `src/pages/kenZeOved/KenZeOvedPage.jsx`

- [ ] **Replace `KenZeOvedPage.jsx` with restructured layout**

```jsx
// src/pages/kenZeOved/KenZeOvedPage.jsx
// Fundraising page — structure + composition only.
// All copy from useKenZeOvedPageData. Motion via staggered section entries.
// Financial transparency section is hidden pending content — set SHOW_TRANSPARENCY = true to re-enable.

import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import '../../styles/app/KenZeOvedPage.css';
import { getText } from '../../utils/content/getText.js';
import { useKenZeOvedPageData } from './resolveKenZeOvedPageData.js';
import { ProgressBar } from './ProgressBar.jsx';
import { DonateButton } from './DonateButton.jsx';
import { VideoEmbed } from './VideoEmbed.jsx';

const SHOW_TRANSPARENCY = false;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

export function KenZeOvedPage() {
  const { hero, cta, progress, videoShort, videoLong, longText, transparency, share } =
    useKenZeOvedPageData();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const pageUrl = window.location.href;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    getText(share, 'whatsappMessage') + pageUrl
  )}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  const heroParagraphs = (getText(hero, 'body') || '').split('\n\n').filter(Boolean);
  const longParagraphs = (getText(longText, 'body') || '').split('\n\n').filter(Boolean);

  const shortVideoSrc = videoShort?.src;

  return (
    <div className="kig-page">
      <motion.div
        className="kig-inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Block 1 — Story header */}
        <motion.section
          className="kig-hero"
          variants={blockVariants}
          aria-labelledby="kig-heading"
        >
          <h1 id="kig-heading" className="kig-heading">
            {getText(hero, 'heading')}
          </h1>
          <div className="kig-heroCopy">
            {heroParagraphs.map((p, i) => (
              <p key={i} className="kig-heroP">{p}</p>
            ))}
          </div>
        </motion.section>

        {/* Block 2 — Short autoplay video (hidden when no src) */}
        {shortVideoSrc && (
          <motion.section className="kig-shortVideo" variants={blockVariants} aria-label="סרטון">
            <video
              src={shortVideoSrc}
              autoPlay
              muted
              playsInline
              loop
              style={{ width: '100%', borderRadius: '12px', display: 'block' }}
            />
          </motion.section>
        )}

        {/* Block 3 — CTAs + progress */}
        <motion.section className="kig-cta" variants={blockVariants} aria-label="תמיכה">
          <DonateButton
            href={cta.donateUrl}
            label={getText(cta, 'donateLabel')}
            ariaLabel={getText(cta, 'donateAriaLabel')}
          />
          <a
            href={cta.visitUrl}
            className="kig-visitBtn"
            aria-label={getText(cta, 'visitAriaLabel')}
          >
            {getText(cta, 'visitLabel')}
          </a>
          <ProgressBar progress={progress} />
        </motion.section>

        {/* Block 4 — Long emotional text */}
        <motion.section className="kig-longText" variants={blockVariants}>
          {longParagraphs.map((p, i) => (
            <p key={i} className="kig-longP">{p}</p>
          ))}
        </motion.section>

        {/* Block 5 — Long video (YouTube or upload) */}
        {videoLong?.url && (
          <motion.section className="kig-longVideo" variants={blockVariants} aria-label="סרטון">
            <VideoEmbed value={videoLong} />
          </motion.section>
        )}

        {/* Block 6 — Financial transparency (hidden, re-enable via SHOW_TRANSPARENCY) */}
        {SHOW_TRANSPARENCY && (
          <motion.section
            className="kig-transparency"
            variants={blockVariants}
            aria-labelledby="kig-transparencyHeading"
          >
            <h2 id="kig-transparencyHeading" className="kig-transparencyHeading">
              {getText(transparency, 'heading')}
            </h2>
            <p className="kig-transparencyPlaceholder">
              {getText(transparency, 'placeholder')}
            </p>
          </motion.section>
        )}

        {/* Block 7 — Repeat donate CTA */}
        <motion.section className="kig-cta" variants={blockVariants} aria-label="תמיכה חוזרת">
          <DonateButton
            href={cta.donateUrl}
            label={getText(cta, 'donateLabel')}
            ariaLabel={getText(cta, 'donateAriaLabel')}
          />
        </motion.section>

        {/* Block 8 — Share */}
        <motion.section
          className="kig-share"
          variants={blockVariants}
          aria-labelledby="kig-shareHeading"
        >
          <h2 id="kig-shareHeading" className="kig-shareHeading">
            {getText(share, 'heading')}
          </h2>
          <div className="kig-shareActions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kig-socialBtn kig-socialBtn--whatsapp"
              aria-label={getText(share, 'whatsappLabel')}
            >
              <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {getText(share, 'whatsappLabel')}
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kig-socialBtn kig-socialBtn--facebook"
              aria-label={getText(share, 'facebookLabel')}
            >
              <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {getText(share, 'facebookLabel')}
            </a>
            <button
              type="button"
              className="kig-copyBtn"
              onClick={handleCopyLink}
              aria-live="polite"
            >
              {copied ? (
                <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ) : (
                <svg className="kig-socialIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              )}
              {getText(share, 'copyLabel')}
            </button>
          </div>
        </motion.section>

      </motion.div>
    </div>
  );
}
```

- [ ] **Verify build passes**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

- [ ] **Commit**

```bash
git add src/pages/kenZeOved/KenZeOvedPage.jsx
git commit -m "feat(kenZeOved): restructure layout — short video top, long video below text, hide transparency"
```

---

## Task 8: Final build + lint

- [ ] **Run lint**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
```

Fix any errors before continuing.

- [ ] **Run build**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Expected: clean build, no warnings about unresolved imports.

- [ ] **Start dev server and verify manually**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Check:
1. `/admin/content/home` — each section shows its media button; clicking opens the modal
2. `/admin/content/kenZeOved` — video_short and video_long sections appear at bottom
3. `/ken-ze-oved` — layout is hero → (no short video yet) → CTAs → long text → share; transparency hidden
4. Textarea resize handle gone on mobile

- [ ] **Push**

```bash
git push
```
