// src/pages/kenZeOved/resolveKenZeOvedUIContent.js
// Resolves static UI strings for the kenZeOved page (aria-labels, placeholders).
// Editable copy lives in Supabase — see resolveKenZeOvedPageData.js.

import { kenZeOvedUi as kenZeOvedUiHe } from '../../content/site/he/kenZeOved.content.js';
import { kenZeOvedUi as kenZeOvedUiEn } from '../../content/site/en/kenZeOved.content.js';

const byLocale = {
  he: kenZeOvedUiHe,
  en: kenZeOvedUiEn,
};

export function resolveKenZeOvedUIContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
