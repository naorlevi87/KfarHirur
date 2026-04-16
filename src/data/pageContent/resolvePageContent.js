// src/data/pageContent/resolvePageContent.js
// Utilities for merging DB content rows over a static content payload.

/**
 * Set a value at a dot-notation path on an object (mutates).
 * setNestedValue(obj, 'hero.heading', 'val') → obj.hero.heading = 'val'
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cursor[keys[i]] == null || typeof cursor[keys[i]] !== 'object') {
      cursor[keys[i]] = {};
    }
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
}

/**
 * Build a payload-shaped overlay from DB rows for the given mode.
 * Includes rows where mode === currentMode OR mode === 'shared'.
 * DB rows: Array of { field_path, mode, value }
 */
export function buildDbOverlay(rows, currentMode) {
  const overlay = {};
  for (const row of rows) {
    if (row.mode !== 'shared' && row.mode !== currentMode) continue;
    setNestedValue(overlay, row.field_path, row.value);
  }
  return overlay;
}

/**
 * Deep-merge source into target. Source wins on conflict.
 * Arrays are replaced wholesale (not concatenated).
 * Returns a new object — does not mutate either argument.
 */
export function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
