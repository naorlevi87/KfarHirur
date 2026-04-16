# Timeline Painterly Entrance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the timeline path look hand-drawn (rough brushstroke, ink-splat nodes) and animate a brushstroke entrance on fresh load — path draws itself, nodes appear as the brush passes each one.

**Architecture:** `timelinePath.js` gains a `getPathProgress()` helper. `TimelineRoad` adds texture layers and drives the `strokeDashoffset` draw animation. `TimelineNode` replaces perfect circles with deterministic organic blobs and delays its appearance based on `pathProgress`. `TimelineFeature` orchestrates the entrance flag and passes `pathProgress` per item.

**Tech Stack:** React 19, Framer Motion (`animate`, `useMotionValue`), SVG (`strokeDashoffset`, `feTurbulence`), CSS animation for fade.

---

## File Map

| File | Role |
|---|---|
| `src/features/timeline/timelinePath.js` | Add `getPathProgress(dateStr) → 0..1` |
| `src/features/timeline/TimelineRoad.jsx` | Texture layers + draw animation |
| `src/features/timeline/TimelineNode.jsx` | Blob shape + delayed pop-in |
| `src/features/timeline/TimelineFeature.jsx` | Pass `isEntering` + `pathProgress` per item; clean up old CSS animation |
| `src/features/timeline/TimelineFeature.css` | Remove `tl-enter` / `tl-feature--restore` |

---

## Task 1: Add `getPathProgress` to `timelinePath.js`

**Files:**
- Modify: `src/features/timeline/timelinePath.js`

Maps a date string to a 0–1 fraction of total path length (counting segments proportionally by their date span). This is the value each node uses to calculate its entrance delay.

- [ ] **Step 1: Add the helper at the bottom of `timelinePath.js`**

```js
/**
 * Returns a 0–1 fraction representing where along the full path this date falls.
 * 0 = start of path (oldest date), 1 = end (newest date).
 * Used by TimelineNode to compute entrance animation delay.
 */
export function getPathProgress(dateStr) {
  const totalStart = toMonths(SEGMENT_DATES[0][0]);
  const totalEnd   = toMonths(SEGMENT_DATES[SEGMENT_DATES.length - 1][1]);
  const totalSpan  = totalEnd - totalStart;
  const target     = Math.min(totalEnd, Math.max(totalStart, toMonths(dateStr)));
  return (target - totalStart) / totalSpan;
}
```

- [ ] **Step 2: Verify manually**

Open browser console on the timeline page and run:
```js
// After importing — just sanity check the range
// First item date should be near 0, last item date should be near 1
```
No automated test suite — visual verification in Task 5 is sufficient.

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/timelinePath.js
git commit -m "feat(timeline): add getPathProgress helper for entrance animation timing"
```

---

## Task 2: Pass `isEntering` and `pathProgress` from `TimelineFeature`

**Files:**
- Modify: `src/features/timeline/TimelineFeature.jsx`
- Modify: `src/features/timeline/TimelineFeature.css`

`TimelineFeature` already distinguishes "restore" from "fresh entry" via `sessionStorage`. We use that to set `isEntering`, and compute `pathProgress` per item from `getPathProgress`.

- [ ] **Step 1: Import `getPathProgress`**

In `TimelineFeature.jsx`, update the import from `timelinePath`:

```js
import { clampPan, assignLabelFlips } from './timelineUtils.js';
import { getPathProgress } from './timelinePath.js';
```

- [ ] **Step 2: Replace `isRestore` state with `isEntering`**

The current code has `isRestore` state. Replace it with `isEntering` (inverted meaning — cleaner at the call sites):

```js
// Replace:
const [isRestore, setIsRestore] = useState(false);
// With:
const [isEntering, setIsEntering] = useState(false);
```

Then in the `useEffect` that reads `sessionStorage`:
```js
if (saved) {
  // ... existing restore logic ...
  setIsEntering(false); // eslint-disable-line react-hooks/set-state-in-effect
} else {
  // ... existing entrance logic (animate worldScale etc) ...
  setIsEntering(true);  // eslint-disable-line react-hooks/set-state-in-effect
}
```

- [ ] **Step 3: Pass props to `TimelineRoad` and `TimelineNode`**

```jsx
<TimelineRoad worldScale={worldScale} isEntering={isEntering} />

