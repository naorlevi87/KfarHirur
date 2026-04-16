# Timeline — Painterly Entrance Animation & Brushstroke Aesthetic

**Date:** 2026-04-05  
**Status:** Approved

## Aesthetic Direction

**Matte, rough, natural.** Not digital. Not glowing. Not smooth.

Every decision below serves this: if something looks polished, animated, or luminescent — it's wrong for this project. The result should feel like ink on paper, not CSS on a screen.

---

## Goal

Two related improvements to the timeline:

1. **Entrance animation** — when the timeline loads fresh (not restoring from a saved position), the path draws itself like a brushstroke, and nodes pop in shortly after the brush passes each one.
2. **Painterly aesthetic** — the path and nodes should look hand-drawn, not CAD-precise.

---

## Entrance Animation

### Trigger

- **Animate** when there is no `tl-pan` key in `sessionStorage` — i.e., fresh load, menu nav, or page refresh.
- **Skip** when restoring from a saved position (back-navigation from an item page). In that case show everything immediately.
- **Skip** when `prefers-reduced-motion` is set — show everything immediately.

### Path draw

Use the SVG `strokeDashoffset` technique:

1. Measure the total path length via `SVGPathElement.getTotalLength()`.
2. Set `strokeDasharray = totalLength`, `strokeDashoffset = totalLength` (fully hidden).
3. Animate `strokeDashoffset → 0` over ~1.2 seconds with `easeIn` at the start and slight deceleration at the end — mimics real brush pressure (starts deliberate, slows near the tip). **Not** a smooth linear ease. **Not** a spring (no bounce).
4. All path layers animate together on the same timing — they are one stroke, not independent layers.

### Node pop-in

Each node knows its position on the path as a fraction `t ∈ [0, 1]` (derivable from its date via `evaluateAtDate`, then mapping to total path progress across segments).

- When the animation starts, all nodes are `opacity: 0, scale: 0`.
- Each node pops in when the brush has passed it: `delay = t * DRAW_DURATION + NODE_DELAY_OFFSET`.
- `NODE_DELAY_OFFSET` = ~80ms (the brush passes the node, then a beat, then it appears).
- Pop-in: `scale 0 → 1` + `opacity 0 → 1`. **No overshoot** (`scale 1.15` feels digital/bouncy — forbidden). Eased, ~200ms. Subtle, like ink soaking into paper — not a punch.

### Coordination

`TimelineFeature` owns the animation. On mount (without saved position):
- Passes `isEntering: true` to `TimelineRoad` and each `TimelineNode`.
- `TimelineRoad` runs the `strokeDashoffset` animation.
- Each `TimelineNode` receives its `pathProgress` (0–1) and delays its pop-in accordingly.

---

## Painterly Aesthetic

### Path — `TimelineRoad.jsx`

The existing `feTurbulence` filter is already a good base. Additions:

1. **Variable-width feel** — add a 4th path layer: same bezier, slightly thicker, very low opacity, different `feTurbulence` seed. Two noisy strokes at different widths create the illusion of uneven brush pressure — thick in the middle, thin at the edges.
2. **Fiber layer** — a 5th path: `stroke-dasharray: "2 14"` (short bristles, long gaps), very thin (~1px screen), low opacity, same turbulence. Simulates individual bristle fibers escaping the edge of the stroke.
3. **No glows.** Remove or reduce `opacity` on the wide soft glow layer — it makes the path look digital/luminescent. The stroke should look like pigment on a surface, not light on a screen.
4. **Turbulence strength** — increase `feTurbulence scale` from current `5` to `8` for more visible roughness on the stroke edges.

### Nodes — `TimelineNode.jsx`

Replace the `<circle>` dot with an SVG blob generated from a deterministic seed (based on `item.id`). 

**Blob generation:**
- 7–9 points evenly distributed around a center angle.
- Each point's radius = `baseR * (1 + wobble * sin(seed + i * goldenAngle))`.
- `wobble` = 0.28 (controls irregularity).
- Points connected with `quadraticBezier` arcs for smooth but organic shape.
- Generated once at render — not animated, not random per-render.
- **No glow circle.** Remove `glowR` — glows look digital. Replace with a very subtle `feTurbulence` filter on the blob itself for rough edges (same filter as the path, weaker scale).
- `fill: var(--page-bg)` with a slightly rough stroke — looks like ink outline on paper, not a glowing orb.

This gives each node a unique ink-splat silhouette that is always the same for the same item.

---

## Files Changed

| File | What changes |
|---|---|
| `TimelineRoad.jsx` | Add fiber layer + pressure layer; accept `isEntering` + animate `strokeDashoffset` |
| `TimelineNode.jsx` | Replace dot circle with blob; accept `pathProgress` + `isEntering` for pop-in delay |
| `TimelineFeature.jsx` | Pass `isEntering` flag + `pathProgress` per item; remove the CSS `tl-enter` animation added earlier (replaced by this system) |
| `timelinePath.js` | Export `getPathProgress(dateStr) → 0..1` helper |
| `TimelineFeature.css` | Remove `tl-enter` / `tl-feature--restore` (no longer needed) |

---

## Constants (tuneable)

```js
DRAW_DURATION       = 1200  // ms — brush stroke duration
DRAW_EASING         = [0.4, 0, 0.2, 1]  // cubic-bezier — deliberate start, gentle finish
NODE_DELAY_OFFSET   = 100   // ms after brush passes node before it appears
NODE_APPEAR_EASING  = [0, 0, 0.2, 1]   // ease-out, no overshoot
NODE_APPEAR_DUR     = 200   // ms
BLOB_WOBBLE         = 0.32  // slightly more irregular than original 0.28
BLOB_POINTS         = 8     // vertices
TURBULENCE_SCALE    = 8     // up from 5 — more visible roughness
```

---

## Out of Scope

- No animation on zoom/pan interactions.
- No per-node entrance sound or haptic.
- No changes to label appearance or placement.
- No changes to the bezier path shape.
