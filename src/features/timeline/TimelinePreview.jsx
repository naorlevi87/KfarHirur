// src/features/timeline/TimelinePreview.jsx
// Preview card shown when a node is tapped. Light-theme surface style.
// "פתח" button opens the full item view.

import { motion } from 'framer-motion';

const CARD_W = 240;
const CARD_H = 200;

export function TimelinePreview({ item, mode, onClose, onOpen }) {
  const content = item[mode] ?? item.naor;

  // center the card in the viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const left = Math.max(8, Math.min(vpW - CARD_W - 8, vpW / 2 - CARD_W / 2));
  const top  = Math.max(8, Math.min(vpH - CARD_H - 8, vpH / 2 - CARD_H / 2));

  return (
    <motion.div
      className="tl-preview"
      style={{ left, top }}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="tl-preview__tag">{content.tag}</div>
      <div className="tl-preview__title">{content.title}</div>
      <div className="tl-preview__text">{content.text}</div>

      <div className="tl-preview__actions">
        <button className="tl-preview__open" onClick={() => onOpen(item)}>
          פתח →
        </button>
      </div>

      <button className="tl-preview__close" onClick={onClose} aria-label="סגור">
        ×
      </button>
    </motion.div>
  );
}
