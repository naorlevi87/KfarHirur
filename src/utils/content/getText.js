// src/utils/content/getText.js
// Safe string lookup on a flat object by key (e.g. shared fields, brand.*, consciousness.*).

export function getText(pageContent, key) {
  if (pageContent == null || typeof pageContent !== 'object') return '';
  const value = pageContent[key];
  return value == null ? '' : String(value);
}
