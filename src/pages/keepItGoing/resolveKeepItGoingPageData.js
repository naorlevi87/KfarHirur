// src/pages/keepItGoing/resolveKeepItGoingPageData.js
// Page-local: pick locale branch + story by mode; small hook for KeepItGoingPage only.

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

function resolveStory(root, mode) {
  const key = mode === 'shay' || mode === 'naor' ? mode : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function resolveKeepItGoingPageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const story = resolveStory(root, mode);
  const meta = shared.supportMeta ?? {};
  return { shared, story, meta };
}

export function useKeepItGoingPageData() {
  const { locale, mode } = useAppContext();
  return resolveKeepItGoingPageData(locale, mode);
}
