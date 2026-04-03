# Timeline UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continuous zoom with 3 item-visibility levels, dynamic preview positioning beside the axis (never covering it), and scale-aware label gap.

**Architecture:** Extract shared normal-vector logic to `timelineUtils.js`. `TimelineCanvas` owns all zoom input (wheel + pinch). `TimelineFeature` owns zoom state and pan math. `TimelinePreview` renders at fixed viewport center — the camera pans to put the preview world-point there.

**Tech Stack:** React 19, Framer Motion (`useMotionValue`, `animate`, `useTransform`), SVG

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/features/timeline/timelineUtils.js` | **Create** | `getOutwardNormal(x, y, tx, ty)` — shared by node labels and preview positioning |
| `src/features/timeline/timelineData.js` | **Modify** | Add zoom + preview constants; add visibility tier constants |
| `src/features/timeline/TimelineNode.jsx` | **Modify** | Use `getOutwardNormal` from utils; dynamic label gap via ref update in existing useEffect |
| `src/features/timeline/TimelineCanvas.jsx` | **Modify** | Add wheel + pinch handlers; call `onZoom(newScale, originX, originY)` prop |
| `src/features/timeline/TimelineFeature.jsx` | **Modify** | Remove `zoomLevel` state; subscribe to `worldScale` for item filtering; zoom handler with clamp; update pan target to preview world-center; add +/− buttons |
| `src/features/timeline/TimelinePreview.jsx` | **Modify** | Always render at viewport center — remove dynamic left/top calc |
| `src/features/timeline/TimelineFeature.css` | **Modify** | Add `.tl-zoom-btns` styles |

---

## Task 1: Create `timelineUtils.js` — shared normal vector util

**Files:**
- Create: `src/features/timeline/timelineUtils.js`

The `autoLabelOffset` function in `TimelineNode.jsx` picks the outward-facing perpendicular to the bezier tangent (away from path center). Extract this into a standalone util so both label and preview positioning use the same logic.

- [ ] **Step 1: Create the file**

```js
// src/features/timeline/timelineUtils.js
// Shared geometry helpers for timeline label and preview positioning.

const PATH_CENTER_X = 1300;
const PATH_CENTER_Y = 1000;

/**
 * Returns the unit normal vector (nx, ny) perpendicular to the bezier tangent
 * at the node, pointing away from the path interior.
 * tx/ty: normalized tangent at the node position.
 * x/y: node world position.
 */
