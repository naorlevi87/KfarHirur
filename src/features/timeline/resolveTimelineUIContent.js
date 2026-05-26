// src/features/timeline/resolveTimelineUIContent.js
// Resolves static UI strings for the timeline feature.
// Shields the feature from knowing where content comes from or which locale file is loaded.

import { timelineUi as timelineUiHe } from '../../content/site/he/timeline.content.js';
import { timelineUi as timelineUiEn } from '../../content/site/en/timeline.content.js';

const byLocale = {
  he: timelineUiHe,
  en: timelineUiEn,
};

export function resolveTimelineUIContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
