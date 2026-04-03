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
  PREVIEW_OFFSET_Y,
  PREVIEW_OFFSET_X,
  SCALE_ALWAYS, SCALE_MID, SCALE_CLOSE,
} from './timelineData.js';
import { timelineUi } from '../../content/site/he/timeline.content.js';
import { assignLabelFlips } from './timelineUtils.js';
import { useTimelineItems } from '../../data/timeline/useTimelineItems.js';
import { TimelineCanvas } from './TimelineCanvas.jsx';
import { TimelineRoad } from './TimelineRoad.jsx';
import { TimelineNode } from './TimelineNode.jsx';
import { TimelinePreview } from './TimelinePreview.jsx';
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
  const [currentScale, setCurrentScale] = useState(INITIAL_SCALE);
  const [previewId,    setPreviewId]    = useState(null);

  // Initial pan: restore saved position (after returning from item page) or center canvas.
  useEffect(() => {
    const vpW   = window.innerWidth;
    const vpH   = window.innerHeight;
    const saved = sessionStorage.getItem('tl-pan');
    if (saved) {
      sessionStorage.removeItem('tl-pan');
      const { x, y, scale } = JSON.parse(saved);
      worldX.set(x);
      worldY.set(y);
      worldScale.set(scale);
      setCurrentScale(scale);
    } else {
      const { x, y } = centeredPan(vpW, vpH, INITIAL_SCALE);
      worldX.set(x);
      worldY.set(y);
      worldScale.set(INITIAL_SCALE);
      setCurrentScale(INITIAL_SCALE);
    }
  }, [worldX, worldY, worldScale]);

  // Saves current pan/zoom to sessionStorage so TimelineItemPage can restore it on back.
  function savePosition() {
    sessionStorage.setItem('tl-pan', JSON.stringify({
      x:     worldX.get(),
      y:     worldY.get(),
      scale: worldScale.get(),
    }));
  }

  // Subscribe to worldScale but only re-render when scale crosses a visibility threshold.
  // Prevents 60fps React re-renders during animated zoom.
  useEffect(() => {
    const THRESHOLDS = [SCALE_ALWAYS, SCALE_MID, SCALE_CLOSE];
    let lastScale = worldScale.get();

    function crossed(prev, next) {
      return THRESHOLDS.some(t => (prev < t) !== (next < t));
    }

    return worldScale.on('change', s => {
      if (crossed(lastScale, s)) {
        lastScale = s;
        setCurrentScale(s);
      } else {
        lastScale = s;
      }
    });
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
  // Offset is computed in screen px then converted to world units so the node
  // stays outside the preview card at any zoom level.
  function handleNodeTap(item) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    // Zoom in one step on tap (capped at ZOOM_MAX)
    const newScale = Math.min(ZOOM_MAX, worldScale.get() * ZOOM_STEP);

    // Offsets in screen px, converted to world units at the new scale
    const previewWorldX = item.x - PREVIEW_OFFSET_X / newScale;
    const previewWorldY = item.y - PREVIEW_OFFSET_Y / newScale;

    animate(worldScale, newScale, SPRING);
    animate(worldX, vpW / 2 - previewWorldX * newScale, SPRING);
    animate(worldY, vpH / 2 - previewWorldY * newScale, SPRING);

    setPreviewId(item.id);
  }

  function handleBack() {
    setPreviewId(null);
  }

  function handleBgClick() {
    if (previewId) setPreviewId(null);
  }

  // Items visible at current zoom level
  const visibleItems = items.filter(item => (item.minScale ?? 0) <= currentScale);

  // Assign label flip direction — alternates sides for crowded adjacent nodes
  const labelFlips = assignLabelFlips(visibleItems, currentScale);

  // Derive preview item fresh from items on every render — picks up mode changes automatically
  const previewItem = previewId ? (items.find(i => i.id === previewId) ?? null) : null;

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
            labelFlip={labelFlips.get(item.id) ?? false}
            onTap={handleNodeTap}
          />
        ))}
      </TimelineCanvas>

      <AnimatePresence>
        {previewItem && (
          <TimelinePreview
            key={previewItem.id}
            item={previewItem}
            onClose={handleBack}
            onSavePosition={savePosition}
          />
        )}
      </AnimatePresence>

      {previewItem && (
        <button className="tl-back-btn" onClick={handleBack} aria-label="חזרה למפה">
          ← חזרה
        </button>
      )}

      <div className="tl-zoom-btns" aria-label="פקדי זום">
        <button
          className="tl-zoom-btn"
          onClick={handleZoomIn}
          aria-label={timelineUi.zoomIn}
          disabled={currentScale >= ZOOM_MAX}
        >+</button>
        <button
          className="tl-zoom-btn"
          onClick={handleZoomOut}
          aria-label={timelineUi.zoomOut}
          disabled={currentScale <= ZOOM_MIN}
        >−</button>
      </div>

      <div className="tl-hint" aria-hidden="true">
        גרור לשוטט · פינץ׳ לזום · לחץ על נקודה
      </div>
    </div>
  );
}