{visibleItems.map(item => (
  <TimelineNode
    key={item.id}
    item={item}
    worldScale={worldScale}
    labelFlip={labelFlips.get(item.id) ?? false}
    onTap={handleNodeTap}
    isEntering={isEntering}
    pathProgress={getPathProgress(item.content?.date ?? item.date ?? '2020-01')}
  />
))}
```

Note: `item.content.date` or `item.date` — check actual data shape. In `useTimelineItems`, the date used for `evaluateAtDate` is `item.date`. Use that:

```jsx
pathProgress={getPathProgress(item.date ?? '2020-01')}
```

- [ ] **Step 4: Remove old CSS entrance animation from `TimelineFeature.css`**

Remove these blocks entirely from `src/features/timeline/TimelineFeature.css`:

```css
/* DELETE these: */
animation: tl-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;

@keyframes tl-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.tl-feature--restore {
  animation: none;
}
```

- [ ] **Step 5: Remove the `isRestore` class from the JSX div**

The div currently has:
```jsx
<div className={`tl-feature${isRestore ? ' tl-feature--restore' : ''}`} data-mode={mode}>
```

Replace with:
```jsx
<div className="tl-feature" data-mode={mode}>
```

- [ ] **Step 6: Commit**

```bash
git add src/features/timeline/TimelineFeature.jsx src/features/timeline/TimelineFeature.css
git commit -m "feat(timeline): wire isEntering + pathProgress for painterly entrance"
```

---

## Task 3: Brushstroke draw animation in `TimelineRoad`

**Files:**
- Modify: `src/features/timeline/TimelineRoad.jsx`

Animate `strokeDashoffset` from full path length → 0 on fresh entry. Add texture layers. Remove/reduce the glow (looks digital).

- [ ] **Step 1: Add refs and animation logic**

Replace current `TimelineRoad.jsx` entirely:

```jsx
// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis. Stroke width is counter-scaled to stay fixed on screen.
// On fresh entry (isEntering=true), path draws itself via strokeDashoffset animation.
// Painterly layers: core stroke + pressure variance + fiber bristles. No glow.

