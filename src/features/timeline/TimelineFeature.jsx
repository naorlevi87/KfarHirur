// src/features/timeline/TimelineFeature.jsx
// Root timeline component. Owns pan/zoom state and orchestrates canvas + preview + item view.

import { useEffect, useState } from 'react';
import { animate, AnimatePresence, useMotionValue } from 'framer-motion';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { items, CANVAS_W, CANVAS_H } from './timelineData.js';
import { TimelineCanvas } from './TimelineCanvas.jsx';
import { TimelineRoad } from './TimelineRoad.jsx';
import { TimelineNode } from './TimelineNode.jsx';
import { TimelinePreview } from './TimelinePreview.jsx';
import { TimelineItemView } from './TimelineItemView.jsx';
import './TimelineFeature.css';

const ZOOM_SCALE   = 1.5;   // zoom-in scale — keeps context visible
const INITIAL_SCALE = 0.38; // start zoomed out to see the whole axis
const SPRING = { type: 'spring', stiffness: 200, damping: 30 };

function centeredPan(vpW, vpH, scale) {
  return {
    x: (vpW - CANVAS_W * scale) / 2,
    y: (vpH - CANVAS_H * scale) / 2,
  };
}

export function TimelineFeature() {
  const { mode } = useAppContext();

  const worldX     = useMotionValue(0);
  const worldY     = useMotionValue(0);
  const worldScale = useMotionValue(INITIAL_SCALE);

  const [zoomLevel,    setZoomLevel]    = useState(0);
  const [previewItem,  setPreviewItem]  = useState(null);
  const [itemViewItem, setItemViewItem] = useState(null);

  // initial pan: center the full canvas in the viewport
  useEffect(() => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const { x, y } = centeredPan(vpW, vpH, INITIAL_SCALE);
    worldX.set(x);
    worldY.set(y);
    worldScale.set(INITIAL_SCALE);
  }, [worldX, worldY, worldScale]);

  function handleNodeTap(item) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    animate(worldX,     vpW / 2 - item.x * ZOOM_SCALE, SPRING);
    animate(worldY,     vpH / 2 - item.y * ZOOM_SCALE, SPRING);
    animate(worldScale, ZOOM_SCALE, SPRING);
    setZoomLevel(1);
    setPreviewItem(item);
  }

  function handleBack() {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const { x, y } = centeredPan(vpW, vpH, INITIAL_SCALE);
    animate(worldScale, INITIAL_SCALE, SPRING);
    animate(worldX, x, SPRING);
    animate(worldY, y, SPRING);
    setZoomLevel(0);
    setPreviewItem(null);
    setItemViewItem(null);
  }

  function handleBgClick() {
    if (previewItem) setPreviewItem(null);
  }

  function handleOpenItem(item) {
    setItemViewItem(item);
    setPreviewItem(null);
  }

  const visibleItems = items.filter(item =>
    zoomLevel === 0 ? item.minScale === 0 : true
  );

  return (
    <div className="tl-feature" data-mode={mode}>
      <TimelineCanvas
        worldX={worldX}
        worldY={worldY}
        worldScale={worldScale}
        onBgClick={handleBgClick}
      >
        <TimelineRoad />
        {visibleItems.map(item => (
          <TimelineNode
            key={item.id}
            item={item}
            mode={mode}
            onTap={handleNodeTap}
          />
        ))}
      </TimelineCanvas>

      <AnimatePresence>
        {previewItem && !itemViewItem && (
          <TimelinePreview
            key={previewItem.id}
            item={previewItem}
            mode={mode}
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
            mode={mode}
            onClose={() => setItemViewItem(null)}
          />
        )}
      </AnimatePresence>

      {zoomLevel > 0 && !itemViewItem && (
        <button className="tl-back-btn" onClick={handleBack} aria-label="חזרה למפה">
          ← חזרה
        </button>
      )}

      <div className="tl-hint" aria-hidden="true">
        גרור לשוטט · לחץ על נקודה
      </div>
    </div>
  );
}