export function getOutwardNormal(x, y, tx, ty) {
  if (Math.abs(tx) < 0.001 && Math.abs(ty) < 0.001) {
    return { nx: 0, ny: 1 };
  }

  // Two perpendicular options
  const lx = -ty, ly =  tx;
  const rx =  ty, ry = -tx;

  // Pick the one that points away from path center
  const awayX = x - PATH_CENTER_X;
  const awayY = y - PATH_CENTER_Y;
  const dotL  = lx * awayX + ly * awayY;
  const dotR  = rx * awayX + ry * awayY;

  return dotL >= dotR ? { nx: lx, ny: ly } : { nx: rx, ny: ry };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/timeline/timelineUtils.js
git commit -m "feat(timeline): add timelineUtils with getOutwardNormal"
```

---

## Task 2: Add constants to `timelineData.js`

**Files:**
- Modify: `src/features/timeline/timelineData.js`

- [ ] **Step 1: Update the file**

```js
// src/features/timeline/timelineData.js
// Canvas dimensions and shared constants for the timeline coordinate system.
// Items are fetched from Supabase via useTimelineItems() in src/data/timeline/.

export const CANVAS_W = 3000;
export const CANVAS_H = 2200;

// ── Zoom ──────────────────────────────────────────────────────────────────────
export const ZOOM_MIN     = 0.12;   // most zoomed out (full overview)
export const ZOOM_MAX     = 2.5;    // most zoomed in
export const ZOOM_STEP    = 1.35;   // multiplier per +/− button press
export const INITIAL_SCALE = 0.22;  // starting scale

// ── Item visibility tiers ─────────────────────────────────────────────────────
// Items with min_scale <= current scale are visible.
// SCALE_MID / SCALE_CLOSE match the min_scale values stored in Supabase.
export const SCALE_ALWAYS = 0;      // main milestones — always visible
export const SCALE_MID    = 0.45;   // sub-items — visible at mid zoom
export const SCALE_CLOSE  = 0.9;    // detail items — visible only close up

// ── Preview positioning ───────────────────────────────────────────────────────
// World-unit distance from node center to preview center (along outward normal).
// Tune this if preview feels too far or clips viewport edge on small screens.
export const PREVIEW_OFFSET = 200;

// ── Label geometry ────────────────────────────────────────────────────────────
// Half the road's on-screen stroke width (px). Used to compute dynamic label gap.
// TimelineRoad uses CORE_SCREEN_WIDTH = 7; half = 3.5. Add glow = 14 half-width.
export const ROAD_GLOW_SCREEN_HALF = 14;
```

- [ ] **Step 2: Commit**

```bash
git add src/features/timeline/timelineData.js
git commit -m "feat(timeline): add zoom, visibility tier, and preview constants"
```

---

## Task 3: Update `TimelineNode.jsx` — shared normal + dynamic label gap

**Files:**
- Modify: `src/features/timeline/TimelineNode.jsx`

Replace the inline `autoLabelOffset` with `getOutwardNormal` from utils. Move label position updates into the existing `useEffect` so the gap adjusts as `worldScale` changes.

- [ ] **Step 1: Rewrite the file**

```jsx
// src/features/timeline/TimelineNode.jsx
// Single timeline node. Counter-scaled via SVG transform so size stays fixed on
// screen regardless of canvas zoom. Label offset is perpendicular to the bezier
// tangent — uses getOutwardNormal to stay on the outward side of the axis.
// Label gap is dynamic so the label clears the road glow at all zoom levels.

import { useEffect, useRef } from 'react';
import { getOutwardNormal } from './timelineUtils.js';
import { ROAD_GLOW_SCREEN_HALF } from './timelineData.js';

const BASE_R     = 7;
const BASE_GLOW  = 16;
const SMALL_R    = 5;
const SMALL_GLOW = 12;

const LABEL_BASE  = 14;
const LABEL_LARGE = 16;
const LABEL_SMALL = 13;
const LABEL_SUB   = 11;
const TAG_SIZE    = 10;

// Base gap in screen px from node edge to label. Dynamic portion added per scale.
const LABEL_GAP_BASE = 22;

function getLabelAnchor(nx) {
  if (Math.abs(nx) < 0.3) return 'middle';
  return nx > 0 ? 'start' : 'end';
}

function getLabelBaseline(nx, ny) {
  if (Math.abs(ny) >= Math.abs(nx)) return ny > 0 ? 'hanging' : 'auto';
  return 'middle';
}

export function TimelineNode({ item, worldScale, onTap }) {
  const { id, x, y, tx = 1, ty = 0, minScale = 0, content } = item;
  const isSub = minScale > 0;

  const r        = isSub ? SMALL_R    : BASE_R;
  const glowR    = isSub ? SMALL_GLOW : BASE_GLOW;
  const labelSize = isSub ? LABEL_SUB
    : minScale === 0 ? LABEL_BASE
    : LABEL_SMALL;

  const { nx, ny } = getOutwardNormal(x, y, tx, ty);
  const anchor   = getLabelAnchor(nx);
  const baseline = getLabelBaseline(nx, ny);

  // Refs for elements whose positions update with worldScale
  const groupRef = useRef(null);
  const labelRef = useRef(null);
  const tagRef   = useRef(null);

  useEffect(() => {
    function update(s) {
      if (!groupRef.current) return;

      // Counter-scale: node stays fixed size on screen
      const inv = 1 / s;
      groupRef.current.setAttribute(
        'transform',
        `translate(${x} ${y}) scale(${inv}) translate(${-x} ${-y})`
      );

      // Dynamic label gap: base gap + extra clearance from road glow.
      // Inside the counter-scaled group, 1 SVG unit = 1 screen px.
      const effectiveGap = LABEL_GAP_BASE + ROAD_GLOW_SCREEN_HALF / s;
      const dx = nx * (r + effectiveGap);
      const dy = ny * (r + effectiveGap);

      if (labelRef.current) {
        labelRef.current.setAttribute('x', x + dx);
        labelRef.current.setAttribute('y', y + dy);
      }

      // Tag sits one label-size further out along the same normal
      if (tagRef.current) {
        const tagGap = r + effectiveGap + labelSize + 4;
        tagRef.current.setAttribute('x', x + nx * tagGap);
        tagRef.current.setAttribute('y', y + ny * tagGap);
      }
    }

    update(worldScale.get());
    return worldScale.on('change', update);
  }, [x, y, nx, ny, r, labelSize, worldScale]);

  function handleClick(e) {
    e.stopPropagation();
    onTap(item);
  }

  return (
    <g
      ref={groupRef}
      className={`tl-node tl-node--${isSub ? 'sub' : 'main'}`}
      data-id={id}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={x} cy={y} r={glowR} fill="var(--road)"
        fillOpacity={isSub ? 0.04 : 0.07} />

      <circle cx={x} cy={y} r={r} fill="var(--page-bg)" stroke="var(--road)"
        strokeWidth={isSub ? 1.5 : 2}
        strokeOpacity={isSub ? 0.4 : 0.65} />

      {/* Initial positions — overwritten by useEffect on first render */}
      <text
        ref={labelRef}
        x={x} y={y}
        fill="var(--text-secondary)"
        fillOpacity={isSub ? 0.7 : 0.9}
        fontSize={labelSize}
        fontWeight={700}
        fontFamily="Alef, sans-serif"
        textAnchor={anchor}
        dominantBaseline={baseline}
        pointerEvents="none"
      >
        {content.title}
      </text>

      <text
        ref={tagRef}
        x={x} y={y}
        fill="var(--road)"
        fillOpacity={0.65}
        fontSize={TAG_SIZE}
        fontFamily="Alef, sans-serif"
        textAnchor={anchor}
        dominantBaseline={baseline}
        pointerEvents="none"
      >
        {content.tag}
      </text>
    </g>
  );
}
```

Note: The tag is always rendered now (no `showTag` gating). If you want tags hidden at low zoom, add an opacity update inside the `useEffect`: `tagRef.current.setAttribute('opacity', s < 0.45 ? '0' : '0.65')`.

- [ ] **Step 2: Start the dev server and verify nodes still render with labels**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Open timeline in browser. Labels should still appear beside nodes. No functional change yet.

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelineNode.jsx
git commit -m "refactor(timeline): dynamic label gap, getOutwardNormal from utils"
```

---

## Task 4: Update `TimelineCanvas.jsx` — wheel + pinch zoom input

**Files:**
- Modify: `src/features/timeline/TimelineCanvas.jsx`

Add zoom event handlers. The canvas calls `onZoom(newScale, originX, originY)` where originX/Y are **screen coordinates** of the zoom focal point (cursor or pinch center). The parent (`TimelineFeature`) owns the math.

- [ ] **Step 1: Rewrite the file**

```jsx
// src/features/timeline/TimelineCanvas.jsx
// Pannable world container. Handles wheel and pinch zoom input.
// Calls onZoom(newScale, originX, originY) — parent owns pan math.
// Accepts worldX, worldY, worldScale as MotionValues.

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CANVAS_W, CANVAS_H, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './timelineData.js';

export function TimelineCanvas({ worldX, worldY, worldScale, children, onBgClick, onZoom }) {
  const pinchRef = useRef(null); // { dist, scale }

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta    = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const current  = worldScale.get();
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current * delta));
    onZoom(newScale, e.clientX, e.clientY);
  }, [worldScale, onZoom]);

  // ── Pinch zoom ─────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        dist:  Math.sqrt(dx * dx + dy * dy),
        scale: worldScale.get(),
      };
    }
  }, [worldScale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();

    const dx      = e.touches[0].clientX - e.touches[1].clientX;
    const dy      = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.sqrt(dx * dx + dy * dy);
    const ratio   = newDist / pinchRef.current.dist;
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchRef.current.scale * ratio));

    // Pinch origin: midpoint of two fingers
    const originX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const originY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    onZoom(newScale, originX, originY);
  }, [onZoom]);

  const handleTouchEnd = useCallback(() => {
    if (pinchRef.current) pinchRef.current = null;
  }, []);

  return (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="tl-canvas"
        style={{
          x: worldX,
          y: worldY,
          scale: worldScale,
          transformOrigin: '0 0',
          width: CANVAS_W,
          height: CANVAS_H,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{
          top:    -(CANVAS_H * 2),
          left:   -(CANVAS_W * 2),
          right:  CANVAS_W,
          bottom: CANVAS_H,
        }}
      >
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          onClick={onBgClick}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <filter id="tl-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="tl-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="0.8" fill="var(--road)" opacity="0.05" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#tl-dots)" />
          {children}
        </svg>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify panning still works, wheel events don't throw**

Run dev server and open timeline. Pan should work. Wheel scroll over timeline should not throw JS errors (zoom math is in parent, which we add next).

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelineCanvas.jsx
git commit -m "feat(timeline): add wheel and pinch zoom input to TimelineCanvas"
```

---

## Task 5: Update `TimelineFeature.jsx` — continuous zoom, preview pan, +/− buttons

**Files:**
- Modify: `src/features/timeline/TimelineFeature.jsx`

This is the largest change. Remove discrete `zoomLevel`. Subscribe to `worldScale` to recompute visible items. Add `handleZoom` with pan math. Update `handleNodeTap` to pan to preview center, not node. Add +/− buttons.

- [ ] **Step 1: Rewrite the file**

```jsx
// src/features/timeline/TimelineFeature.jsx
// Root timeline component. Owns pan/zoom state and orchestrates canvas + preview.
// Zoom is continuous — items filter by item.minScale vs current worldScale.
// Preview center (not node) is panned to viewport center on node tap.

import { useEffect, useState, useCallback } from 'react';
import { animate, AnimatePresence, useMotionValue } from 'framer-motion';
import { useAppContext } from '../../app/appState/useAppContext.js';
import {
  CANVAS_W, CANVAS_H,
  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, INITIAL_SCALE,
  PREVIEW_OFFSET,
} from './timelineData.js';
import { getOutwardNormal } from './timelineUtils.js';
import { useTimelineItems } from '../../data/timeline/useTimelineItems.js';
import { TimelineCanvas } from './TimelineCanvas.jsx';
import { TimelineRoad } from './TimelineRoad.jsx';
import { TimelineNode } from './TimelineNode.jsx';
import { TimelinePreview } from './TimelinePreview.jsx';
import { TimelineItemView } from './TimelineItemView.jsx';
import './TimelineFeature.css';

const SPRING = { type: 'spring', stiffness: 200, damping: 30 };

function centeredPan(vpW, vpH, scale) {
  return {
    x: (vpW - CANVAS_W * scale) / 2,
    y: (vpH - CANVAS_H * scale) / 2,
  };
}

export function TimelineFeature() {
  const { mode } = useAppContext();
  const { items, loading, error } = useTimelineItems();

  const worldX     = useMotionValue(0);
  const worldY     = useMotionValue(0);
  const worldScale = useMotionValue(INITIAL_SCALE);

  // currentScale drives visible-item filter — updated when worldScale changes
  const [currentScale,  setCurrentScale]  = useState(INITIAL_SCALE);
  const [previewItem,   setPreviewItem]   = useState(null);
  const [itemViewItem,  setItemViewItem]  = useState(null);

  // Initial pan: center the full canvas
  useEffect(() => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const { x, y } = centeredPan(vpW, vpH, INITIAL_SCALE);
    worldX.set(x);
    worldY.set(y);
    worldScale.set(INITIAL_SCALE);
    setCurrentScale(INITIAL_SCALE);
  }, [worldX, worldY, worldScale]);

  // Subscribe to worldScale to keep currentScale in sync (drives visible items)
  useEffect(() => {
    return worldScale.on('change', s => setCurrentScale(s));
  }, [worldScale]);

  // ── Zoom handler ────────────────────────────────────────────────────────────
  // Zooms to newScale around screen point (originX, originY).
  const handleZoom = useCallback((newScale, originX, originY) => {
    const currentS = worldScale.get();
    const curX     = worldX.get();
    const curY     = worldY.get();

    // World point currently under the origin (stays fixed after zoom)
    const worldPtX = (originX - curX) / currentS;
    const worldPtY = (originY - curY) / currentS;

    // New pan so worldPt stays under origin
    const newX = originX - worldPtX * newScale;
    const newY = originY - worldPtY * newScale;

    animate(worldScale, newScale, SPRING);
    animate(worldX,     newX,     SPRING);
    animate(worldY,     newY,     SPRING);
  }, [worldX, worldY, worldScale]);

  // +/− button handlers — zoom around viewport center
  function handleZoomIn() {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const newScale = Math.min(ZOOM_MAX, worldScale.get() * ZOOM_STEP);
    handleZoom(newScale, vpW / 2, vpH / 2);
  }

  function handleZoomOut() {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const newScale = Math.max(ZOOM_MIN, worldScale.get() / ZOOM_STEP);
    handleZoom(newScale, vpW / 2, vpH / 2);
  }

  // ── Node tap ────────────────────────────────────────────────────────────────
  // Pan camera so the preview center (not the node) is at viewport center.
  function handleNodeTap(item) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const scale = worldScale.get();

    const { nx, ny } = getOutwardNormal(item.x, item.y, item.tx ?? 1, item.ty ?? 0);
    const previewWorldX = item.x + nx * PREVIEW_OFFSET;
    const previewWorldY = item.y + ny * PREVIEW_OFFSET;

    // Pan so previewWorld maps to viewport center
    animate(worldX, vpW / 2 - previewWorldX * scale, SPRING);
    animate(worldY, vpH / 2 - previewWorldY * scale, SPRING);

    setPreviewItem(item);
  }

  function handleBack() {
    if (itemViewItem) {
      setItemViewItem(null);
      return;
    }
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const { x, y } = centeredPan(vpW, vpH, INITIAL_SCALE);
    animate(worldScale, INITIAL_SCALE, SPRING);
    animate(worldX, x, SPRING);
    animate(worldY, y, SPRING);
    setPreviewItem(null);
  }

  function handleBgClick() {
    if (previewItem) setPreviewItem(null);
  }

  function handleOpenItem(item) {
    setItemViewItem(item);
  }

  // Items visible at current zoom level
  const visibleItems = items.filter(item => (item.minScale ?? 0) <= currentScale);

  if (loading) return <div className="tl-feature tl-feature--loading" data-mode={mode} />;
  if (error)   return <div className="tl-feature tl-feature--error"   data-mode={mode} />;

  return (
    <div className="tl-feature" data-mode={mode}>
      <TimelineCanvas
        worldX={worldX}
        worldY={worldY}
        worldScale={worldScale}
        onBgClick={handleBgClick}
        onZoom={handleZoom}
      >
        <TimelineRoad worldScale={worldScale} />
        {visibleItems.map(item => (
          <TimelineNode
            key={item.id}
            item={item}
            worldScale={worldScale}
            onTap={handleNodeTap}
          />
        ))}
      </TimelineCanvas>

      <AnimatePresence>
        {previewItem && !itemViewItem && (
          <TimelinePreview
            key={previewItem.id}
            item={previewItem}
            onClose={handleBack}
            onOpen={handleOpenItem}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {itemViewItem && (
          <TimelineItemView
            key={itemViewItem.id}
            item={itemViewItem}
            onClose={() => setItemViewItem(null)}
          />
        )}
      </AnimatePresence>

      {previewItem && !itemViewItem && (
        <button className="tl-back-btn" onClick={handleBack} aria-label="חזרה למפה">
          ← חזרה
        </button>
      )}

      <div className="tl-zoom-btns" aria-label="פקדי זום">
        <button
          className="tl-zoom-btn"
          onClick={handleZoomIn}
          aria-label="הגדל"
          disabled={currentScale >= ZOOM_MAX}
        >+</button>
        <button
          className="tl-zoom-btn"
          onClick={handleZoomOut}
          aria-label="הקטן"
          disabled={currentScale <= ZOOM_MIN}
        >−</button>
      </div>

      <div className="tl-hint" aria-hidden="true">
        גרור לשוטט · פינץ׳ לזום · לחץ על נקודה
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

- Wheel zoom should pan + zoom around cursor
- +/− buttons should zoom around viewport center
- Tapping a node should pan so preview is at center (preview not yet fixed — that's Task 6)
- Items should appear/disappear as you zoom in/out

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelineFeature.jsx
git commit -m "feat(timeline): continuous zoom, 3-tier item visibility, preview-centered pan"
```

---

## Task 6: Update `TimelinePreview.jsx` — always render at viewport center

**Files:**
- Modify: `src/features/timeline/TimelinePreview.jsx`

The camera pans to put the preview world-point at viewport center (done in Task 5). So the DOM card always renders at the viewport center — no dynamic positioning.

- [ ] **Step 1: Update the file**

```jsx
// src/features/timeline/TimelinePreview.jsx
// Preview card shown when a node is tapped.
// Always renders at viewport center — the camera pans to center the preview world-point.

import { motion } from 'framer-motion';
import { useAuth } from '../../app/appState/AuthContext.jsx';

const CARD_W = 240;
const CARD_H = 200;

export function TimelinePreview({ item, onClose, onOpen }) {
  const { role } = useAuth();
  const { content } = item;

  const vpW  = window.innerWidth;
  const vpH  = window.innerHeight;
  const left = vpW / 2 - CARD_W / 2;
  const top  = vpH / 2 - CARD_H / 2;

  return (
    <motion.div
      className="tl-preview"
      style={{ left, top }}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="tl-preview__tag">{content.tag}</div>
      <div className="tl-preview__title">{content.title}</div>
      <div className="tl-preview__text">{content.text}</div>

      <div className="tl-preview__actions">
        <button className="tl-preview__open" onClick={() => onOpen(item)}>
          פתח →
        </button>
        {(role === 'admin' || role === 'editor') && (
          <a
            className="tl-preview__edit"
            href={`/admin/timeline/items/${item.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            ✏️
          </a>
        )}
      </div>

      <button className="tl-preview__close" onClick={onClose} aria-label="סגור">
        ×
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify preview appears at center, axis visible beside it**

