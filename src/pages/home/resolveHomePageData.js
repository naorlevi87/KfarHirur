// src/pages/home/resolveHomePageData.js
// Resolver + hook for home page. Merges shared + mode branch; overlays DB on top.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { homeContent as homeHe } from '../../content/site/he/home.content.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay, deepMerge } from '../../data/pageContent/resolvePageContent.js';

const byLocale = { he: homeHe };

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

export function resolveHomePageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const branch = mode === 'shay' ? root.shay : root.naor;

  return {
    origin:      { ...shared.origin },
    community:   branch.community ?? {},
    joz:         branch.joz ?? {},
    visit:       shared.visit ?? {},
    fundraising: { ...shared.fundraising, ...branch.fundraising },
    join:        { ...shared.join, ...branch.join },
    timeline:    shared.timeline ?? {},
    images:      shared.images ?? {},
  };
}

export function useHomePageData() {
  const { locale, mode } = useAppContext();
  const [dbRows, setDbRows] = useState([]);

  useEffect(() => {
    fetchPageContent('home', locale)
      .then(setDbRows)
      .catch(() => {
        // DB unavailable — static fallback already in place
      });
  }, [locale]);

  const staticPayload = resolveHomePageData(locale, mode);
  const overlay = buildDbOverlay(dbRows, mode);
  return deepMerge(staticPayload, overlay);
}
