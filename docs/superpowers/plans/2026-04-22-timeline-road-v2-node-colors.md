# Timeline Road v2 + Node Color Palette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stroke-based road with a filled SVG shape that has spatial width variation + slow phase drift, and add a 15-color deterministic palette to timeline nodes.

**Architecture:** `timelinePath.js` gets a `sampleSpine(n)` export that samples 150 points along the bezier. `TimelineRoad` uses those points to build 3 filled paths imperatively (no React state — direct DOM updates via refs) at 60fps for phase drift and on worldScale change. `globals.css` gets 15 CSS color tokens per mode. `TimelineNode` picks a color by `hash(id) % 15`.

**Tech Stack:** React 19, SVG, Framer Motion MotionValue, CSS custom properties

---

## File Map

| File | Change |
|---|---|
| `src/features/timeline/timelinePath.js` | Add `sampleSpine(n)` export |
| `src/features/timeline/timelineData.js` | Update `ROAD_GLOW_SCREEN_HALF` to match new road width |
| `src/features/timeline/TimelineRoad.jsx` | Full rewrite — filled shape, spatial width, mask draw animation |
| `src/features/timeline/TimelineNode.jsx` | Add `nodeColorIndex(id)`, use CSS color token |
| `src/styles/globals.css` | Add `--node-c-1` → `--node-c-15` tokens for both modes |

---

### Task 1: Add `sampleSpine()` to `timelinePath.js` + update `ROAD_GLOW_SCREEN_HALF`

**Files:**
- Modify: `src/features/timeline/timelinePath.js`
- Modify: `src/features/timeline/timelineData.js`

No automated tests for geometry. Verify by logging output in dev console.

- [ ] **Step 1: Read both files before editing**

Read `src/features/timeline/timelinePath.js` and `src/features/timeline/timelineData.js` in full. Confirm: `PATH_SEGMENTS` is exported, `cubic` and `cubicDeriv` are module-private helpers, `ROAD_GLOW_SCREEN_HALF = 14` in timelineData.js.

- [ ] **Step 2: Add `sampleSpine(n)` to the end of `timelinePath.js`**

Add this export after the existing exports (after `getPathProgress`):

```js
/**
 * Samples n+1 evenly-spaced points along the full bezier path.
 * Returns an array of { x, y, nx, ny, progress } where:
 *   x, y     — world-space position
 *   nx, ny   — left-perpendicular unit normal (points "left" of direction of travel)
 *   progress — 0 at path start, 1 at path end
 */
export function sampleSpine(n) {
  const totalSegs = PATH_SEGMENTS.length;
  const spine = [];

  for (let i = 0; i <= n; i++) {
    const progress = i / n;

    // Map progress → segment index + local t
    const raw    = progress * totalSegs;
    const segIdx = progress === 1 ? totalSegs - 1 : Math.min(Math.floor(raw), totalSegs - 1);
    const t      = progress === 1 ? 1 : (raw - Math.floor(raw));

    const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = PATH_SEGMENTS[segIdx];

    const x  = cubic(t, x0, cx1, cx2, x1);
    const y  = cubic(t, y0, cy1, cy2, y1);
    const dx = cubicDeriv(t, x0, cx1, cx2, x1);
    const dy = cubicDeriv(t, y0, cy1, cy2, y1);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx  = dx / len;
    const ty  = dy / len;

    // Left-perpendicular normal: rotate tangent 90° counter-clockwise
    spine.push({ x, y, nx: -ty, ny: tx, progress });
  }

  return spine;
}
```

- [ ] **Step 3: Update `ROAD_GLOW_SCREEN_HALF` in `timelineData.js`**

The old value `14` was for the old 28px-wide glow. The new road's outer layer is `4 × 1.44 = 5.76px` screen width, half = `3px`. Update the constant and its comment:

Find:
```js
// Half the road's on-screen glow radius (px). Used to compute dynamic label gap.
// TimelineRoad uses glowWidth = 28/s screen px (half = 14). Label must clear this.
export const ROAD_GLOW_SCREEN_HALF = 14;
```

