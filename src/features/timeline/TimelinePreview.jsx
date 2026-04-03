// src/features/timeline/TimelinePreview.jsx
// Preview card shown when a node is tapped.
// Always renders at viewport center — the camera pans to center the preview world-point.

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';

const CARD_W = 300;
const CARD_H = 210;

export function TimelinePreview({ item, onClose, onSavePosition }) {
  const { role }   = useAuth();
  const navigate   = useNavigate();
  const { content } = item;

  function handleOpen() {
    onSavePosition?.();
    navigate(`/timeline/${item.slug}`);
  }

  const vpW  = window.innerWidth;
  const vpH  = window.innerHeight;
  const left = vpW / 2 - CARD_W / 2;
  const top  = vpH / 2 - CARD_H / 2;

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
        <button className="tl-preview__open" onClick={handleOpen}>
          פתח →
        </button>
        {(role === 'admin' || role === 'editor') && (
          <a
            className="tl-preview__edit"
            href={`/admin/timeline/items/${item.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            ✏️
          </a>
        )}
      </div>

      <button className="tl-preview__close" onClick={onClose} aria-label="סגור">
        ×
      </button>
    </motion.div>
  );
}
