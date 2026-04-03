// src/app/resolveSiteShellContent.js
// Resolver for localized site shell copy (header, nav, consciousness labels).
// Lives in app/ because it serves SiteHeader — an app-layer component.

import { siteShellContent as siteShellHe } from '../content/site/he/siteShell.content.js';
import { siteShellContent as siteShellEn } from '../content/site/en/siteShell.content.js';

const byLocale = {
  he: siteShellHe,
  en: siteShellEn,
};

export function resolveSiteShellContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