Replace with:
```js
// Half the road's on-screen outer layer width (px). Used to compute dynamic label gap.
// Outer layer = BASE_W(4) × 1.44 = 5.76px screen width, half = 3px.
export const ROAD_GLOW_SCREEN_HALF = 3;
```

- [ ] **Step 4: Commit**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/features/timeline/timelinePath.js src/features/timeline/timelineData.js && git commit -m "feat(timeline): add sampleSpine(), update ROAD_GLOW_SCREEN_HALF"
```

---

### Task 2: Add 15 node color tokens to `globals.css`

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Read `globals.css` — find the right insertion point**

Read `src/styles/globals.css`. Find the `:root` block and the `[data-consciousness-mode="shay"]` override block. You will add 15 `--node-c-N` variables inside each.

- [ ] **Step 2: Add Naor tokens to `:root`**

Inside the existing `:root { }` block, add after the last existing variable:

```css
  /* ── Node color palette (15 tokens) — Naor mode (cool) ────────────── */
  --node-c-1:  hsl(228, 45%, 62%);
  --node-c-2:  hsl(207, 45%, 58%);
  --node-c-3:  hsl(258, 38%, 62%);
  --node-c-4:  hsl(188, 38%, 52%);
  --node-c-5:  hsl(215, 50%, 65%);
  --node-c-6:  hsl(272, 38%, 60%);
  --node-c-7:  hsl(195, 42%, 55%);
  --node-c-8:  hsl(220, 42%, 60%);
  --node-c-9:  hsl(285, 32%, 62%);
  --node-c-10: hsl(200, 35%, 52%);
  --node-c-11: hsl(178, 35%, 58%);
  --node-c-12: hsl(245, 40%, 62%);
  --node-c-13: hsl(183, 40%, 55%);
  --node-c-14: hsl(300, 28%, 60%);
  --node-c-15: hsl(210, 52%, 60%);
```

- [ ] **Step 3: Add Shay overrides**

Inside the existing `[data-consciousness-mode="shay"] { }` block, add after the last existing variable:

```css
  /* ── Node color palette — Shay mode (warm earth) ─────────────────── */
  --node-c-1:  hsl(14,  55%, 58%);
  --node-c-2:  hsl(35,  60%, 52%);
  --node-c-3:  hsl(345, 45%, 58%);
  --node-c-4:  hsl(25,  40%, 48%);
  --node-c-5:  hsl(48,  58%, 52%);
  --node-c-6:  hsl(5,   50%, 52%);
  --node-c-7:  hsl(28,  65%, 60%);
  --node-c-8:  hsl(15,  55%, 44%);
  --node-c-9:  hsl(42,  45%, 62%);
  --node-c-10: hsl(355, 55%, 62%);
  --node-c-11: hsl(20,  42%, 52%);
  --node-c-12: hsl(58,  38%, 52%);
  --node-c-13: hsl(0,   48%, 58%);
  --node-c-14: hsl(44,  70%, 48%);
  --node-c-15: hsl(12,  32%, 62%);
```

- [ ] **Step 4: Commit**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/styles/globals.css && git commit -m "feat(timeline): add 15-color node palette tokens (naor + shay)"
```

---

### Task 3: Update `TimelineNode.jsx` — hash function + color token

**Files:**
- Modify: `src/features/timeline/TimelineNode.jsx`

- [ ] **Step 1: Read the current file**

Read `src/features/timeline/TimelineNode.jsx`. Find the `nodeStrokeOpacity` / `nodeFillOpacity` helpers at the top. Find the `<circle>` element with `fill="var(--road)"`.

- [ ] **Step 2: Add `nodeColorIndex` after the existing helper functions**

After `nodeFillOpacity`, add:

```js
// Deterministic color index 1–15 from item id.
// Same node always gets the same color regardless of load order.
function nodeColorIndex(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 15) + 1;
}
```

- [ ] **Step 3: Compute `colorVar` inside the component and apply to circle**

In the component body, after the `const r = ...` line, add:

```js
const colorVar = `var(--node-c-${nodeColorIndex(id)})`;
```

