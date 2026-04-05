// src/pages/timeline/TimelinePage.jsx
// Thin page shell for the timeline route. Passes URL slug to TimelineFeature.

import { useParams, useLocation } from 'react-router-dom';
import { TimelineFeature } from '../../features/timeline/TimelineFeature.jsx';

export function TimelinePage() {
  const { slug }  = useParams();
  const { state } = useLocation();
  // Remount only on explicit menu navigations (state.menuNav is set by HamburgerMenu).
  // Expand/close navigations (/timeline ↔ /timeline/:slug) carry no menuNav,
  // so TimelineFeature keeps the same instance and Framer Motion animations are preserved.
  return <TimelineFeature key={state?.menuNav ?? 'tl'} initialSlug={slug ?? null} />;
}
