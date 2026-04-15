# Home Page Design Spec

## Goal

Build a narrative-first home page for KfarHirur.com that tells the community's origin story through three acts (Zola → Atlit → Joz Veloz), leading visitors toward the fundraising page, restaurant reservation, and timeline.

---

## Narrative Structure (top → bottom)

The page reads as a story. Each text block sets up the carousel below it.

### Block 1 — Origin (dark background)
> "קהילה שהתחילה ברגע אחד  
> בזולה בנווה ים  
> והתמקמה בעתלית"

Short poetic intro. Dark (#1a1a1a) background, white text.

### Carousel 1 — Zola
Mixed photos: Zola place shots + community people photos together. Goal: warm, lived-in, not a real-estate listing. Horizontal scroll, auto-height on mobile.

**Images (Supabase Storage `homepage` bucket):**  
Zola images (zola-1 through zola-5 or similar filenames) + people photos from the Zola/Atlit era mixed in. Developer: verify exact filenames in Supabase dashboard.

### Block 2 — Community (light warm background)
**Heading:** כפר הירעור  
**Body:** עוזרים לחברה להשתלב עם אנשים. קהילה שגדלה סביב שולחן, עבודה, וחיים משותפים.

Background: #f5f0e8, text: #333/#555.

### Carousel 2 — Atlit
Mix of Atlit place photos + people/life photos — same "shuffle" approach as Carousel 1. Not a real-estate listing.

**Images:** Atlit photos (front, back, garden, living room, kitchen, ppl, ppl 2, pool, dog, etc.) mixed together. Developer: verify filenames.

### Block 3 — Joz Veloz (deep warm dark)
**Heading:** ג'וז ולוז  
**Body:** הבית של הקהילה. הבאר המשותפת והפרנסה של כולנו.

Background: #2c1810, text: #f5e6d0.

### Carousel 3 — Joz Veloz
Restaurant + team photos.

**Images:** Joz crew, vibe, Joz1–Joz4, IMG_7621.JPG. Developer: verify filenames.

### Block 4 — Visit CTA
**Heading:** מוזמנים לבוא להתארח

Three CTAs side by side:
- 🍽 הזמנת מקום → `https://ontopo.com/he/il/page/jozveloz?source=kfarhirur`
- 📸 אינסטגרם → `https://www.instagram.com/joz_ve_loz/`
- 👥 פייסבוק → `https://www.facebook.com/JozVeLoz`

Background: #f5f0e8.

### Block 5 — Fundraising
**Heading:** וכן זה עובד! אבל...  
**Subtext:** הסיפור הארוך קצת יותר מורכב. אפשר לעזור.  
**CTA:** לעמוד הגיוס ← → `/ken-ze-oved`

Background: #1a3a2a, text: #d4f0e0. CTA button: #2a7a4a.

### Block 6 — Join the Team
**Heading:** רוצים להצטרף לצוות?  
**Subtext:** אישפוז ארוך בכפר הירעור.  
**CTA:** להצטרף אלינו ← → `/ken-ze-oved` (fundraising page, same as Block 5 — this is the worker recruitment path)

Background: #f5f0e8.

### Block 7 — Timeline Teaser (footer-adjacent)
**Text:** אם בא לכם לחפור יותר בסיפור...  
**Link:** ציר הזמן ← → `/timeline`

Background: #e8e4dc. Understated — not a CTA, just an invitation.

---

## Carousel Behavior

- Horizontal scroll, touch-swipe on mobile
- No dots, no arrows — just natural swipe
- Images: fixed height (e.g., 220px mobile), variable width, `object-fit: cover`
- Subtle gap between images (8px)
- No auto-play

---

## Image Source

All images served from Supabase Storage `homepage` bucket (public).  
Base URL: `https://kqlfvwlzayinngrgafec.supabase.co/storage/v1/object/public/homepage/`  
Developer: list actual filenames from Supabase Storage dashboard before hardcoding the arrays.

---

## Content System

Home page text lives in `src/content/site/he/home.content.js`.  
No DB overlay needed at launch — static file is sufficient for now.  
The content file is structured for future DB overlay compatibility (same pattern as kenZeOved).

---

## Consciousness Mode

Home page is **mode-neutral** at launch — same layout and text for both Naor and Shay.  
CSS uses `var(--...)` tokens where appropriate, but the blocks with hardcoded background colors (dark origin block, Joz block, fundraising block) are intentionally fixed — they represent the story, not the mode.

---

## Routing

Route: `/` (root, replaces any existing home placeholder)

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/pages/home/HomePage.jsx` | Create — page component |
| `src/pages/home/HomePage.css` | Create — page styles |
| `src/pages/home/HomeCarousel.jsx` | Create — reusable horizontal scroll carousel |
| `src/content/site/he/home.content.js` | Create — Hebrew copy |
| `src/content/site/en/home.content.js` | Create — English copy (placeholder, mirrors Hebrew) |
| `src/app/App.jsx` | Modify — wire `/` route to `HomePage` |

---

## Not in scope

- Animations on the carousels (no entrance animation at launch)
- Consciousness mode variants for home page text
- Admin editing of home page text (add to content editor later)
- Desktop layout (mobile-first; desktop pass is a separate task)
