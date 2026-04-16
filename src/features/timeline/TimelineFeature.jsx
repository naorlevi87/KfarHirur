// src/features/timeline/TimelineFeature.jsx
// Root timeline component. Owns pan/zoom state and orchestrates canvas + preview.
// Zoom is continuous — items filter by item.minScale vs current worldScale.
// Preview center (not node) is panned to viewport center on node tap.

import { useEffect, useState, useCallback } from 'react';
import { animate, AnimatePresence, useMotionValue } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import {
  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
  PATH_BBOX,
  PREVIEW_OFFSET_Y,
  PREVIEW_OFFSET_X,
  SCALE_ALWAYS, SCALE_MID, SCALE_CLOSE,
} from './timelineData.js';

import { timelineUi } from '../../content/site/he/timeline.content.js';
import { clampPan, assignLabelFlips } from './timelineUtils.js';
import { getPathProgress } from './timelinePath.js';
import { useTimelineItems } from '../../data/timeline/useTimelineItems.js';
import { TimelineCanvas } from './TimelineCanvas.jsx';
import { TimelineRoad } from './TimelineRoad.jsx';
import { TimelineNode } from './TimelineNode.jsx';
import { TimelinePreview } from './TimelinePreview.jsx';
import './TimelineFeature.css';

const SPRING        = { type: 'spring', stiffness: 200, damping: 30 };
const SPRING_ENTER  = { type: 'spring', stiffness: 120, damping: 22 };
const ENTRY_SCALE   = 0.07; // starting zoom for entrance animation
const PATH_PADDING  = 0.10; // fraction of viewport to leave as breathing room around path

// Fit the path bounding box into the viewport with padding.
// Returns { scale, x, y } — the scale and pan that show the full path.
function fitPathView(vpW, vpH) {
  const pathW = PATH_BBOX.maxX - PATH_BBOX.minX;
  const pathH = PATH_BBOX.maxY - PATH_BBOX.minY;
  const scale = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, Math.min(
      vpW * (1 - PATH_PADDING) / pathW,
      vpH * (1 - PATH_PADDING) / pathH,
    ))
  );
  // Center the path bbox in the viewport
  const x = (vpW - pathW * scale) / 2 - PATH_BBOX.minX * scale;
  const y = (vpH - pathH * scale) / 2 - PATH_BBOX.minY * scale;
  return { scale, x, y };
}

