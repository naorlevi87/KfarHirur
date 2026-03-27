// src/pages/keepItGoing/resolveKeepItGoingPageData.js
// Page-local resolver: merges shared + mode branch into a semantic payload.
// Exports both a pure function (for tests) and a hook (for the page component).

import { useAppContext } from '../../app/appState/useAppContext.js';
import { keepItGoingContent as keepItGoingHe } from '../../content/site/he/keepItGoing.content.js';
import { keepItGoingContent as keepItGoingEn } from '../../content/site/en/keepItGoing.content.js';

const byLocale = {
  he: keepItGoingHe,
  en: keepItGoingEn,
};

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

function resolveMode(root, mode) {
  const key = mode === 'shay' ? 'shay' : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function resolveKeepItGoingPageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const branch = resolveMode(root, mode);

  return {
    hero: branch.hero ?? {},
    cta: { ...branch.cta, donateUrl: shared.donateUrl, visitUrl: shared.visitUrl },
    progress: shared.progress ?? {},
    video: shared.video ?? {},
    longText: branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share: shared.share ?? {},
    footer: shared.footer ?? {},
  };
}

export function useKeepItGoingPageData() {
  const { locale, mode } = useAppContext();
  return resolveKeepItGoingPageData(locale, mode);
}
