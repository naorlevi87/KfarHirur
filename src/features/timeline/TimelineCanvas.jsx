// src/features/timeline/TimelineCanvas.jsx
// Pannable world container. A motion.div with Framer drag holds the SVG.
// Accepts worldX, worldY, worldScale as MotionValues from the parent.
// Children are rendered inside the SVG element.

import { motion } from 'framer-motion';
import { CANVAS_W, CANVAS_H } from './timelineData.js';

export function TimelineCanvas({ worldX, worldY, worldScale, children, onBgClick }) {
  // Build the CSS transform string from motion values
  // We use a wrapping motion.div for drag + scale, SVG fills it
  return (
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
      // very loose constraints — effectively free panning
      dragConstraints={{
        top: -(CANVAS_H * 2),
        left: -(CANVAS_W * 2),
        right: CANVAS_W,
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
        </defs>

        {/* subtle dot texture */}
        <defs>
          <pattern id="tl-dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="0.8" fill="var(--road)" opacity="0.05" />
          </pattern>
        </defs>
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#tl-dots)" />

        {children}
      </svg>
    </motion.div>
  );
}
