// src/features/timeline/TimelinePreview.jsx
// Preview card — small centered card that expands in-place to near-full-screen detail view.
// Uses Framer Motion layout animation on the same DOM node.

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { useTimelineItem } from '../../data/timeline/useTimelineItem.js';

const CARD_W = 300;
const CARD_H = 210;

export function TimelinePreview({ item, expanded, onExpand, onClose }) {
  const { role }    = useAuth();
  const { content } = item;

  // Fetch full item (with blocks) only when expanded
  const { item: fullItem } = useTimelineItem(expanded ? item.slug : null);
  const blocks = fullItem?.blocks ?? [];
  const date   = fullItem?.date ?? null;
  const year   = date ? new Date(date).getFullYear() : null;

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, onClose]);

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // Inline position only used for small card — expanded position is driven by CSS class
  const smallStyle = expanded ? {} : {
    top:  vpH / 2 - CARD_H / 2,
    left: vpW / 2 - CARD_W / 2,
    width: CARD_W,
  };

  return (
    <>
      {/* Backdrop — fades in when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="tl-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* The card — same DOM node, layout-animates between small and expanded */}
      <motion.div
        layout
        className={`tl-preview${expanded ? ' tl-preview--expanded' : ''}`}
        style={smallStyle}
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {expanded ? (
          <div className="tl-preview__expanded-scroll">
            <div className="tl-preview__expanded-topbar">
              <button
                className="tl-preview__close-expanded"
                onClick={onClose}
                aria-label="חזרה לציר הזמן"
              >
                ← חזרה
              </button>
              {(role === 'admin' || role === 'editor') && (
                <a
                  className="tl-preview__edit-expanded"
                  href={`/admin/timeline/items/${item.slug}`}
                  aria-label="ערוך פריט"
                >
                  ✏️ עריכה
                </a>
              )}
            </div>

            <div className="tl-preview__expanded-content">
              <div className="tl-preview__expanded-year">{content.tag || year}</div>
              <h1 className="tl-preview__expanded-title">{content.title}</h1>

              <motion.div
                className="tl-preview__expanded-blocks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                {blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </motion.div>
            </div>
          </div>
        ) : (
          <>
            <div className="tl-preview__tag">{content.tag}</div>
            <div className="tl-preview__title">{content.title}</div>
            <div className="tl-preview__text">{content.text}</div>

            <div className="tl-preview__actions">
              <button className="tl-preview__open" onClick={onExpand}>
                קרא עוד...
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
          </>
        )}
      </motion.div>
    </>
  );
}

// ── Block renderer ────────────────────────────────────────────────

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
    case 'youtube': {
      const ytId = extractYouTubeId(block.url ?? '');
      if (!ytId) return null;
      return (
        <div className="tl-block-embed tl-block-embed--youtube">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    case 'instagram': {
      const igId = extractInstagramId(block.url ?? '');
      if (!igId) return null;
      return (
        <div className="tl-block-embed tl-block-embed--instagram">
          <iframe
            src={`https://www.instagram.com/p/${igId}/embed/`}
            title="Instagram post"
            scrolling="no"
            allowTransparency
          />
        </div>
      );
    }
    case 'facebook':
      if (!block.url) return null;
      return <FacebookEmbed url={block.url} />;
    default:
      return null;
  }
}

function FacebookEmbed({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    function renderEmbed() {
      if (window.FB) window.FB.XFBML.parse(containerRef.current);
    }
    if (!document.getElementById('facebook-jssdk')) {
      window.fbAsyncInit = () => { renderEmbed(); };
      const script = document.createElement('script');
      script.id    = 'facebook-jssdk';
      script.src   = 'https://connect.facebook.net/he_IL/sdk.js#xfbml=1&version=v19.0';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      setTimeout(renderEmbed, 0);
    }
  }, [url]);

  return (
    <div className="tl-block-embed tl-block-embed--facebook" ref={containerRef}>
      <div id="fb-root" />
      <div className="fb-post" data-href={url} data-width="500" data-show-text="true" />
    </div>
  );
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match?.[1] ?? null;
}

function extractInstagramId(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/);
  return match?.[1] ?? null;
}
