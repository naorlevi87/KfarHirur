# Timeline Feature — Design Spec
> Written: 2026-03-28. Validated through interactive brainstorming session.

---

## What We're Building

A panning 2D map with a winding road — the story of Kfar Hirur as a path through space and time. Not a vertical scroll. Not a linear list. A world you wander through.

The metaphor: Alice's rabbit hole. Simple from above. The deeper you go, the more you can get lost.

---

## Interaction Model

### Level 0 — The Map (default)
- Full 2D canvas, larger than the viewport
- A winding SVG path (the "road") with 9 nodes placed on it
- User pans by dragging in any direction
- No years visible, no indicators — just node names and the road
- No "you are here" — free wandering
- Hint text fades after 4s: "גרור לשוטט · לחץ על נקודה"

### Level 1 — Zoom + Preview (on node tap, if node has sub-items)
- Tap a node → **zoom in**, centered on the tapped node
  - The node does not move — the world scales toward it
  - Spring animation (Framer Motion `animate` on scale + x/y)
  - Sub-items that were invisible at Level 0 are now **revealed** — they were always there, just below the zoom threshold
- Preview card opens, covering ~60–70% of the screen (bottom sheet or centered card)
- Behind the card: the zoomed canvas is visible — user can see the sub-items in context
- Card shows: tag, title, text (mode-aware), "צלול עוד ↓" button if sub-items exist
- Tap outside card → dismiss card, stay in zoomed view
- Back gesture (swipe down or back button) → zoom out to Level 0

### Level 1 — Preview only (on node tap, if node has NO sub-items)
- No zoom animation — preview card opens directly
- Same card design, no "צלול עוד" button

### Level 2+ — Recursive zoom
- From a preview card with sub-items: tap "צלול עוד" → zoom in again, centered on that sub-item
- New sub-items revealed at this depth, new preview opens
- Can repeat as deep as the data goes
- Each level remembers its zoom state — back unwinds one level at a time

### Zoom mechanics
- Scale levels: L0 = 1.0, L1 = ~2.5, L2 = ~5.0 (approximate — tuned visually)
- Transform origin: always the tapped node's canvas position
- Sub-items have a `visibleFromScale` threshold — they render only when canvas scale ≥ their threshold
- Framer Motion: `animate={{ scale, x, y }}` on the world container, spring transition

---

## The Road

### Canvas size
`3000 × 2200` px SVG, placed in a pannable container.

### Path
A single continuous SVG cubic bezier path (`<path d="M ... C ... C ...">`).
The path winds genuinely in 2D — goes right, curves left, dips, climbs, and **returns near its starting X** at the end (the road comes back — intentional, mirrors the story).

### Road rendering
- Wide glow stroke (opacity ~0.04) for atmosphere
- Dashed centerline stroke (opacity ~0.28) for the road feel
- Both colored by `var(--road)` — changes with consciousness mode

---

## The 9 Nodes

| id | label | tag | position on canvas |
|----|-------|-----|---------------------|
| `atlit` | עתלית | 2013–2015 | bottom-center, start |
| `einkemunim` | עין כמונים | 2014–2015 | right side |
| `manuela` | מנואלה | 2015 | far right |
| `tlv` | תל אביב | 2016 | back left, mid-height |
| `joz-open` | ג׳וז נפתח | יולי 2017 | upper right |
| `corona` | קורונה | 2020 | top center — **largest, glowing** |
| `pinum` | [לא] צו פינוי | 2021 | upper left |
| `milchama` | מלחמה | 7.10.2023 | far left |
| `now` | עכשיו | 2024–2026 | top left — road loops back |

