// src/content/site/resolveSiteShellContent.js
// Single entry for localized site shell copy (header, nav, consciousness labels).

import { siteShellContent as siteShellHe } from './he/siteShell.content.js';
import { siteShellContent as siteShellEn } from './en/siteShell.content.js';

const byLocale = {
  he: siteShellHe,
  en: siteShellEn,
};

export function resolveSiteShellContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