Then find the `<circle>` element and update `fill` and `stroke` to use `colorVar`:

```jsx
<circle
  cx={x} cy={y} r={r}
  fill={colorVar}
  fillOpacity={nodeFillOpacity(pathProgress)}
  stroke={colorVar}
  strokeWidth={isClose ? 1.5 : isMid ? 1.8 : 2.5}
  strokeOpacity={nodeStrokeOpacity(isClose ? 'close' : isMid ? 'mid' : 'main', pathProgress)}
/>
```

- [ ] **Step 4: Start dev server and verify**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Open `/timeline`. Confirm: nodes have different colors, colors look warm (Shay) or cool (Naor) depending on mode, switching mode updates all node colors.

- [ ] **Step 5: Commit**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/features/timeline/TimelineNode.jsx && git commit -m "feat(timeline): deterministic 15-color palette on nodes"
```

---

### Task 4: Rewrite `TimelineRoad.jsx` — filled shape + spatial width variation

**Files:**
- Modify: `src/features/timeline/TimelineRoad.jsx`

This is the largest task. Read the spec at `docs/superpowers/specs/2026-04-22-timeline-road-v2-node-colors.md` for full context.

- [ ] **Step 1: Read the current `TimelineRoad.jsx` in full**

Read `src/features/timeline/TimelineRoad.jsx`. Note: 3 `motion.path` stroke layers, `useTransform` for counter-scaling, `useEffect` for `isEntering` draw animation. All of this will be replaced.

- [ ] **Step 2: Replace the entire file**

Replace `src/features/timeline/TimelineRoad.jsx` with:

```jsx
// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis as 3 filled SVG shapes with spatially varying width.
// Width varies along the path using overlapping sine waves at irrational frequencies.
// A slow phase drift makes the thick/thin spots migrate over time.
// All path updates are imperative (direct setAttribute) — no React state, no re-renders.

import { useRef, useEffect } from 'react';
import { sampleSpine, buildPathString } from './timelinePath.js';
import { ZOOM_MIN } from './timelineData.js';

// Inner layer screen width (px). Outer layers are 1.2× and 1.44× wider.
const BASE_W = 4;

// Layers: inner → outer. Outer extends beyond inner creating visible depth.
const LAYERS = [
  { factor: 1.44, opacity: 0.10 }, // outermost — soft halo
  { factor: 1.20, opacity: 0.28 }, // mid
  { factor: 1.00, opacity: 0.65 }, // inner — brightest
];

// 150 sample points along the bezier — precomputed once, static
const SPINE = sampleSpine(150);

// Mask stroke must be wide enough to cover the outer road layer at minimum zoom.
// Outer layer max world-width = BASE_W * 1.44 * 1.65 / ZOOM_MIN ≈ 80 — use 250 for safety.
const MASK_STROKE_W = 250;

const DRAW_DURATION = 1800; // ms — must match TimelineNode
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Spatial width at a given path position + phase.
// Three sine waves at irrational frequency ratios → never repeats visually.
function spatialWidth(progress, phase) {
  return BASE_W * (
    1
    + 0.35 * Math.sin(progress * 4.7  * Math.PI + phase)
    + 0.20 * Math.sin(progress * 11.3 * Math.PI + phase * 1.7)
    + 0.10 * Math.sin(progress * 23.7 * Math.PI + phase * 2.3)
  );
}

// Build a filled SVG path string for one layer.
// top side = spine + normal × half_w, bottom side = spine − normal × half_w.
function buildFilledPath(factor, phase, worldScale) {
  const top = [];
  const bot = [];

  for (const { x, y, nx, ny, progress } of SPINE) {
    const hw = spatialWidth(progress, phase) * factor / (2 * worldScale);
    top.push(`${(x + nx * hw).toFixed(2)},${(y + ny * hw).toFixed(2)}`);
    bot.push(`${(x - nx * hw).toFixed(2)},${(y - ny * hw).toFixed(2)}`);
  }

  return `M ${top.join(' L ')} L ${bot.reverse().join(' L ')} Z`;
}