Tap a node. Preview should appear centered on screen. The node and axis should be visible to one side of the preview.

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelinePreview.jsx
git commit -m "feat(timeline): preview always at viewport center, axis stays visible"
```

---

## Task 7: CSS — add zoom button styles

**Files:**
- Modify: `src/features/timeline/TimelineFeature.css`

- [ ] **Step 1: Add zoom button block to the CSS file, after the `.tl-back-btn` block**

```css
/* ── Zoom buttons ───────────────────────────────────────────────── */

.tl-zoom-btns {
  position: absolute;
  bottom: 60px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 20;
}

.tl-zoom-btn {
  width: 36px;
  height: 36px;
  font-size: 20px;
  line-height: 1;
  color: var(--road);
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 0.15s, opacity 0.15s;
}

.tl-zoom-btn:hover {
  background: var(--page-bg-secondary);
}

.tl-zoom-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.tl-zoom-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Verify zoom buttons in browser — check mobile and desktop**

Zoom buttons should appear bottom-left, not overlap hint text, look visually consistent with back button.

- [ ] **Step 3: Commit**

```bash
git add src/features/timeline/TimelineFeature.css
git commit -m "feat(timeline): add zoom +/- button styles"
```

---

## Task 8: Tuning — PREVIEW_OFFSET and tag visibility

