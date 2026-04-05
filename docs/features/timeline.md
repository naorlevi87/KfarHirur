# Timeline Feature — Architecture & Mechanics

## File Map

```
TimelineFeature.jsx   — root: owns all state, orchestrates everything
TimelineCanvas.jsx    — pannable SVG world, handles zoom input
TimelineRoad.jsx      — renders the bezier path (axis)
TimelineNode.jsx      — single node + label/tag placement
TimelinePreview.jsx   — preview card (shown on node tap)
timelinePath.js       — bezier math, date→position, path definition
timelineData.js       — canvas dims + all shared constants
timelineUtils.js      — geometry helpers: normal vector, label layout, flip assignment
```

---

## Coordinate Systems

**World space** — the SVG canvas is 3000×2200 world units. All node `x, y` positions
are in world units. `worldX`, `worldY`, `worldScale` (Framer Motion MotionValues)
define the current view into this world.

**Screen space** — pixels on screen. Conversion: `screenX = worldX + nodeX * worldScale`.

**Counter-scaled group** — each `TimelineNode` lives in a `<g>` with transform
`translate(x,y) scale(1/worldScale) translate(-x,-y)`. Inside this group,
1 SVG unit = 1 screen pixel at all zoom levels. All label offsets are in these units.

---

## Zoom

`worldScale` is a Framer Motion MotionValue — updated at 60fps with no React re-renders.

**Input sources** (all in `TimelineCanvas`):
- Scroll wheel → `handleWheel` → `onZoom(newScale, cursorX, cursorY)`
- Pinch gesture → `handleTouchMove` → `onZoom(newScale, midpointX, midpointY)`
- +/− buttons → `handleZoomIn/Out` in `TimelineFeature` → `handleZoom(newScale, vpW/2, vpH/2)`

**Zoom math** (`handleZoom` in `TimelineFeature`):
```
worldPt = (originScreen - pan) / currentScale   // world point under cursor
newPan  = originScreen - worldPt * newScale      // keep that point fixed
```
This is the standard "zoom toward pointer" formula.

**Bounds:** `ZOOM_MIN = 0.12` → `ZOOM_MAX = 2.5`. Step: `ZOOM_STEP = 1.35` per button press.

**Re-render gating:** `currentScale` (React state) only updates when `worldScale` crosses
a visibility threshold (`SCALE_ALWAYS=0`, `SCALE_MID=0.45`, `SCALE_CLOSE=0.9`).
This avoids 60fps React re-renders during animated zoom.

---

## Item Visibility (3 Tiers)

DB stores `zoom_tier` (integer 0|1|2) — a semantic level, not a scale value.
`resolveTimelineItem` maps tier → canvas scale via `ZOOM_TIER_SCALE` in `timelineData.js`.

| zoom_tier | minScale (code) | Visible when |
|-----------|-----------------|--------------|
| 0         | SCALE_ALWAYS=0  | always |
| 1         | SCALE_MID=0.3   | mid zoom |
| 2         | SCALE_CLOSE=0.9 | close only |

Filter: `item.minScale <= currentScale`.

To adjust when a tier reveals, change `SCALE_MID` / `SCALE_CLOSE` in `timelineData.js` — DB never needs updating.

Fallback for legacy rows: `initial_view=true` → tier 0, otherwise → tier 1.

---

## Label Placement

Labels are **always horizontal** — never centered above/below.
Placement is driven by the outward normal vector `(nx, ny)` at the node's bezier position.

### Step 1 — Outward Normal (`getOutwardNormal`)

The bezier tangent `(tx, ty)` at any point has two perpendiculars.
We pick the one pointing **away from the path center** (1300, 1000) — the "outside" of the curve.

### Step 2 — Side (left or right)

- `nx >= 0` → label to the **right** of node
- `nx < 0`  → label to the **left** of node
- `labelFlip=true` (set by parent for crowded nodes) → inverts the side

```
side = ((nx >= 0) XOR labelFlip) ? +1 : -1
```

### Step 3 — Vertical offset

```
effectiveNy = labelFlip ? -ny : ny
anchorY = node.y + effectiveNy * V_SCALE
```

`ny` shifts the label up or down to sit in the open space beside the axis.
When the side flips, `effectiveNy` flips too — so the label stays on the open side.

### Step 4 — Anchor point (SVG Hebrew RTL quirk)

In SVG with Hebrew text, `textAnchor` means the **opposite** of what you'd expect:
- `textAnchor="end"` = **left** edge of text
- `textAnchor="start"` = **right** edge of text

So to place the nearest edge `H_GAP` px from the node:
- side=+1 (text right of node) → `anchor="end"`, `ax = node.x + r + H_GAP`
- side=-1 (text left of node)  → `anchor="start"`, `ax = node.x - r - H_GAP`

### Step 5 — Tag (date/label)

Tag is centered horizontally on the label. Since the label uses `end`/`start` anchor,
we estimate label width (`estimateLabelBox`) to find its visual center, then place
the tag there with `textAnchor="middle"`. Vertically: one line above or below the label,
in `tagDir = sign(effectiveNy)`. Hidden at low zoom (`worldScale < 0.5`).

### Label flip assignment (`assignLabelFlips`)

`TimelineFeature` runs a layout pass over `visibleItems` (sorted by path date order).
Any item whose screen position is within 80px of the previous item gets `labelFlip=true`,
alternating sides for visual separation.

---

## Preview — Expand State

`TimelineFeature` holds two state variables:
- `previewId: string | null` — which item is selected
- `expanded: boolean` — whether the card is in full-screen mode

State transitions:
```
null                        → node tap      → previewId set, expanded=false
previewId, expanded=false   → "קרא עוד..."  → expanded=true, navigate('/timeline/:slug')
previewId, expanded=true    → close/Esc     → previewId=null, expanded=false, navigate(-1)
```

Direct URL (`/timeline/:slug`) → on mount, finds item by slug, sets `previewId + expanded=true`.

### Key constraints (non-obvious — do not change without reading this)

**No `layoutId`** — Framer Motion has known quirks when animating between `position: absolute` and `position: fixed` using `layoutId`. We use `layout` on a single node that transitions via CSS class instead.

**No background location pattern** — both `/timeline` and `/timeline/:slug` render the same `TimelineFeature` component directly. `TimelinePage` uses `key={state?.menuNav ?? 'tl'}` to remount only on explicit menu navigations; expand/close navigations carry no `menuNav` so the component instance is preserved.

---

## Preview Panel

On node tap, the camera pans so the **preview card center** (not the node itself)
lands at viewport center:

```
previewWorld = node + outwardNormal * PREVIEW_OFFSET
targetPan    = viewportCenter - previewWorld * scale
```

The preview card is always rendered at fixed viewport center (CSS `left/top`).
The node and axis remain visible in the frame, offset toward the axis side.

`PREVIEW_OFFSET = 200` world units — tune in `timelineData.js` if preview feels
too close or too far from the node at various zoom levels.
