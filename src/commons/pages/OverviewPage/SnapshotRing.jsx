// src/commons/pages/OverviewPage/SnapshotRing.jsx
// The completion ring: a banded-spectrum arc (colour = progress), glass centre, soft glow, rounded
// caps. No % digit — centre shows "מה מצבנו?" + the leaf count. Colour reinforces; the count carries
// the meaning (IS 5568). Honours prefers-reduced-motion.

import { motion, useReducedMotion } from 'motion/react';
import { spectrumConic, spectrumHex } from '../../styles/spectrum.js';

export function SnapshotRing({ fraction, done, total, centerLabel, countOf }) {
  const reduce = useReducedMotion();
  const hue = spectrumHex(fraction);
  const conic = spectrumConic(fraction);
  return (
    <div className="commons-ring" style={{ filter: `drop-shadow(0 0 14px ${hue}55)` }}>
      <div className="commons-ring__track" />
      <motion.div
        className="commons-ring__arc"
        style={{ background: conic }}
        initial={reduce ? false : { opacity: 0.4, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      />
      <div className="commons-ring__glass" />
      <div className="commons-ring__center" role="img"
           aria-label={`${centerLabel} ${done} ${countOf} ${total}`}>
        <span className="commons-ring__sub">{centerLabel}</span>
        <span className="commons-ring__count">{done} {countOf} {total}</span>
      </div>
    </div>
  );
}
