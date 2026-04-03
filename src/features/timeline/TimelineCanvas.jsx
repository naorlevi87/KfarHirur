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
