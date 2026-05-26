# Timeline Road v2 + Node Color Palette — Design Spec
**Date:** 2026-04-22

---

## Problem

1. **Road**: Current stroke-based approach can't produce spatial width variation (thicker in some places, thinner in others simultaneously). The 3-layer breathing animation exists but isn't visually prominent. The layers look like one heavy block, not distinct depths.
2. **Nodes**: All nodes are the same color (`--road`). Visually monotonous, especially as more nodes are added.

---

## Solution Overview

1. **Road** → rebuild as 3 filled SVG `<path>` shapes with spatially varying width + slow temporal drift
2. **Nodes** → 15-color palette via CSS tokens, deterministic hash assignment per node

---

## Part 1: Road — Filled Shape with Spatial Width Variation

### Concept

Instead of `<path stroke>`, the road is drawn as a **filled band** — two offset curves joined at the ends, forming a closed shape. The band width varies along the path using overlapping sine waves at irrational spatial frequencies. A slowly animating phase offset makes the thick/thin spots drift over time without repeating.

### Geometry

**Spine sampling:**
Sample the 12 bezier segments at `N = 150` total points (evenly distributed). For each sample point `i`:
- Position: `(x, y)` from cubic bezier
- Tangent: `(tx, ty)` from cubic derivative, normalized
- Normal: `nx = -ty, ny = tx` (left-perpendicular to direction of travel)
- Progress: `i / (N-1)` — 0 at path start, 1 at path end