**Files:**
- Modify: `src/features/timeline/timelineData.js` (constant tweak)
- Optionally modify: `src/features/timeline/TimelineNode.jsx` (tag opacity gate)

After seeing it in the browser, `PREVIEW_OFFSET = 200` may need adjusting. This is a world-unit distance. At `INITIAL_SCALE = 0.22`, 200 world units = 44 screen px — which is tight. At scale 1.0 it's 200px. Consider `PREVIEW_OFFSET = 300` as a starting point.

- [ ] **Step 1: Test visually at multiple zoom levels**

Open timeline, tap nodes at various zoom levels. Check:
- Does the preview overlap the axis?
- Is the node visible beside the preview?
- On mobile (narrow viewport), does the preview fit?

- [ ] **Step 2: Adjust `PREVIEW_OFFSET` in `timelineData.js` until it feels right**

Typical range: 200–400 world units. At scale 0.22 this is 44–88 screen px. At scale 1.0 this is 200–400 screen px.

- [ ] **Step 3: Optionally gate tag visibility by scale**

In `TimelineNode.jsx`, inside the `update(s)` function in `useEffect`, add:

```js
if (tagRef.current) {
  tagRef.current.setAttribute('opacity', s < 0.5 ? '0' : '0.65');
}
```

This hides the date tag at low zoom (less clutter) and shows it when zoomed in.

