// src/pages/timeline/TimelineItemPage.jsx
// Full-screen detail view for a single timeline item.
// Accessed at /timeline/:slug — back button and browser back both return to /timeline.

import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTimelineItem } from '../../data/timeline/useTimelineItem.js';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import './TimelineItemPage.css';

export function TimelineItemPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { role }   = useAuth();
  const { item, loading, error } = useTimelineItem(slug);

  function handleBack() {
    navigate('/timeline');
  }

  if (loading) return <div className="tl-item-page tl-item-page--loading" />;
  if (error || !item) return <div className="tl-item-page tl-item-page--error" />;

  const { content, blocks, date } = item;
  const year = date ? new Date(date).getFullYear() : null;

  return (
    <motion.div
      className="tl-item-page"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="tl-item-page__topbar">
        <button className="tl-item-page__back" onClick={handleBack} aria-label="חזרה לציר הזמן">
          ← חזרה
        </button>
        {(role === 'admin' || role === 'editor') && (
          <a
            className="tl-item-page__edit"
            href={`/admin/timeline/items/${slug}`}
            aria-label="ערוך פריט"
          >
            ✏️ עריכה
          </a>
        )}
      </div>

      <div className="tl-item-page__content">
        <div className="tl-item-page__year">{content.tag || year}</div>
        <h1 className="tl-item-page__title">{content.title}</h1>

        <div className="tl-item-page__blocks">
          {blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'text':
      return <p className="tl-block-text">{block.text}</p>;
    case 'image':
      return (
        <figure className="tl-block-image">
          <img src={block.url} alt={block.caption ?? ''} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case 'video':
      return (
        <div className="tl-block-video">
          <video src={block.url} controls playsInline />
        </div>
      );
    case 'link':
      return (
        <a className="tl-block-link" href={block.url} target="_blank" rel="noreferrer">
          {block.label ?? block.url}
        </a>
      );
    case 'cta':
      return (
        <a className="tl-block-cta" href={block.url} target="_blank" rel="noreferrer">
          {block.label}
        </a>
      );
    default:
      return null;
  }
}
