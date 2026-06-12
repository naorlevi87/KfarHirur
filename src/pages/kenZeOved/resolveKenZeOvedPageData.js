// src/pages/kenZeOved/resolveKenZeOvedPageData.js
// Hook for kenZeOved page. Loads text content from DB.
// Non-text config (URLs, numbers) stays hardcoded here — not DB content.

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay } from '../../data/pageContent/resolvePageContent.js';

// Static config — not user-editable copy, intentionally kept in code.
const CONFIG = {
  donateUrl: 'https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw',
  visitUrl:  'https://ontopo.com/he/il/page/jozveloz?source=kfarhirur',
  progress: {
    raisedAmount:   0,      // ← update manually when raising
    goalA:          180000,
    goalB:          340000,
    goalC:          520000,
    currencySymbol: '₪',
  },
};

export function useKenZeOvedPageData() {
  const { locale, mode } = useAppContext();
  // forLocale tags which locale the rows belong to, so loading is derived (no
  // synchronous reset needed) and a stale in-flight fetch can't overwrite newer data.
  const [state, setState] = useState({ rows: null, forLocale: null });

  useEffect(() => {
    let active = true;
    fetchPageContent('kenZeOved', locale)
      .then(rows => { if (active) setState({ rows, forLocale: locale }); })
      .catch(() => { if (active) setState({ rows: [], forLocale: locale }); });
    return () => { active = false; };
  }, [locale]);

  if (state.forLocale !== locale) return { loading: true, data: null };

  const db = buildDbOverlay(state.rows, mode);

  const data = {
    hero:     db.hero     ?? {},
    cta: {
      ...(db.cta ?? {}),
      donateUrl:       CONFIG.donateUrl,
      visitUrl:        CONFIG.visitUrl,
      donateAriaLabel: db.cta?.donateLabel ?? '',
      visitAriaLabel:  db.cta?.visitLabel  ?? '',
    },
    progress:     { ...CONFIG.progress, ...(db.progress ?? {}) },
    videoShort:   db.videoShort   ?? null,
    videoLong:    db.videoLong    ?? null,
    longText:     db.longText     ?? {},
    transparency: db.transparency ?? {},
    share:        db.share        ?? {},
  };

  return { loading: false, data };
}
