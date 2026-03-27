# Design Spec — Keep It Going (גיוס המונים) Page
> Created: 2026-03-27. Status: approved for implementation.

---

## 1. Purpose

A standalone fundraising page for Kfar Hirur / Joz ve Loz (ג'וז ולוז).

People arrive via a direct shared link (WhatsApp, social). The page's job:
1. Make them feel the story
2. Get them to donate or show up
3. Make them want to pass it on

This is NOT the archive, NOT the timeline. Those live elsewhere. This page is focused.

---

## 2. The Story (Framing)

**Not just the war.** Six years of COVID + wars. Every time they fell, they got back up. But it accumulates.

"Pay what you want" has been the model since day one — at the restaurant. This fundraiser is the same ask, extended outward: give what you can.

The community started in 2015 with a beach cleanup project in Atlit (Project 24 — Shai Kenigsberg + Naor Levi). That grew into Kfar Hirur, which runs Joz ve Loz — a collective restaurant in Florentine, Tel Aviv, operating on a pay-what-you-feel model for 6+ years.

---

## 3. Page Route

`/keep-it-going` — existing route, existing page component (`KeepItGoingPage.jsx`). This spec describes the full redesign of that page.

---

## 4. Page Structure (top to bottom)

### Block 1 — Story Header
- Large heading (right-aligned, not centered)
- 3–4 sentences: who we are, 6 years of falling and rising, where we are now
- Tone: direct, human, not NGO, not pleading

### Block 2 — Call to Action
Two buttons, stacked on mobile:
- **Primary:** "תרמו עכשיו" → links to `https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw`
- **Secondary:** "תבואו אלינו" → links to reservation / address (TBD — placeholder for now)

Progress bar below the buttons:
- Shows: `גויסו X ₪ מתוך 180,000 ₪`
- Two milestones:
  - **שלב א׳ — 180,000 ₪:** המשך פעילות, תשלום מיסים
  - **שלב ב׳ — 340,000 ₪:** התחלת צמצום חובות לספקים
- Amount raised: **manually updated** in content file — no live API dependency
- Progress bar animates in with spring physics on viewport entry

### Block 3 — Video
- Placeholder for now: interview with Naor + Shai explaining the campaign
- Will be embedded when filmed
- Placeholder renders as a styled empty card with label

### Block 4 — Long Emotional Text
- Full story, longer form
- Content authored separately, pulled from content layer
- `max-width: 65ch`, right-aligned body text

### Block 5 — Financial Transparency
- **Placeholder only for now** — section exists, no data displayed yet
- Label: "שקיפות כלכלית" — accordion or expandable, collapsed by default
- Will be filled in a future pass with monthly summary from Google Sheets

### Block 6 — Share
- "תעבירו הלאה" heading
- Two actions:
  - WhatsApp share button (pre-filled message with page URL)
  - Copy link button (copies current URL to clipboard)
- No Facebook share

### Block 7 — Footer link
- Logo + "חזרה לאתר" → `/`
- Not a full SiteFooter — minimal

---

## 5. Visual System

Follows project taste rules (`DESIGN_VARIANCE: 8`, `MOTION_INTENSITY: 6`, `VISUAL_DENSITY: 4`).

- **Font:** Alef (already loaded)
- **Colors:** exclusively `var(--...)` tokens from `globals.css` — no hardcoded values
- **Layout:** right-aligned, asymmetric — no centered hero
- **Mobile-first:** this pass is mobile baseline only. Desktop is a separate pass.
- **Viewport:** `min-h-[100dvh]`, no `h-screen`

### Motion
- Progress bar: spring physics fill on scroll-into-view
- Buttons: `scale(0.98)` on `:active`, subtle magnetic pull on hover (Framer Motion `useMotionValue`)
- Blocks: staggered `fadeInUp` on scroll entry
- No `useState` for continuous animations — `useMotionValue` / `useTransform` only

---

## 6. Content Layer

All copy lives in `src/content/site/he/keepItGoing.content.js` and `src/content/site/en/keepItGoing.content.js`.

New keys needed:
- `hero.heading` — main page title
- `hero.body` — 3–4 sentence story
- `cta.donateLabel` — "תרמו עכשיו"
- `cta.visitLabel` — "תבואו אלינו"
- `cta.visitAriaLabel`
- `progress.raisedLabel` — "גויסו"
- `progress.outOfLabel` — "מתוך"
- `progress.raisedAmount` — **manually updated number** (e.g. `43000`)
- `progress.goalA` — `180000`
- `progress.goalALabel` — "המשך פעילות"
- `progress.goalB` — `340000`
- `progress.goalBLabel` — "צמצום חובות"
- `video.placeholder` — placeholder label
- `longText.body` — full emotional text (multiline / array of paragraphs)
- `transparency.heading` — "שקיפות כלכלית"
- `transparency.placeholder` — placeholder text for now
- `share.heading` — "תעבירו הלאה"
- `share.whatsappLabel` — WhatsApp button label
- `share.copyLabel` — copy link button label
- `share.whatsappMessage` — pre-filled WhatsApp message text
- `footer.backLabel` — "חזרה לאתר"

Mode-branching (naor/shay): **required by architecture** — even if content is identical in both modes for now. Every content key must live inside a `naor` / `shay` sub-object (or a shared fallback pattern), so that future copy variation doesn't require structural changes. The resolver handles the branching — components stay unaware.

---

## 7. Architecture

Follows existing project architecture exactly:

- **Page:** `src/pages/keepItGoing/KeepItGoingPage.jsx` — owns structure and composition only
- **Resolver:** `src/pages/keepItGoing/resolveKeepItGoingPageData.js` — assembles content payload from locale/mode, exports pure function + hook
- **CSS:** `src/styles/app/KeepItGoingPage.css` — component-scoped styles
- **Content:** `src/content/site/he/keepItGoing.content.js` + `en/` equivalent

No new folders. No new global providers. No new app state.

---

## 8. Payment Link

`https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw`

Lives in content layer, not hardcoded in component.

---

## 9. What's Explicitly Out of Scope

- Desktop layout — separate pass
- Financial transparency data — placeholder only, filled later
- Video — placeholder only, filled when filmed
- "תבואו אלינו" destination URL — placeholder, TBD
- Timeline / archive — lives on a different page
- Community platform / sign-up features — future

---

## 10. Open Questions (for later)

- What does "תבואו אלינו" link to? Reservation system? Google Maps? Phone number?
- What's the WhatsApp pre-filled message text?
- Who writes the long emotional text?
