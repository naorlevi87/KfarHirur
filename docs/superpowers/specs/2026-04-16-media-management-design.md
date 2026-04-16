# Media Management in Admin Content Editor
> Spec date: 2026-04-16

## Scope

Two parallel changes:
1. Media gallery management integrated into `AdminContentEditorPage` (home page sections)
2. Layout restructure of `KenZeOvedPage` + video management in its admin editor
3. CSS fix: textarea resize handle too small on mobile

Out of scope: timeline item media (already handled by `/admin/timeline/items/:slug` block editor).

---

## 1. New Field Types

Three new types added to the schema field system alongside `input` / `textarea`:

| type | use | stored in DB as |
|---|---|---|
| `media-gallery` | multi-image carousels (zola, atlit, joz) | `string[]` — JSON array of URLs |
| `media-single` | single image (crew, timeline preview) | `string` — single URL |
| `video` | video slots (kenZeOved) | `{ type: 'youtube'\|'facebook'\|'instagram'\|'upload', url: string }` — JSON object |

All stored in the existing `page_content` table. No new tables or migrations. The `value` column is JSONB and already supports arrays and objects.

---

## 2. Home Page Schema Additions

New sections added to `home.schema.js` — one per carousel / media slot. Each section contains a single `media-gallery` or `media-single` field.

| section key | field path | type | label |
|---|---|---|---|
| `media_zola` | `images.zola` | `media-gallery` | תמונות זולה |
| `media_atlit` | `images.atlit` | `media-gallery` | תמונות עתלית |
| `media_joz` | `images.joz` | `media-gallery` | תמונות ג׳וז ולוז |
| `media_crew` | `images.crew` | `media-single` | תמונת צוות |
| `media_timeline` | `timeline.previewImage` | `media-single` | תמונת ציר זמן |
| `media_fundraising_video` | `fundraising.videoUrl` | `media-single` | וידאו גיוס (דף בית) |

All media fields are `mode: 'shared'` — no naor/shay split for images.

Static content file (`home.content.js`) remains unchanged — DB values win via the existing `deepMerge` overlay system.

---

## 3. KenZeOved Schema Additions

Two video fields added to `kenZeOved.schema.js`:

| section key | field path | type | label |
|---|---|---|---|
| `video_short` | `videoShort.src` | `media-single` | סרטון קצר (למעלה, autoplay) |
| `video_long` | `videoLong` | `video` | סרטון ארוך (למטה) |

`video_short` is upload-only (used as `<video autoPlay muted playsInline loop>`).
`video_long` supports YouTube / Facebook / Instagram / direct upload.

---

## 4. Modal Gallery Editor — MediaGalleryModal

New component: `src/pages/admin/components/MediaGalleryModal.jsx`

**Trigger:** A button inside each section card in `AdminContentEditorPage`:
- For `media-gallery`: `📷 ערוך תמונות (N)` where N = current count
- For `media-single`: `📷 ערוך תמונה`
- For `video`: `🎬 ערוך וידאו`

**Modal structure** (native `<dialog>`):
```
┌─────────────────────────────────┐
│ תמונות זולה              [×]    │
├─────────────────────────────────┤
│ [thumb][↑↓][×]  [thumb][↑↓][×] │
│ [thumb][↑↓][×]  [thumb][↑↓][×] │
│                                  │
│ [+ הוסף תמונה]                  │
├─────────────────────────────────┤
│ [בטל]              [שמור]       │
└─────────────────────────────────┘
```

- Thumbnails: 3-per-row mobile, 4-per-row desktop
- Each thumbnail: `↑` / `↓` arrows for reorder, `×` for delete
- Reorder arrows: no drag-to-drop in this phase — arrows only
- "הוסף תמונה" → native file picker → upload to Supabase Storage `homepage` bucket → appended to list
- Changes are local state until "שמור" is pressed
- "שמור" → calls existing `upsertPageContentBatch` → closes modal
- "בטל" → discards local changes → closes modal

**media-single variant:**
- Shows single image preview (or empty state)
- Two buttons: "החלף" (opens file picker) and "מחק"
- No reorder controls

**video variant:**
- Source selector tabs: `YouTube | העלאה ישירה`
- Phase 1 only: YouTube URL + direct upload. Facebook/Instagram embeds require external scripts — deferred to a future phase.
- YouTube: URL text input + live embed preview
- Upload: file picker → upload to Supabase Storage
- "מחק" button to remove current video

---

## 5. Storage Delete

When a user removes an image or video:
- Check if URL contains `kqlfvwlzayinngrgafec.supabase.co/storage`
- If yes → extract path → call `supabase.storage.from('homepage').remove([path])`
- If no (external URL) → skip storage delete, remove from list only

A helper function `deleteStorageFile(url)` in `src/data/admin/mediaQueries.js` handles this.

---

## 6. KenZeOvedPage Layout Restructure

New block order:

```
1. Hero (heading + body)
2. Short video (autoPlay muted playsInline loop) — NEW
3. CTAs + progress bar
4. Long text
5. Long video (YouTube / Facebook / Instagram / upload)
6. Repeat donate CTA
7. Share
```

Block removed (hidden): Financial transparency — component stays in code but rendered with `display: none` via a feature flag constant `SHOW_TRANSPARENCY = false` at the top of the file. Easy to re-enable.

**Short video placeholder:** If no `videoShort.src` in DB or static content → section renders nothing (same pattern as other optional media).

**Long video rendering:** Routed by `videoLong.type`:
- `youtube` → `<iframe>` embed
- `facebook` → Facebook embed script
- `instagram` → Instagram embed
- `upload` → `<video controls>`

A new component `VideoEmbed.jsx` in `src/pages/kenZeOved/` handles this routing.

---

## 7. Textarea Resize Handle — Mobile Fix

In `AdminContentEditorPage.css`, `.ace-textarea` currently has `resize: vertical` with no minimum touch target for the resize handle.

Fix: add a `min-height` large enough that users don't need to resize on mobile, and add a custom resize affordance via `padding-bottom`. On mobile (`max-width: 768px`) set `resize: none` and instead render a larger initial height.

```css
@media (max-width: 768px) {
  .ace-textarea {
    resize: none;
    min-height: 120px;
  }
}
```

This removes the tiny handle entirely on mobile. Users on desktop retain vertical resize.

---

## 8. File Locations

```
src/
  pages/admin/components/
    MediaGalleryModal.jsx    — modal for gallery / single / video editing
    MediaGalleryModal.css
  pages/kenZeOved/
    VideoEmbed.jsx           — routes videoLong by type to correct embed
  data/admin/
    mediaQueries.js          — deleteStorageFile(url), uploadMedia (already exists in timelineAdminQueries — extract/reuse)
  data/pageContent/
    home.schema.js           — add 6 media sections
    kenZeOved.schema.js      — add 2 video sections
```

`AdminContentEditorPage.jsx` gets a `renderFieldInput` branch for the three new types — delegates to `MediaGalleryModal`.

---

## 9. What Does Not Change

- `page_content` table schema — no migration needed
- `HomeCarousel` — already handles `images.length === 1` (no carousel) vs multiple
- Timeline admin — untouched
- `deepMerge` / `buildDbOverlay` — already handles arrays and objects; no changes needed
- Static content files — remain as fallback defaults
