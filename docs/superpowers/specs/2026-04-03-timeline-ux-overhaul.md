# Timeline UX Overhaul — Design Spec
> 2026-04-03

## Overview

Three interrelated improvements to the timeline UX:
1. Continuous zoom with 3 item-visibility levels
2. Dynamic preview panel — opens beside the axis, never covers it
3. Labels stay perpendicular to axis (already working, unified with preview logic)

---

## 1. Continuous Zoom

### Current state
Two hard-coded discrete levels (`zoomLevel` 0/1). Items filtered by level. No user-controlled zoom.

### New behavior
- Continuous zoom via `worldScale` MotionValue (already exists)
- Three **visibility thresholds** on items, replacing the binary `zoomLevel`:
  - `minScale: 0` — always visible (main milestones, ~5–10 items)
  - `minScale: 0.45` — visible at mid zoom (~20–50 items)
  - `minScale: 0.9` — visible only close up (all items, potentially hundreds)
- Exact threshold values are configurable constants in `timelineData.js`

### Zoom controls
- **Pinch** (touch) — native pinch-to-zoom on the canvas
- **Scroll wheel** (desktop) — wheel event on the viewport container
- **+/− buttons** — fixed on screen, step zoom by factor `1.35` per press, spring-animated

### Zoom bounds
- Min scale: `0.12` (full overview, a bit more zoomed out than current initial)
- Max scale: `2.5` (detail level)
- Initial scale: `0.22` (unchanged)

### Zoom origin
Zoom is applied around the **pointer position** (pinch center or cursor), not the canvas origin. This requires converting pointer coords to world space before and after scaling, then adjusting pan.

### zoomLevel state
Remove the discrete `zoomLevel` state entirely. Item visibility is derived directly from `worldScale.get()` compared to `item.minScale`. This requires subscribing to `worldScale` changes in `TimelineFeature` to trigger a re-filter of visible items.

---

## 2. Preview Panel — Dynamic Positioning Beside the Axis

### Current state
Preview card opens centered in the viewport, potentially covering the axis.

### New behavior

**Step 1 — compute preview world position**

Each node has `(x, y)` (world position) and `(tx, ty)` (normalized tangent to the bezier path). The perpendicular normals are `(-ty, tx)` and `(ty, -tx)`.

`autoLabelOffset` already picks the outward-facing normal (away from `PATH_CENTER`). Reuse that logic: extract it to a shared util `getOutwardNormal(x, y, tx, ty)` → `{nx, ny}`.

Preview center in world space:
```
previewWorldX = x + nx * PREVIEW_OFFSET
previewWorldY = y + ny * PREVIEW_OFFSET
```
`PREVIEW_OFFSET` is a constant (~160 world units at current scale — needs tuning).

**Step 2 — pan camera to center the preview**

After tapping a node, pan so `previewWorldX/Y` maps to viewport center:
```
targetX = vpW/2 - previewWorldX * scale
targetY = vpH/2 - previewWorldY * scale
```
Spring-animate `worldX` and `worldY` to these values (same spring as now).

**Step 3 — render the preview at viewport center**

Since the camera pans to put the preview world point at viewport center, the DOM preview card is always rendered at `(vpW/2 - CARD_W/2, vpH/2 - CARD_H/2)` — fixed center. No dynamic DOM positioning needed.

The node and axis will appear offset from center (toward the axis side), remaining visible.

**Clamping**: If the outward normal pushes toward a viewport edge (node near edge of screen), clamp `PREVIEW_OFFSET` so the preview stays on screen.

### Size
240×200px — unchanged.

---

## 3. Label Positioning — Dynamic Gap

### Problem
Nodes are counter-scaled (fixed screen size), but the axis road is in SVG world space. At high zoom the road stroke appears wide on screen and can overlap labels even though the outward-normal direction is correct.

### Fix: scale-aware LABEL_GAP
Replace the fixed `LABEL_GAP = 20` with a dynamic effective gap:

```js
const effectiveGap = LABEL_GAP + ROAD_HALF_STROKE / worldScale
```

Where `ROAD_HALF_STROKE` is half the road's SVG stroke width. `worldScale` is passed into `TimelineNode` as a MotionValue (already exists). Read it via `worldScale.get()` inside the same `useEffect` that drives the counter-scale transform.

This pushes labels further from the axis at high zoom (where the road appears wide) and keeps them close at low zoom.

**Refactor**: extract `getOutwardNormal(x, y, tx, ty)` from `autoLabelOffset` into `timelineUtils.js` so preview positioning reuses it without duplication.

---

## 4. Component Changes

| File | Change |
|------|--------|
| `TimelineFeature.jsx` | Remove `zoomLevel` state; subscribe to `worldScale` for visible-item filter; update `handleNodeTap` pan target; add zoom button handlers |
| `TimelineCanvas.jsx` | Add wheel + pinch event handlers; call `onZoom(delta, originX, originY)` prop |
| `TimelineNode.jsx` | Remove `zoomLevel` prop; receive `currentScale` (or read from MotionValue) for visibility; keep counter-scale logic |
| `TimelinePreview.jsx` | Always render at viewport center (`vpW/2, vpH/2`); remove dynamic `left/top` calc |
| `timelineData.js` | Add `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_STEP`, `PREVIEW_OFFSET` constants; update item `minScale` values to 3-tier system |
| `timelineUtils.js` (new) | `getOutwardNormal(x, y, tx, ty)` extracted from `TimelineNode` |
| `TimelineFeature.css` | Add `.tl-zoom-btns` (+ / − buttons, fixed position) |

---

## 5. Data Migration

Existing items use `minScale: 0` and `initialView: true`. Map to new 3-tier:
- `initialView: true` → `minScale: 0`
- `minScale: 0` (non-initial) → `minScale: 0.45`
- Any future fine-grained items → `minScale: 0.9`

Remove `initialView` field — it's redundant once `minScale: 0` covers it.

---

## 6. Out of Scope

- Full-screen item view (`TimelineItemView`) — unchanged
- Admin edit flow — unchanged
- Timeline data content — unchanged
- Mobile vs desktop preview layout differences — deferred