import { useRef, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import { buildPathString } from './timelinePath.js';

const CORE_SCREEN_WIDTH  = 7;
const THIN_SCREEN_WIDTH  = 2;
const FIBER_SCREEN_WIDTH = 1;
const PRESSURE_WIDTH     = 11; // wider layer for brush pressure illusion

// Brushstroke draw timing
const DRAW_DURATION = 1200; // ms
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function TimelineRoad({ worldScale, isEntering }) {
  const coreRef     = useRef(null);
  const thinRef     = useRef(null);
  const fiberRef    = useRef(null);
  const pressureRef = useRef(null);

  const coreWidth     = useTransform(worldScale, s => CORE_SCREEN_WIDTH  / s);
  const thinWidth     = useTransform(worldScale, s => THIN_SCREEN_WIDTH  / s);
  const fiberWidth    = useTransform(worldScale, s => FIBER_SCREEN_WIDTH / s);
  const pressureWidth = useTransform(worldScale, s => PRESSURE_WIDTH     / s);

  const d = buildPathString();

  useEffect(() => {
    const paths = [coreRef, thinRef, fiberRef, pressureRef]
      .map(r => r.current)
      .filter(Boolean);
    if (!paths.length) return;

    if (!isEntering) {
      // Restore or reduced-motion: show immediately
      paths.forEach(p => {
        p.style.strokeDasharray  = 'none';
        p.style.strokeDashoffset = '0';
        p.style.transition       = 'none';
      });
      return;
    }

    const totalLength = paths[0].getTotalLength();

    paths.forEach(p => {
      p.style.strokeDasharray  = `${totalLength}`;
      p.style.strokeDashoffset = `${totalLength}`;
      p.style.transition       = 'none';
    });

    // Force reflow so the initial hidden state is painted before animating
    paths[0].getBoundingClientRect();

    paths.forEach(p => {
      p.style.transition       = `stroke-dashoffset ${DRAW_DURATION}ms ${DRAW_EASING}`;
      p.style.strokeDashoffset = '0';
    });
  }, [isEntering]);

  return (
    <g>
      <defs>
        <filter id="tl-pencil" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.012" numOctaves="4" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="tl-pencil2" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.009" numOctaves="3" seed="27" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* Pressure variance layer — slightly wider, different seed, gives uneven width feel */}
      <motion.path
        ref={pressureRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: pressureWidth }}
        strokeLinecap="round" opacity={0.09}
        filter="url(#tl-pencil2)"
      />

      {/* Core stroke */}
      <motion.path
        ref={coreRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: coreWidth }}
        strokeLinecap="round" opacity={0.50}
        filter="url(#tl-pencil)"
      />

      {/* Thin overlay — texture variance */}
      <motion.path
        ref={thinRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: thinWidth }}
        strokeLinecap="round" opacity={0.26}
        filter="url(#tl-pencil)"
      />

      {/* Fiber layer — bristle escape at stroke edges */}
      <motion.path
        ref={fiberRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: fiberWidth }}
        strokeLinecap="round" opacity={0.18}
        strokeDasharray="2 14"
        filter="url(#tl-pencil)"
      />
    </g>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Navigate to the timeline. On fresh load you should see the path draw itself from start to end over ~1.2s. Navigate away and back — same. Open an item and close — no animation.

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelineRoad.jsx
git commit -m "feat(timeline): brushstroke draw animation + painterly texture layers"
```

---

## Task 4: Organic blob nodes + delayed pop-in in `TimelineNode`

**Files:**
- Modify: `src/features/timeline/TimelineNode.jsx`

Replace `<circle>` dot with a deterministic organic blob. Add `opacity`/`transform` pop-in timed to path draw progress.

- [ ] **Step 1: Add blob generator function**

Add this above the component, after the imports:

```js
// Generates a deterministic organic blob path around (cx, cy) with radius r.
// seed is a stable integer derived from item.id — same node always same shape.
// Returns an SVG path `d` string.
function blobPath(cx, cy, r, seed) {
  const POINTS  = 8;
  const WOBBLE  = 0.32;
  const golden  = 2.399; // golden angle radians

  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    const angle  = (i / POINTS) * Math.PI * 2;
    const wobble = 1 + WOBBLE * Math.sin(seed + i * golden);
    const pr     = r * wobble;
    pts.push([cx + Math.cos(angle) * pr, cy + Math.sin(angle) * pr]);
  }

  // Smooth closed curve through points using quadratic bezier midpoints
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const mid  = [(curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2];
    if (i === 0) {
      d += `M ${mid[0]} ${mid[1]} `;
    }
    d += `Q ${next[0]} ${next[1]} ${[(next[0] + pts[(i + 2) % n][0]) / 2, (next[1] + pts[(i + 2) % n][1]) / 2].join(' ')} `;
  }
  return d + 'Z';
}

// Stable integer seed from item id string
function idToSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
```

- [ ] **Step 2: Add entrance animation ref and useEffect**

In the component, add a ref for the node group and a useEffect for pop-in:

```js
// Add these constants at the top of the file:
const DRAW_DURATION      = 1200; // ms — must match TimelineRoad
const NODE_DELAY_OFFSET  = 100;  // ms after brush passes
const NODE_APPEAR_DUR    = 200;  // ms

// Inside the component, after existing refs:
const nodeGroupRef = useRef(null);