- [ ] **Step 4: Commit any tuning changes**

```bash
git add src/features/timeline/timelineData.js src/features/timeline/TimelineNode.jsx
git commit -m "chore(timeline): tune preview offset and tag visibility threshold"
```

---

## Self-Review

**Spec coverage:**
- ✅ Continuous zoom — Task 5 (`handleZoom` + subscribe to `worldScale`)
- ✅ Pinch zoom — Task 4 (`handleTouchMove`)
- ✅ Scroll wheel zoom — Task 4 (`handleWheel`)
- ✅ +/− buttons — Task 5 + Task 7
- ✅ 3-tier item visibility — Task 2 (constants) + Task 5 (filter by `minScale`)
- ✅ Zoom around pointer — Task 5 (`handleZoom` math)
- ✅ Zoom bounds ZOOM_MIN/ZOOM_MAX — Task 2 + Task 4 + Task 5
- ✅ Preview at viewport center — Task 6
- ✅ Camera pans to preview world-center — Task 5 (`handleNodeTap`)
- ✅ `getOutwardNormal` shared util — Task 1, used in Task 3 and Task 5
- ✅ Dynamic label gap — Task 3 (`effectiveGap` in `useEffect`)
- ✅ Remove `zoomLevel` discrete state — Task 5
- ✅ Data migration: `initialView` removed — Task 3 (no longer used in `TimelineNode`); resolveTimelineItem still maps `rawItem.initial_view` but `TimelineNode` now only reads `minScale`

**Placeholder scan:** None found.

**Type consistency:**
- `onZoom(newScale, originX, originY)` — defined in Task 4, called in Task 4, received in Task 5. ✅
- `getOutwardNormal(x, y, tx, ty)` → `{nx, ny}` — defined in Task 1, used in Task 3 and Task 5. ✅
- `item.minScale` — set by `resolveTimelineItem` from `rawItem.min_scale`. Used in Task 5 filter. ✅
- `PREVIEW_OFFSET`, `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_STEP`, `INITIAL_SCALE`, `ROAD_GLOW_SCREEN_HALF` — all defined in Task 2, imported in Tasks 3, 4, 5. ✅