// Reusable path string for the mask (static path — only stroke-dashoffset animates)
const MASK_PATH_D = buildPathString();

export function TimelineRoad({ worldScale, isEntering }) {
  // One ref per layer — direct DOM updates bypass React for 60fps animation
  const layerRefs = [useRef(null), useRef(null), useRef(null)];
  const maskRef   = useRef(null);

  const phaseRef      = useRef(0);
  const worldScaleRef = useRef(worldScale.get());

  // Imperative path update — called from both phase drift and worldScale subscriber
  function updateLayers(scale, phase) {
    LAYERS.forEach(({ factor }, i) => {
      if (layerRefs[i].current) {
        layerRefs[i].current.setAttribute('d', buildFilledPath(factor, phase, scale));
      }
    });
  }

  // Phase drift (slow temporal movement) + worldScale subscription
  useEffect(() => {
    let raf;

    // Subscribe to zoom changes — rebuild geometry when scale changes
    const unsub = worldScale.on('change', s => {
      worldScaleRef.current = s;
      updateLayers(s, phaseRef.current);
    });

    // RAF loop — advances phase and rebuilds paths every frame
    function tick() {
      phaseRef.current += 0.0004;
      updateLayers(worldScaleRef.current, phaseRef.current);
      raf = requestAnimationFrame(tick);
    }

    // Initial render
    updateLayers(worldScaleRef.current, phaseRef.current);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [worldScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entry draw animation — animates the mask path's strokeDashoffset
  useEffect(() => {
    const path = maskRef.current;
    if (!path) return;

    if (!isEntering) {
      path.style.strokeDasharray  = '';
      path.style.strokeDashoffset = '0';
      path.style.transition       = 'none';
      return;
    }

    const totalLength = path.getTotalLength();
    path.style.strokeDasharray  = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;
    path.style.transition       = 'none';

    // Force reflow — ensures hidden state is painted before transition starts
    path.getBoundingClientRect();

    path.style.transition       = `stroke-dashoffset ${DRAW_DURATION}ms ${DRAW_EASING}`;
    path.style.strokeDashoffset = '0';
  }, [isEntering]);

  return (
    <g>
      <defs>
        {/*
          Draw mask: a wide stroke that reveals the filled layers as it draws.
          strokeDashoffset animates from totalLength → 0, revealing content left-to-right
          along the path. Only active during isEntering — mask removed after animation.
        */}
        <mask id="tl-road-mask">
          <path
            ref={maskRef}
            d={MASK_PATH_D}
            stroke="white"
            strokeWidth={MASK_STROKE_W}
            fill="none"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      {/* Filled layers — rendered outermost first (painter's order) */}
      <g mask={isEntering ? 'url(#tl-road-mask)' : undefined}>
        {LAYERS.map(({ opacity }, i) => (
          <path
            key={i}
            ref={layerRefs[i]}
            fill={`var(--road)`}
            fillOpacity={opacity}
            stroke="none"
          />
        ))}
      </g>
    </g>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Open `/timeline`. Check:
- Road renders as a filled band (not a line)
- Width visibly varies along the path — some sections thicker, some thinner
- All 3 layers visible: soft outer halo, mid body, bright inner core
- Slowly watch the path — thick/thin spots should drift very subtly over time
- Zoom in/out: road scales correctly (stays same screen width)
- Fresh visit (no sessionStorage): road draws itself from start to end over ~1.8s
- Hard-refresh and revisit: draw animation plays again

- [ ] **Step 4: Commit**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && git add src/features/timeline/TimelineRoad.jsx && git commit -m "feat(timeline): rebuild road as filled shape with spatial width variation"
```

---

### Task 5: Lint + build check

- [ ] **Step 1: Run lint**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint 2>&1 | grep -E "TimelineRoad|TimelineNode|timelinePath|timelineData|globals"
```

Expected: no errors in the 5 changed files. Pre-existing errors in other files are not your concern.

- [ ] **Step 2: Run build**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Commit if any lint fixes were needed**

Only commit if you had to fix something. Otherwise no commit needed here.
