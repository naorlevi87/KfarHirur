// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis. Stroke width is counter-scaled to stay fixed on screen.
// Pencil/brush feel via SVG feTurbulence displacement.

import { useTransform, motion } from 'framer-motion';
import { buildPathString } from './timelinePath.js';

const CORE_SCREEN_WIDTH = 7;
const THIN_SCREEN_WIDTH = 2;

export function TimelineRoad({ worldScale }) {
  const coreWidth = useTransform(worldScale, s => CORE_SCREEN_WIDTH / s);
  const thinWidth = useTransform(worldScale, s => THIN_SCREEN_WIDTH / s);
  const glowWidth = useTransform(worldScale, s => 28 / s);

  const d = buildPathString();

  return (
    <g>
      <defs>
        <filter id="tl-pencil" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.012" numOctaves="4" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* wide soft glow */}
      <motion.path d={d} fill="none" stroke="var(--road)" style={{ strokeWidth: glowWidth }} strokeLinecap="round" opacity={0.06} />

      {/* thick core — distorted for pencil feel */}
      <motion.path d={d} fill="none" stroke="var(--road)" style={{ strokeWidth: coreWidth }} strokeLinecap="round" opacity={0.52} filter="url(#tl-pencil)" />

      {/* thin overlay for texture variance */}
      <motion.path d={d} fill="none" stroke="var(--road)" style={{ strokeWidth: thinWidth }} strokeLinecap="round" opacity={0.28} filter="url(#tl-pencil)" />
    </g>
  );
}
