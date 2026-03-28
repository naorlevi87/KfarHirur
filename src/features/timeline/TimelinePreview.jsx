// src/features/timeline/TimelinePreview.jsx
// Fixed-position preview card. Shown via AnimatePresence when a node is tapped.
// Positioned near the tapped node, clamped to viewport.
// Reads naor/shay content from item[mode].

import { motion } from 'framer-motion';

const CARD_W = 240;
const CARD_H = 180; // approximate, for clamping

export function TimelinePreview({ item, mode, screenPos, onClose, onDive }) {
  const content = item[mode] ?? item.naor;
  const hasSubItems = false; // Phase 2: detect sub-items in data

  // clamp card position so it stays in viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  let left = (screenPos?.x ?? vpW / 2) + 16;
  let top  = (screenPos?.y ?? vpH / 2) - 20;
  if (left + CARD_W > vpW - 8) left = (screenPos?.x ?? vpW / 2) - CARD_W - 16;
  if (left < 8) left = 8;
  if (top + CARD_H > vpH - 8) top = vpH - CARD_H - 8;
  if (top < 8) top = 8;

  return (
    <motion.div
      className="tl-preview"
      style={{ left, top }}
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="tl-preview__tag">{content.tag}</div>
      <div className="tl-preview__title">{content.title}</div>
      <div className="tl-preview__text">{content.text}</div>

      {hasSubItems && (
        <button className="tl-preview__dive" onClick={onDive}>
          צלול עוד ↓
        </button>
      )}

      <button className="tl-preview__close" onClick={onClose} aria-label="סגור">
        ×
      </button>
    </motion.div>
  );
}
