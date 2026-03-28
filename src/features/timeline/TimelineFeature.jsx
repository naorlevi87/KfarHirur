// src/features/timeline/TimelineFeature.jsx
// Root timeline component. Owns pan/zoom state and orchestrates canvas + preview.

import { useEffect, useState } from 'react';
import { animate, AnimatePresence, useMotionValue } from 'framer-motion';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { items, CANVAS_W, CANVAS_H } from './timelineData.js';
import { TimelineCanvas } from './TimelineCanvas.jsx';
import { TimelineRoad } from './TimelineRoad.jsx';
import { TimelineNode } from './TimelineNode.jsx';
import { TimelinePreview } from './TimelinePreview.jsx';
import './TimelineFeature.css';

const ZOOM_SCALE = 2.5;
const SPRING = { type: 'spring', stiffness: 200, damping: 30 };

export function TimelineFeature() {
  const { mode } = useAppContext();

  const worldX = useMotionValue(0);
  const worldY = useMotionValue(0);
  const worldScale = useMotionValue(1);

  const [zoomLevel, setZoomLevel] = useState(0);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewScreenPos, setPreviewScreenPos] = useState(null);

  // Set initial pan so the canvas is roughly centered on the road
  useEffect(() => {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    // center on x=1300, y=900 — middle of the road's bounding box
    worldX.set(vpW / 2 - 1300);
    worldY.set(vpH / 2 - 900);
  }, [worldX, worldY]);

  function handleNodeTap(item, screenPos) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const targetX = vpW / 2 - item.x * ZOOM_SCALE;
    const targetY = vpH / 2 - item.y * ZOOM_SCALE;

    animate(worldX, targetX, SPRING);
    animate(worldY, targetY, SPRING);
    animate(worldScale, ZOOM_SCALE, SPRING);

    setZoomLevel(1);
    setPreviewItem(item);
    setPreviewScreenPos({ x: vpW / 2, y: vpH / 2 });
  }

  function handleBack() {
    animate(worldScale, 1, SPRING);
    // re-center on road midpoint
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    animate(worldX, vpW / 2 - 1300, SPRING);
    animate(worldY, vpH / 2 - 900, SPRING);

    setZoomLevel(0);
    setPreviewItem(null);
    setPreviewScreenPos(null);
  }

  function handleBgClick() {
    if (previewItem) {
      setPreviewItem(null);
      setPreviewScreenPos(null);
    }
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
        {previewItem && (
          <TimelinePreview
            key={previewItem.id}
            item={previewItem}
            mode={mode}
            screenPos={previewScreenPos}
            onClose={handleBack}
          />
        )}
      </AnimatePresence>

      {zoomLevel > 0 && (
        <button
          className="tl-back-btn"
          onClick={handleBack}
          aria-label="חזרה למפה"
        >
          ← חזרה
        </button>
      )}

      <div className="tl-hint" id="tl-hint" aria-hidden="true">
        גרור לשוטט · לחץ על נקודה
      </div>
    </div>
  );
}