Precompute once at module load — spine is static (path doesn't change).

**Width function:**
```
w_screen(progress, phase) =
  BASE_W × (1
    + 0.35 × sin(progress × 4.7π + phase)
    + 0.20 × sin(progress × 11.3π + phase × 1.7)
    + 0.10 × sin(progress × 23.7π + phase × 2.3))
```
- `BASE_W = 4` screen pixels (divided by worldScale for world units)
- Frequencies 4.7, 11.3, 23.7 are irrational ratios → never repeats visually
- Total amplitude: max ±65% of BASE → width ranges ~3px to ~15px on screen

**Phase drift (temporal movement):**
```js
// rAF loop — updates phase slowly
phase += 0.0004 per frame (~24ms per full cycle at 60fps × 2π ÷ 0.0004 ≈ 260s)
```
The thick/thin spots migrate along the path slowly. Not noticeable as animation, perceived as "alive."

**Building the filled path (per layer):**
```
top_points[i]    = (x + nx × half_w, y + ny × half_w)
bottom_points[i] = (x − nx × half_w, y − ny × half_w)

SVG path: M top[0] L top[1] ... L top[N-1]
          L bottom[N-1] L bottom[N-2] ... L bottom[0] Z
```

**Counter-scaling:**
World-space half-width = `w_screen(progress, phase) / (2 × worldScale)`

Subscribe to `worldScale.on('change')` → rebuild path string. The spine (center points + normals) is precomputed and reused — only the width values are recalculated.

### 3 Layers

All layers share the same spine and the same width function. Each layer multiplies by a size factor:

| Layer | Width factor | Opacity |
|---|---|---|
| Inner (core) | `1.0` | `0.65` |
| Mid | `1.2` | `0.28` |
| Outer | `1.44` | `0.10` |

Outer is 44% wider than inner → clearly visible as a soft halo. All 3 breathe together (same phase, same sine values, just different size multipliers).

### Files Changed

- `src/features/timeline/TimelineRoad.jsx` — full rewrite
- `src/features/timeline/timelinePath.js` — add `sampleSpine(n)` export: samples N points along the full path, returns `Array<{ x, y, nx, ny, progress }>`

### Entry Animation

The `isEntering` draw animation must be preserved. For filled paths, `strokeDashoffset` doesn't work. Instead:

Use a `clipPath` approach: a `<clipPath>` containing a `<rect>` that grows from 0 width to full viewport width using CSS animation (same timing as before: 1800ms). All 3 filled layers are clipped by this rect.

Alternatively: render the existing stroke-based draw animation as a hidden overlay just for the clip, then reveal the filled layers.

**Simpler approach (recommended):** Use SVG `clipPath` with an animated `<rect>` expanding left-to-right. The rect starts at `width=0` and animates to `width=PATH_BBOX.maxX + margin`. All 3 filled paths are wrapped in `<g clipPath="url(#tl-draw-clip)">`.

Animation: driven by a CSS `@keyframes` with `animation-duration: 1800ms` and same easing. Only applies when `isEntering=true`. On reduced-motion or restored position: skip clip, show immediately.

---

## Part 2: Node Color Palette

### 15 CSS Color Tokens

Define `--node-c-1` through `--node-c-15` in `globals.css`. Default values are Naor-mode (cool). Shay-mode overrides in `[data-consciousness-mode="shay"]`.

**Naor palette (cool):**
```css
--node-c-1:  hsl(228, 45%, 62%);   /* periwinkle */
--node-c-2:  hsl(207, 45%, 58%);   /* steel blue */
--node-c-3:  hsl(258, 38%, 62%);   /* soft violet */
--node-c-4:  hsl(188, 38%, 52%);   /* teal */
--node-c-5:  hsl(215, 50%, 65%);   /* sky blue */
--node-c-6:  hsl(272, 38%, 60%);   /* purple */
--node-c-7:  hsl(195, 42%, 55%);   /* cyan-teal */
--node-c-8:  hsl(220, 42%, 60%);   /* cornflower */
--node-c-9:  hsl(285, 32%, 62%);   /* lavender */
--node-c-10: hsl(200, 35%, 52%);   /* slate blue */
--node-c-11: hsl(178, 35%, 58%);   /* mint teal */
--node-c-12: hsl(245, 40%, 62%);   /* blue-violet */
--node-c-13: hsl(183, 40%, 55%);   /* aqua */
--node-c-14: hsl(300, 28%, 60%);   /* mauve */
--node-c-15: hsl(210, 52%, 60%);   /* medium blue */
```

**Shay overrides (warm earth):**
```css
[data-consciousness-mode="shay"] {
  --node-c-1:  hsl(14,  55%, 58%);  /* coral/terracotta */
  --node-c-2:  hsl(35,  60%, 52%);  /* amber */
  --node-c-3:  hsl(345, 45%, 58%);  /* dusty rose */
  --node-c-4:  hsl(25,  40%, 48%);  /* coffee brown */
  --node-c-5:  hsl(48,  58%, 52%);  /* golden honey */
  --node-c-6:  hsl(5,   50%, 52%);  /* brick red */
  --node-c-7:  hsl(28,  65%, 60%);  /* peach */
  --node-c-8:  hsl(15,  55%, 44%);  /* rust */
  --node-c-9:  hsl(42,  45%, 62%);  /* warm sand */
  --node-c-10: hsl(355, 55%, 62%);  /* salmon */
  --node-c-11: hsl(20,  42%, 52%);  /* sienna */
  --node-c-12: hsl(58,  38%, 52%);  /* warm olive */
  --node-c-13: hsl(0,   48%, 58%);  /* soft red */
  --node-c-14: hsl(44,  70%, 48%);  /* turmeric */
  --node-c-15: hsl(12,  32%, 62%);  /* blush clay */
}
```

### Hash Assignment in TimelineNode

Bring back a stable hash function (same logic as old `idToSeed`, now named `nodeColorIndex`):

```js
function nodeColorIndex(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 15) + 1; // 1–15
}
```

Apply to circle fill and stroke:
```jsx
const colorVar = `var(--node-c-${nodeColorIndex(id)})`;

<circle
  fill={colorVar}
  fillOpacity={nodeFillOpacity(pathProgress)}
  stroke={colorVar}
  strokeOpacity={nodeStrokeOpacity(...)}
  ...
/>
```

### Files Changed

- `src/styles/globals.css` — add 15 `--node-c-N` tokens + Shay overrides
- `src/features/timeline/TimelineNode.jsx` — add `nodeColorIndex`, use colorVar

---

## Files Summary

| File | Change |
|---|---|
| `src/features/timeline/timelinePath.js` | add `sampleSpine(n)` |
| `src/features/timeline/TimelineRoad.jsx` | full rewrite — filled shape |
| `src/features/timeline/TimelineNode.jsx` | add hash fn, use color tokens |
| `src/styles/globals.css` | add 15 node color tokens |

---

## Non-Goals

- No changes to label placement, preview card, zoom logic, or data layer
- No changes to admin UI
- No changes to `timelineData.js` or `timelineUtils.js`