### Node sizing
- Standard: r=11, glow r=24
- Key moments (ג'וז נפתח, מלחמה): r=13, glow r=28
- Corona: r=18, glow r=50, double ring, Framer glow filter — most prominent node on the map

---

## Consciousness Mode

Each node has `naor` and `shay` content objects:
```js
{
  tag: '2020',
  naor: { title: '...', text: '...' },
  shay: { title: '...', text: '...' }
}
```

Mode change:
- Road color transitions: Naor = `#7c6fcd` (indigo), Shay = `#e07a5f` (coral)
- Preview card content switches immediately
- CSS custom properties handle all color changes (`var(--road)`, `var(--accent)`, etc.)
- Switcher lives in `SiteHeader` — already exists via `ConsciousnessSwitcher`

---

## Architecture

### File structure
```
src/features/timeline/
  TimelineFeature.jsx       — root component, owns pan state
  TimelineCanvas.jsx        — the SVG world + drag container
  TimelineRoad.jsx          — the SVG path
  TimelineNode.jsx          — individual node (circle + label)
  TimelinePreview.jsx       — preview card (AnimatePresence)
  timelineData.js           — node positions + content (naor/shay)
  TimelineFeature.css       — feature-scoped styles

src/pages/timeline/
  TimelinePage.jsx          — thin page shell, renders TimelineFeature
```

### Pan implementation
- `motion.div` with `drag` prop (Framer Motion)
- `dragElastic: 0.1`, `dragConstraints` set to allow full canvas navigation
- Or: manual `useMotionValue` + `useTransform` for more control over spring behavior

### Preview positioning
- Preview card is a fixed-position React component
- Position calculated from node's `getBoundingClientRect()` at click time
- Clamped to viewport edges
- `AnimatePresence` for appear/disappear spring animation

### Data model — flat list, not a tree

All items live in a **flat array**. No parent-child hierarchy.

```js
// timelineData.js
export const items = [
  {
    id: 'corona',
    x: 1400, y: 75,          // canvas coordinates
    minScale: 0,              // visible at zoom level 0 (always)
    size: 'large',            // affects node radius
    naor: { tag: '2020', title: '...', text: '...' },
    shay:  { tag: '2020', title: '...', text: '...' },
  },
  {
    id: 'corona-lockdown',
    x: 1320, y: 130,
    minScale: 2.0,            // only appears when scale >= 2.0
    size: 'small',
    naor: { tag: 'מרץ 2020', title: 'סגר ראשון', text: '...' },
    shay:  { tag: 'מרץ 2020', title: 'סגר ראשון', text: '...' },
  },
  {
    id: 'joz-delivery',
    x: 1480, y: 140,
    minScale: 2.0,
    size: 'small',
    naor: { tag: 'אפריל 2020', title: 'ג׳וז עד הבית', text: '...' },
    shay:  { tag: 'אפריל 2020', title: 'ג׳וז עד הבית', text: '...' },
  },
  // ...
];
```

**Key insight:** items near each other on the canvas may be from different "periods" — they overlap spatially because life overlaps. The zoom doesn't reveal children, it reveals **density**.

**Years:** no years at `minScale: 0`. Year labels (text elements in SVG) also have a `minScale` threshold — they appear only when zoomed in.

### Content layer
Item content lives in `src/features/timeline/timelineData.js` — feature-specific structured data, not pure i18n copy.

### Mode awareness
- `useAppContext()` provides `mode`
- `TimelinePreview` reads `data[mode]` to get the right voice
- Road color via CSS custom property on `.timeline-feature[data-mode]`

---

## What's in MVP

- Level 0: panning map, 9 nodes, road
- Level 1: zoom + preview (zoom-in animation, sub-items revealed, preview card)
- Recursive zoom (if data has depth)
- Consciousness mode (road color + preview text)

## What's NOT in MVP

- Level 2 full item view (long text, photo, video, embeds)
- Admin backoffice for timeline content
- Years appearing on zoom (Phase 2 detail)
- Zoom-out breadcrumb navigation

These are Phase 2.

---

## Visual Constraints (from design-taste-frontend skill)

- `DESIGN_VARIANCE: 8` — the winding road IS the asymmetry
- `MOTION_INTENSITY: 6` — spring physics on preview card, smooth pan inertia
- No hardcoded colors — `var(--road)`, `var(--accent)` etc.
- Mobile-first — panning works with touch, preview positioned for small screens
- No Inter font
