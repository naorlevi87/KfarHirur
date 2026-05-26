# Timeline Road & Nodes Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pixelated SVG-filter brushstroke road and blob nodes with a clean 3-layer stroke road and simple circles with tier+time opacity hierarchy.

**Architecture:** Two files only — `TimelineRoad.jsx` (road rendering) and `TimelineNode.jsx` (node rendering). No changes to data, state, CSS, or any other file. The counter-scaling system, entry animation, and label placement algorithm all stay exactly as-is.

**Tech Stack:** React 19, Framer Motion (`useTransform`, `motion.path`), SVG

---

## File Map

| File | Change |
|---|---|
| `src/features/timeline/TimelineRoad.jsx` | Rewrite — remove filters, replace 4 layers with 3 clean layers |
| `src/features/timeline/TimelineNode.jsx` | Replace `blobPath` / `idToSeed` with `<circle>`, update stroke opacity formula |

---

### Task 1: Rewrite TimelineRoad.jsx

**Files:**
- Modify: `src/features/timeline/TimelineRoad.jsx`

No automated tests for SVG rendering. Verify visually in dev server.

- [ ] **Step 1: Read the current file**

Read `src/features/timeline/TimelineRoad.jsx` in full before editing. Confirm the current refs: `coreRef`, `thinRef`, `fiberRef`, `pressureRef` and the `useEffect` that drives the draw animation on all four.

- [ ] **Step 2: Replace the file with the new implementation**

Replace the entire file content with:

```jsx
// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis. Stroke width is counter-scaled to stay fixed on screen.
// On fresh entry (isEntering=true), path draws itself via strokeDashoffset animation.
// Three clean stroke layers — no SVG filters (filters cause pixelation during zoom).

import { useRef, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import { buildPathString } from './timelinePath.js';

// Screen widths (divided by worldScale to stay constant on screen)
const BASE_SCREEN_WIDTH = 14;  // wide, low opacity — body/depth
const CORE_SCREEN_WIDTH = 6;   // medium — main visible stroke
const EDGE_SCREEN_WIDTH = 1.5; // thin — crisp centerline

// Brushstroke draw timing
const DRAW_DURATION = 1800; // ms — must match TimelineNode
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Irregular dash on core layer — long segments with short gaps.
// Reads as organic width variance, not as breaks.
const CORE_DASH = '90 0 60 8 80 5 50 10 70 6';

export function TimelineRoad({ worldScale, isEntering }) {
  const baseRef = useRef(null);
  const coreRef = useRef(null);
  const edgeRef = useRef(null);

  const baseWidth = useTransform(worldScale, s => BASE_SCREEN_WIDTH / s);
  const coreWidth = useTransform(worldScale, s => CORE_SCREEN_WIDTH / s);
  const edgeWidth = useTransform(worldScale, s => EDGE_SCREEN_WIDTH / s);

  const d = buildPathString();

  useEffect(() => {
    const paths = [baseRef, coreRef, edgeRef]
      .map(r => r.current)
      .filter(Boolean);
    if (!paths.length) return;

    if (!isEntering) {
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
      {/* Base — wide, very low opacity, gives body and subtle depth */}
      <motion.path
        ref={baseRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: baseWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.10}
      />

      {/* Core — main visible stroke, irregular dash creates pressure-variance feel */}
      <motion.path
        ref={coreRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: coreWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.48}
        strokeDasharray={CORE_DASH}
      />

      {/* Edge — thin crisp centerline */}
      <motion.path
        ref={edgeRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: edgeWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.72}
      />
    </g>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Open `/timeline`. Check:
- Road draws itself on entry (brushstroke animation intact)
- No pixelation at any zoom level
- Road has subtle depth (three visible layers)
- Core dash reads as organic width variation, not visible breaks
- Zoom in/out: all three layers scale cleanly

- [ ] **Step 4: Commit**

```bash
git add src/features/timeline/TimelineRoad.jsx
git commit -m "refactor(timeline): replace filter-based brushstroke with clean 3-layer road"
```

---

### Task 2: Rewrite TimelineNode.jsx — circles + tier×time opacity

**Files:**
- Modify: `src/features/timeline/TimelineNode.jsx`

- [ ] **Step 1: Read the current file**

Read `src/features/timeline/TimelineNode.jsx` in full. Note: `blobPath()`, `idToSeed()`, the `<path>` element that renders the blob, and the current `strokeOpacity` / `fillOpacity` values.

- [ ] **Step 2: Remove blobPath and idToSeed, add opacity helpers**

Replace the two helper functions and the constants block. The `blobPath` and `idToSeed` functions are deleted entirely. Add an opacity calculator:

At the top of the file, after the imports, replace the existing constants + helpers with:

```jsx
// Node circle sizes by tier (screen px, counter-scaled)
const MAIN_R  = 8;
const MID_R   = 7;
const CLOSE_R = 6;

// Label font sizes by tier (screen px)
const LABEL_MAIN  = 16;
const LABEL_MID   = 14;
const LABEL_CLOSE = 13;
const TAG_SIZE    = 11;

const H_GAP  = 3;
const TAP_R  = 22;
const V_SCALE = 11;

const DRAW_DURATION     = 1800;
const NODE_DELAY_OFFSET = 150;
const NODE_APPEAR_DUR   = 200;

// Base stroke opacity by tier
const TIER_OPACITY = { main: 0.65, mid: 0.42, close: 0.28 };

// Blend tier hierarchy with time position (pathProgress 0=old, 1=new).
// Older events are slightly more faded; newer events more vivid.
function nodeStrokeOpacity(tier, pathProgress) {
  const base = TIER_OPACITY[tier];
  return base * (0.65 + 0.35 * pathProgress);
}

function nodeFillOpacity(pathProgress) {
  return 0.06 + 0.10 * pathProgress;
}
```

- [ ] **Step 3: Update the JSX — replace blob `<path>` with `<circle>`**

In the `return (...)` of `TimelineNode`, find the `<path>` element that renders the blob:

```jsx
<path
  d={blobPath(x, y, r, idToSeed(String(id)))}
  fill="var(--page-bg)"
  stroke="var(--road)"
  strokeWidth={isSub ? 1.5 : 2.5}
  strokeOpacity={isSub ? 0.38 : 0.60}
/>
```

Replace it with:

```jsx
<circle
  cx={x} cy={y} r={r}
  fill="var(--page-bg)"
  fillOpacity={nodeFillOpacity(pathProgress)}
  stroke="var(--road)"
  strokeWidth={isClose ? 1.5 : isMid ? 1.8 : 2.5}
  strokeOpacity={nodeStrokeOpacity(isClose ? 'close' : isMid ? 'mid' : 'main', pathProgress)}
/>
```

- [ ] **Step 4: Verify in dev server**

Open `/timeline`. Check:
- Nodes are clean circles (no blobs)
- Main nodes (tier-0) are clearly more prominent than mid/close nodes
- Older nodes (left side of timeline, pathProgress ≈ 0) are slightly more faded than newer ones
- Effect is subtle — not jarring
- Zoom in/out: circles counter-scale correctly, labels still position correctly
- Entry animation: nodes still appear progressively as the road draws

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline/TimelineNode.jsx
git commit -m "refactor(timeline): replace blob nodes with circles, add tier×time opacity hierarchy"
```

---

### Task 3: Lint + Build check

- [ ] **Step 1: Run lint**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
```

Expected: 0 errors. Fix any that appear before proceeding.

- [ ] **Step 2: Run build**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Expected: build completes with no errors.
