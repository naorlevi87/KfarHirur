// src/pages/kenZeOved/resolveKenZeOvedPageData.js
// Page-local resolver: merges shared + mode branch into a semantic payload.
// Hook overlays DB content on top of the static file. Pure function stays sync
// for use outside React (tests, scripts).

import { useEffect, useState } from 'react';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { kenZeOvedContent as kenZeOvedHe } from '../../content/site/he/kenZeOved.content.js';
import { kenZeOvedContent as kenZeOvedEn } from '../../content/site/en/kenZeOved.content.js';
import { fetchPageContent } from '../../data/pageContent/pageContent.queries.js';
import { buildDbOverlay, deepMerge } from '../../data/pageContent/resolvePageContent.js';

const byLocale = {
  he: kenZeOvedHe,
  en: kenZeOvedEn,
};

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

function resolveMode(root, mode) {
  const key = mode === 'shay' ? 'shay' : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function resolveKenZeOvedPageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const branch = resolveMode(root, mode);

  return {
    hero:         branch.hero ?? {},
    cta:          {
      ...branch.cta,
      donateUrl:      shared.donateUrl,
      visitUrl:       shared.visitUrl,
      // aria labels derived from visible text — WCAG 2.5.3 compliance
      donateAriaLabel: branch.cta?.donateLabel ?? '',
      visitAriaLabel:  branch.cta?.visitLabel ?? '',
    },
    progress:     { ...shared.progress, ...branch.progress },
    video:        shared.video ?? {},
    longText:     branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share:        { ...shared.share, ...branch.share },
  };
}

export function useKenZeOvedPageData() {
  const { locale, mode } = useAppContext();
  const [dbRows, setDbRows] = useState([]);

  useEffect(() => {
    fetchPageContent('kenZeOved', locale)
      .then(setDbRows)
      .catch(() => {
        // DB unavailable — static fallback already in place, no action needed
      });
  }, [locale]);

  const staticPayload = resolveKenZeOvedPageData(locale, mode);
  const overlay = buildDbOverlay(dbRows, mode);
  return deepMerge(staticPayload, overlay);
}
