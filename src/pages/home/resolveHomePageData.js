// src/pages/home/resolveHomePageData.js
// Hook for home page. Loads all content from DB — no static fallback.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay } from '../../data/pageContent/resolvePageContent.js';

export function useHomePageData() {
  const { locale, mode } = useAppContext();
  // forLocale tags which locale the rows belong to, so loading is derived (no
  // synchronous reset needed) and a stale in-flight fetch can't overwrite newer data.
  const [state, setState] = useState({ rows: null, forLocale: null });

  useEffect(() => {
    let active = true;
    fetchPageContent('home', locale)
      .then(rows => { if (active) setState({ rows, forLocale: locale }); })
      .catch(() => { if (active) setState({ rows: [], forLocale: locale }); });
    return () => { active = false; };
  }, [locale]);

  const loading = state.forLocale !== locale;
  const data    = loading ? null : buildDbOverlay(state.rows, mode);
  return { data, loading };
}
