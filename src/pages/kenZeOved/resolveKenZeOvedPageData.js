// src/pages/kenZeOved/resolveKenZeOvedPageData.js
// Page-local resolver: merges shared + mode branch into a semantic payload.
// Exports both a pure function (for tests) and a hook (for the page component).

import { useAppContext } from '../../app/appState/useAppContext.js';
import { kenZeOvedContent as kenZeOvedHe } from '../../content/site/he/kenZeOved.content.js';
import { kenZeOvedContent as kenZeOvedEn } from '../../content/site/en/kenZeOved.content.js';

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
    hero: branch.hero ?? {},
    cta: { ...branch.cta, donateUrl: shared.donateUrl, visitUrl: shared.visitUrl },
    progress: { ...shared.progress, ...branch.progress },
    video: shared.video ?? {},
    longText: branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share: { ...shared.share, ...branch.share },
    footer: shared.footer ?? {},
  };
}

export function useKenZeOvedPageData() {
  const { locale, mode } = useAppContext();
  return resolveKenZeOvedPageData(locale, mode);
}
