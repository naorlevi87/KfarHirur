// src/pages/home/resolveHomePageData.js
// Hook for home page. Loads all content from DB — no static fallback.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay } from '../../data/pageContent/resolvePageContent.js';

export function useHomePageData() {
  const { locale, mode } = useAppContext();
  const [dbRows, setDbRows] = useState(null); // null = loading, [] = loaded

  useEffect(() => {
    setDbRows(null);
    fetchPageContent('home', locale).then(setDbRows).catch(() => setDbRows([]));
  }, [locale]);

  const loading = dbRows === null;
  const data    = loading ? null : buildDbOverlay(dbRows, mode);
  return { data, loading };
}