export function TimelineFeature({ initialSlug = null }) {
  const { mode } = useAppContext();
  const navigate  = useNavigate();
  const { state: locationState } = useLocation();
  const { items, loading, error } = useTimelineItems();

  const worldX     = useMotionValue(0);
  const worldY     = useMotionValue(0);
  const worldScale = useMotionValue(ZOOM_MIN);

  // currentScale drives visible-item filter — updated when worldScale changes
  const [currentScale, setCurrentScale] = useState(ZOOM_MIN);
  const [previewId,    setPreviewId]    = useState(null);
  const [expanded,     setExpanded]     = useState(false);
  // Initialised synchronously so the first render already knows whether to animate.
  // sessionStorage check here prevents a visible flash before useEffect runs.
  const [isEntering, setIsEntering] = useState(
    () => !sessionStorage.getItem('tl-pan')
  );

  // Initial pan — restore saved position (back from item page, no animation)
  // or entrance animation: start zoomed way out, spring into fit view.
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
      setCurrentScale(scale);    // eslint-disable-line react-hooks/set-state-in-effect
      setIsEntering(false);      // eslint-disable-line react-hooks/set-state-in-effect
    } else {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const { scale: fitScale, x: fitX, y: fitY } = fitPathView(vpW, vpH);

      if (prefersReduced) {
        worldX.set(fitX);
        worldY.set(fitY);
        worldScale.set(fitScale);
        setCurrentScale(fitScale); // eslint-disable-line react-hooks/set-state-in-effect
        setIsEntering(false);      // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        // Entrance: snap to entry scale, then spring into fit view.
        const entryX = (vpW - PATH_BBOX.minX) / 2;
        const entryY = (vpH - PATH_BBOX.minY) / 2;
        worldX.set(entryX);
        worldY.set(entryY);
        worldScale.set(ENTRY_SCALE);
        setCurrentScale(ENTRY_SCALE); // eslint-disable-line react-hooks/set-state-in-effect
        animate(worldScale, fitScale, SPRING_ENTER);
        animate(worldX,     fitX,     SPRING_ENTER);
        animate(worldY,     fitY,     SPRING_ENTER);
        setIsEntering(true); // eslint-disable-line react-hooks/set-state-in-effect
        // Clear entering flag after animation completes so nodes become interactive.
        // 1800 = DRAW_DURATION, 200 = NODE_APPEAR_DUR, 200 = buffer
        setTimeout(() => setIsEntering(false), 1800 + 200 + 200);
      }
    }
  }, [worldX, worldY, worldScale]);

  function savePosition() {
    sessionStorage.setItem('tl-pan', JSON.stringify({
      x:     worldX.get(),
      y:     worldY.get(),
      scale: worldScale.get(),
    }));
  }

  // Reset when URL returns to /timeline (menu nav) — runs only on slug change.
  useEffect(() => {
    if (!initialSlug) {
      setPreviewId(null); // eslint-disable-line react-hooks/set-state-in-effect
      setExpanded(false);
    }
  }, [initialSlug]);

  // Auto-open expanded view when arriving directly at /timeline/:slug.
  useEffect(() => {
    if (!initialSlug || !items.length || expanded) return;
    const item = items.find(i => i.slug === initialSlug);
    if (item) {
      setPreviewId(item.id); // eslint-disable-line react-hooks/set-state-in-effect
      setExpanded(true);
    }
  }, [initialSlug, items]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const handleZoom = useCallback((newScale, originX, originY) => {
    const currentS = worldScale.get();
    const curX     = worldX.get();
    const curY     = worldY.get();

    const worldPtX = (originX - curX) / currentS;
    const worldPtY = (originY - curY) / currentS;

    const { x: newX, y: newY } = clampPan(
      originX - worldPtX * newScale,
      originY - worldPtY * newScale,
      newScale,
    );

    animate(worldScale, newScale, SPRING);
    animate(worldX,     newX,     SPRING);
    animate(worldY,     newY,     SPRING);
  }, [worldX, worldY, worldScale]);

  function handleZoomIn() {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    handleZoom(Math.min(ZOOM_MAX, worldScale.get() * ZOOM_STEP), vpW / 2, vpH / 2);
  }

  function handleZoomOut() {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    handleZoom(Math.max(ZOOM_MIN, worldScale.get() / ZOOM_STEP), vpW / 2, vpH / 2);
  }

  // ── Node tap ────────────────────────────────────────────────────────────────
  // Zoom only when needed to reveal the next tier.
  // tier-0 items zoom to SCALE_MID, tier-1 items zoom to SCALE_CLOSE,
  // tier-2 items (and anything already at the right scale) just pan.
  function handleNodeTap(item) {
    const vpW      = window.innerWidth;
    const vpH      = window.innerHeight;
    const currentS = worldScale.get();
    const itemTier = item.minScale ?? 0;

    // The threshold that must be crossed to reveal the tier below this one
    const nextReveal =
      itemTier <= SCALE_ALWAYS ? SCALE_MID :
      itemTier <= SCALE_MID    ? SCALE_CLOSE :
      null; // tier-2: no deeper tier to reveal

    const shouldZoom = nextReveal !== null && currentS < nextReveal;
    // Zoom to at least nextReveal so the next tier actually appears
    const newScale = shouldZoom
      ? Math.min(ZOOM_MAX, Math.max(nextReveal, currentS * ZOOM_STEP))
      : currentS;

    const previewWorldX = item.x - PREVIEW_OFFSET_X / newScale;
    const previewWorldY = item.y - PREVIEW_OFFSET_Y / newScale;
    const { x: clampedX, y: clampedY } = clampPan(
      vpW / 2 - previewWorldX * newScale,
      vpH / 2 - previewWorldY * newScale,
      newScale,
    );

    if (shouldZoom) animate(worldScale, newScale, SPRING);
    animate(worldX, clampedX, SPRING);
    animate(worldY, clampedY, SPRING);

    setPreviewId(item.id);
    setExpanded(false);
  }

  function handleExpand() {
    if (!previewItem) return;
    savePosition();
    setExpanded(true);
    // Push — not replace — so Back closes the panel and returns to /timeline,
    // and a second Back exits to wherever the user came from.
    navigate(`/timeline/${previewItem.slug}`, { state: locationState });
  }

  function handleClose() {
    setPreviewId(null);
    setExpanded(false);
    navigate('/timeline', { state: locationState, replace: true });
  }

  // Clicking the canvas closes small preview only (backdrop handles expanded close)
  function handleBgClick() {
    if (previewId && !expanded) setPreviewId(null);
  }

  const visibleItems = items.filter(item => (item.minScale ?? 0) <= currentScale);
  const labelFlips   = assignLabelFlips(visibleItems, currentScale);
  const previewItem  = previewId ? (items.find(i => i.id === previewId) ?? null) : null;

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
        <TimelineRoad worldScale={worldScale} isEntering={isEntering} />
        {visibleItems.map(item => (
          <TimelineNode
            key={item.id}
            item={item}
            worldScale={worldScale}
            labelFlip={labelFlips.get(item.id) ?? false}
            onTap={handleNodeTap}
            isEntering={isEntering}
            pathProgress={getPathProgress(item.date ?? '2020-01')}
          />
        ))}
      </TimelineCanvas>

      <AnimatePresence>
        {previewItem && (
          <TimelinePreview
            key={previewItem.id}
            item={previewItem}
            expanded={expanded}
            onExpand={handleExpand}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

      {!expanded && (
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
      )}

      <div className="tl-hint" aria-hidden="true">
        {timelineUi.hint}
      </div>
    </div>
  );
}
