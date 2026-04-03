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