useEffect(() => {
  const el = nodeGroupRef.current;
  if (!el) return;

  if (!isEntering) {
    el.style.opacity   = '1';
    el.style.transform = 'none';
    el.style.transition = 'none';
    return;
  }

  // Start hidden and scaled down
  el.style.opacity    = '0';
  el.style.transform  = `translate(${x}px, ${y}px) scale(0) translate(${-x}px, ${-y}px)`;
  el.style.transition = 'none';

  const delay = pathProgress * DRAW_DURATION + NODE_DELAY_OFFSET;

  const timer = setTimeout(() => {
    el.style.transition = `opacity ${NODE_APPEAR_DUR}ms cubic-bezier(0, 0, 0.2, 1), transform ${NODE_APPEAR_DUR}ms cubic-bezier(0, 0, 0.2, 1)`;
    el.style.opacity    = '1';
    el.style.transform  = 'none';
  }, delay);

  return () => clearTimeout(timer);
}, [isEntering, pathProgress, x, y]);
```

- [ ] **Step 3: Update component signature and render**

Update `TimelineNode` to accept `isEntering` and `pathProgress`:

```js
export function TimelineNode({ item, worldScale, labelFlip = false, onTap, isEntering = false, pathProgress = 0 }) {
```

Replace the two `<circle>` elements (glow + dot) with a blob:

```jsx
{/* Organic blob — deterministic shape per item, no glow */}
<path
  d={blobPath(x, y, r, idToSeed(String(id)))}
  fill="var(--page-bg)"
  stroke="var(--road)"
  strokeWidth={isSub ? 1.5 : 2.5}
  strokeOpacity={isSub ? 0.38 : 0.60}
  filter="url(#tl-pencil)"
/>
```

Wrap the existing `<g ref={groupRef}>` so the entrance animation has its own ref:

```jsx
return (
  <g ref={nodeGroupRef}>
    <g
      ref={groupRef}
      className={`tl-node tl-node--${isSub ? 'sub' : 'main'}`}
      data-id={id}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <path
        d={blobPath(x, y, r, idToSeed(String(id)))}
        fill="var(--page-bg)"
        stroke="var(--road)"
        strokeWidth={isSub ? 1.5 : 2.5}
        strokeOpacity={isSub ? 0.38 : 0.60}
        filter="url(#tl-pencil)"
      />
      {/* labels unchanged */}
      <text ref={labelRef} ... />
      <text ref={tagRef}   ... />
    </g>
  </g>
);
```

Note: `filter="url(#tl-pencil)"` references the filter defined in `TimelineRoad`. Since both render inside the same SVG, this works. No need to redefine it.

- [ ] **Step 4: Verify in browser**

Fresh load: path draws, nodes appear one by one with ~100ms offset after the brush passes. The nodes should look like irregular ink blobs, not perfect circles. No glow. No bounce.

Navigate to an item and back: nodes appear instantly, no animation.

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline/TimelineNode.jsx
git commit -m "feat(timeline): organic blob nodes + staggered entrance pop-in"
```

---

## Task 5: Check `item.date` field and `prefers-reduced-motion`

**Files:**
- Modify: `src/features/timeline/TimelineFeature.jsx` (minor)
- Modify: `src/features/timeline/TimelineRoad.jsx` (minor)

- [ ] **Step 1: Verify item date field**

Open `src/data/timeline/useTimelineItems.js`. Find what field holds the date string passed to `evaluateAtDate`. It is likely `item.date`. Confirm, then in `TimelineFeature.jsx` make sure the `pathProgress` prop uses that field:

```jsx
pathProgress={getPathProgress(item.date ?? '2020-01')}
```

- [ ] **Step 2: Respect `prefers-reduced-motion`**

In `TimelineFeature.jsx`, when setting `isEntering`:

```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In the useEffect that handles sessionStorage:
} else {
  const { x: tx, y: ty } = centeredPan(vpW, vpH, INITIAL_SCALE);
  const { x: sx, y: sy } = centeredPan(vpW, vpH, ENTRY_SCALE);
  worldX.set(sx);
  worldY.set(sy);
  worldScale.set(ENTRY_SCALE);
  setCurrentScale(ENTRY_SCALE); // eslint-disable-line react-hooks/set-state-in-effect

  if (prefersReduced) {
    // Show immediately, no animation
    worldX.set(tx);
    worldY.set(ty);
    worldScale.set(INITIAL_SCALE);
    setCurrentScale(INITIAL_SCALE); // eslint-disable-line react-hooks/set-state-in-effect
    setIsEntering(false);           // eslint-disable-line react-hooks/set-state-in-effect
  } else {
    animate(worldScale, INITIAL_SCALE, SPRING_ENTER);
    animate(worldX,     tx,            SPRING_ENTER);
    animate(worldY,     ty,            SPRING_ENTER);
    setIsEntering(true); // eslint-disable-line react-hooks/set-state-in-effect
  }
}
```

- [ ] **Step 3: Lint + build check**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Fix any errors before proceeding.

- [ ] **Step 4: Final visual review checklist**

- [ ] Fresh timeline load: path draws ~1.2s, nodes pop in as brush passes
- [ ] Nodes look like irregular ink blobs, not circles
- [ ] No glow halos around nodes
- [ ] Path looks rough/matte, not luminescent
- [ ] Navigate away (menu) and back: animation plays again
- [ ] Open item → back: no animation, position restored
- [ ] Zoom in/out: nodes stay organic, path stays rough

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline/TimelineFeature.jsx
git commit -m "feat(timeline): prefers-reduced-motion + item date field guard"
```
