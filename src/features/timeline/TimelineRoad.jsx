// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis. Stroke width is counter-scaled to stay fixed on screen.
// On fresh entry (isEntering=true), path draws itself via strokeDashoffset animation.
// Three layers at near-identical widths (5% steps) — unified look with soft depth.
// All layers breathe together via a shared animated scale (multiple irrational sine waves).

import { useRef, useEffect } from 'react';
import { useMotionValue, useTransform, motion } from 'framer-motion';
import { buildPathString } from './timelinePath.js';

// Base screen widths — each layer 5% wider than the inner one.
// Close enough to read as one stroke; slight size difference gives soft edge depth.
const EDGE_W = 6;           // innermost, brightest
const CORE_W = EDGE_W * 1.05;
const BASE_W = EDGE_W * 1.10;

// Brushstroke draw timing
const DRAW_DURATION = 1800; // ms — must match TimelineNode
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Computed once at module load — path string is static
const PATH_D = buildPathString();

export function TimelineRoad({ worldScale, isEntering }) {
  const baseRef = useRef(null);
  const coreRef = useRef(null);
  const edgeRef = useRef(null);

  // Shared breathing scale — animates slowly with 3 irrational sine frequencies.
  // Three frequencies at irrational ratios → never repeats, always feels organic.
  const breathe = useMotionValue(1);

  useEffect(() => {
    let raf;
    function tick(t) {
      const v = 1
        + 0.12 * Math.sin(t * 0.00031)
        + 0.07 * Math.sin(t * 0.00073)
        + 0.04 * Math.sin(t * 0.00127);
      breathe.set(v);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [breathe]);

  // Counter-scale + breathe: each layer stays fixed on screen while width animates.
  const baseWidth = useTransform([worldScale, breathe], ([s, b]) => BASE_W * b / s);
  const coreWidth = useTransform([worldScale, breathe], ([s, b]) => CORE_W * b / s);
  const edgeWidth = useTransform([worldScale, breathe], ([s, b]) => EDGE_W * b / s);

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
      {/* Base — outermost layer, softest edge */}
      <motion.path
        ref={baseRef}
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: baseWidth }}
        strokeLinecap="round" opacity={0.18}
      />

      {/* Core — mid layer */}
      <motion.path
        ref={coreRef}
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: coreWidth }}
        strokeLinecap="round" opacity={0.42}
      />

      {/* Edge — innermost, brightest centerline */}
      <motion.path
        ref={edgeRef}
        d={PATH_D} fill="none" stroke="var(--road)"
        style={{ strokeWidth: edgeWidth }}
        strokeLinecap="round" opacity={0.70}
      />
    </g>
  );
}
