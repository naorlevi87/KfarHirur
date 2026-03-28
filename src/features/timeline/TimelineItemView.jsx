// src/features/timeline/TimelineItemView.jsx
// Full-screen item view. Slides up from bottom.
// Shows: back button, tag, title, image placeholder, full text.

import { motion } from 'framer-motion';

export function TimelineItemView({ item, mode, onClose }) {
  const content = item[mode] ?? item.naor;

  return (
    <motion.div
      className="tl-item-view"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 32 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="tl-item-view__header">
        <span className="tl-item-view__tag">{content.tag}</span>
      </div>

      <div className="tl-item-view__body">
        <h1 className="tl-item-view__title">{content.title}</h1>

        <div className="tl-item-view__image-slot" aria-label="תמונה בקרוב">
          <span className="tl-item-view__image-placeholder">תמונה</span>
        </div>

        <p className="tl-item-view__text">{content.text}</p>
      </div>
    </motion.div>
  );
}
