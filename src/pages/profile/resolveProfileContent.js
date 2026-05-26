// src/pages/profile/resolveProfileContent.js
// Resolves static UI strings for the profile page.

import { profileContent as profileHe } from '../../content/site/he/profile.content.js';
import { profileContent as profileEn } from '../../content/site/en/profile.content.js';

const byLocale = {
  he: profileHe,
  en: profileEn,
};

export function resolveProfileContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
