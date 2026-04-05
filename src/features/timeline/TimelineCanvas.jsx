// src/features/timeline/TimelineCanvas.jsx
// Pannable world container. Handles pointer drag, wheel zoom, and pinch zoom.
// Calls onZoom(newScale, originX, originY) — parent owns zoom math.
// Accepts worldX, worldY, worldScale as MotionValues.
// Pan is clamped so the canvas never fully leaves the viewport.

import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CANVAS_W, CANVAS_H, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './timelineData.js';
import { clampPan } from './timelineUtils.js';

export function TimelineCanvas({ worldX, worldY, worldScale, children, onBgClick, onZoom }) {
  const containerRef = useRef(null);
  const pinchRef     = useRef(null); // { dist, scale }
  const pointerDrag  = useRef(null); // { px, py, wx, wy }
  const touchPan     = useRef(null); // { px, py, wx, wy }

  // ── Pointer drag (mouse + stylus) ──────────────────────────────────────────
  function handlePointerDown(e) {
    if (e.button !== 0) return;
    pointerDrag.current = {
      px: e.clientX, py: e.clientY,
      wx: worldX.get(), wy: worldY.get(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!pointerDrag.current) return;
    const { x, y } = clampPan(
      pointerDrag.current.wx + (e.clientX - pointerDrag.current.px),
      pointerDrag.current.wy + (e.clientY - pointerDrag.current.py),
      worldScale.get(),
    );
    worldX.set(x);
    worldY.set(y);
  }

  function handlePointerUp() {
    pointerDrag.current = null;
  }

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  // Non-passive so preventDefault() suppresses page scroll.
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta    = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, worldScale.get() * delta));
    onZoom(newScale, e.clientX, e.clientY);
  }, [worldScale, onZoom]);

  // ── Touch: single-finger pan + two-finger pinch ────────────────────────────
  // touchmove registered non-passive to allow preventDefault on pinch.
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      touchPan.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), scale: worldScale.get() };
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      touchPan.current = {
        px: e.touches[0].clientX, py: e.touches[0].clientY,
        wx: worldX.get(), wy: worldY.get(),
      };
    }
  }, [worldX, worldY, worldScale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx      = e.touches[0].clientX - e.touches[1].clientX;
      const dy      = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
        pinchRef.current.scale * (newDist / pinchRef.current.dist)
      ));
      const originX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const originY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      onZoom(newScale, originX, originY);
    } else if (e.touches.length === 1 && touchPan.current) {
      const { x, y } = clampPan(
        touchPan.current.wx + (e.touches[0].clientX - touchPan.current.px),
        touchPan.current.wy + (e.touches[0].clientY - touchPan.current.py),
        worldScale.get(),
      );
      worldX.set(x);
      worldY.set(y);
    }
  }, [worldX, worldY, worldScale, onZoom]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) touchPan.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel',      handleWheel,      { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true  });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true  });
    return () => {
      el.removeEventListener('wheel',      handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove',  handleTouchMove);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
