// src/commons/resolveCommonsShellContent.js
// Resolver for localized Commons Engine shell copy. Mirrors the site's resolver pattern.

import { commonsShellContent as he } from '../content/commons/he/commonsShell.content.js';
import { commonsShellContent as en } from '../content/commons/en/commonsShell.content.js';

const byLocale = { he, en };

export function resolveCommonsShellContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
