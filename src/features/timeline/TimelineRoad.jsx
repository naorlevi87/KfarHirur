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


// Computed once at module load — path string is static
const PATH_D = buildPathString();

export function TimelineRoad({ worldScale, isEntering }) {
  const baseRef = useRef(null);
  const coreRef = useRef(null);
  const edgeRef = useRef(null);

  const baseWidth = useTransform(worldScale, s => BASE_SCREEN_WIDTH / s);
  const coreWidth = useTransform(worldScale, s => CORE_SCREEN_WIDTH / s);
  const edgeWidth = useTransform(worldScale, s => EDGE_SCREEN_WIDTH / s);

  useEffect(() => {
    const paths = [baseRef, coreRef, edgeRef]
      .map(r => r.current)
      .filter(Boolean);
    if (!paths.length) return;

    if (!isEntering) {
      paths.forEach(p => {
        p.style.strokeDasharray  = '';
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

    // Force reflow — one call flushes the pending style batch for all three paths
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
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: baseWidth }}
        strokeLinecap="round" opacity={0.10}
      />

      {/* Core — main visible stroke */}
      <motion.path
        ref={coreRef}
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: coreWidth }}
        strokeLinecap="round" opacity={0.48}
      />

      {/* Edge — thin crisp centerline */}
      <motion.path
        ref={edgeRef}
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: edgeWidth }}
        strokeLinecap="round" opacity={0.72}
      />
    </g>
  );
}
