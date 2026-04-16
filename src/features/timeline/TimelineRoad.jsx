// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis. Stroke width is counter-scaled to stay fixed on screen.
// On fresh entry (isEntering=true), path draws itself via strokeDashoffset animation.
// Painterly layers: core stroke + pressure variance + fiber bristles. No glow.

import { useRef, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import { buildPathString } from './timelinePath.js';

const CORE_SCREEN_WIDTH  = 7;
const THIN_SCREEN_WIDTH  = 2;
const FIBER_SCREEN_WIDTH = 1;
const PRESSURE_WIDTH     = 11; // wider layer for brush pressure illusion

// Brushstroke draw timing
const DRAW_DURATION = 1800; // ms
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function TimelineRoad({ worldScale, isEntering }) {
  const coreRef     = useRef(null);
  const thinRef     = useRef(null);
  const fiberRef    = useRef(null);
  const pressureRef = useRef(null);

  const coreWidth     = useTransform(worldScale, s => CORE_SCREEN_WIDTH  / s);
  const thinWidth     = useTransform(worldScale, s => THIN_SCREEN_WIDTH  / s);
  const fiberWidth    = useTransform(worldScale, s => FIBER_SCREEN_WIDTH / s);
  const pressureWidth = useTransform(worldScale, s => PRESSURE_WIDTH     / s);

  const d = buildPathString();

  useEffect(() => {
    const paths = [coreRef, thinRef, fiberRef, pressureRef]
      .map(r => r.current)
      .filter(Boolean);
    if (!paths.length) return;

    if (!isEntering) {
      // Restore or reduced-motion: show immediately
      paths.forEach(p => {
        p.style.strokeDasharray  = 'none';
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

    // Force reflow so the initial hidden state is painted before animating
    paths[0].getBoundingClientRect();

    paths.forEach(p => {
      p.style.transition       = `stroke-dashoffset ${DRAW_DURATION}ms ${DRAW_EASING}`;
      p.style.strokeDashoffset = '0';
    });
  }, [isEntering]);

  return (
    <g>
      <defs>
        <filter id="tl-pencil" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.012" numOctaves="4" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="tl-pencil2" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.009" numOctaves="3" seed="27" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* Pressure variance layer — slightly wider, different seed, gives uneven width feel */}
      <motion.path
        ref={pressureRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: pressureWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.09}
        filter="url(#tl-pencil2)"
      />

      {/* Core stroke */}
      <motion.path
        ref={coreRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: coreWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.50}
        filter="url(#tl-pencil)"
      />

      {/* Thin overlay — texture variance */}
      <motion.path
        ref={thinRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: thinWidth, ...(isEntering && { strokeDasharray: 99999, strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.26}
        filter="url(#tl-pencil)"
      />

      {/* Fiber layer — bristle escape at stroke edges */}
      <motion.path
        ref={fiberRef}
        d={d} fill="none" stroke="var(--road)"
        style={{ strokeWidth: fiberWidth, ...(isEntering && { strokeDashoffset: 99999 }) }}
        strokeLinecap="round" opacity={0.18}
        strokeDasharray="2 14"
        filter="url(#tl-pencil)"
      />
    </g>
  );
}
