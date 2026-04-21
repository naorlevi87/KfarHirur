// scripts/seed-kenzeover-content.js
// Seed + normalize kenZeOved page content in DB.
// - ignoreDuplicates on insert — existing user-edited values are never overwritten.
// - Normalizes mode mismatches: schema mode:'both' fields must have naor+shay rows only.
//
// Run: node --env-file=.env.local scripts/seed-kenzeover-content.js

import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Normalize: delete shared rows for schema mode:'both' fields ──────────────
// (these accumulated before the schema was stable)

const normalizeDelete = [
  'hero.heading',
  'progress.raisedLabel',
  'progress.outOfLabel',
];

for (const path of normalizeDelete) {
  const { data: deleted } = await sb.from('page_content').delete()
    .eq('page_key', 'kenZeOved').eq('locale', 'he')
    .eq('field_path', path).eq('mode', 'shared')
    .select('field_path');
  if (deleted?.length) console.log(`removed stale shared row: ${path}`);
}

// ── Seed rows ────────────────────────────────────────────────────────────────

const rows = [
  // ── hero ──────────────────────────────────────────────────────────────────
  { mode: 'naor', field_path: 'hero.heading', value: 'כן, זה עובד' },
  { mode: 'shay', field_path: 'hero.heading', value: 'כן, זה עובד' },

  // ── cta ───────────────────────────────────────────────────────────────────
  { mode: 'naor', field_path: 'cta.donateLabel',    value: 'מה שמרגיש לכם נכון' },
  { mode: 'naor', field_path: 'cta.visitLabel',     value: 'בואו' },
  { mode: 'shay', field_path: 'cta.donateLabel',    value: 'כמה שאתם מעריכים את המצוקה' },
  { mode: 'shay', field_path: 'cta.visitLabel',     value: 'בואו לאכול' },

  // ── progress ──────────────────────────────────────────────────────────────
  { mode: 'naor', field_path: 'progress.raisedLabel', value: 'עד כה גויס' },
  { mode: 'naor', field_path: 'progress.outOfLabel',  value: 'מתוך' },
  { mode: 'shay', field_path: 'progress.raisedLabel', value: 'עד כה גויס' },
  { mode: 'shay', field_path: 'progress.outOfLabel',  value: 'מתוך' },

  // ── share ─────────────────────────────────────────────────────────────────
  { mode: 'naor',   field_path: 'share.heading',        value: 'שתפו, מכפת לכם, זה ממש עוזר :)' },
  { mode: 'shay',   field_path: 'share.heading',        value: 'תעבירו את זה הלאה' },
  { mode: 'shared', field_path: 'share.whatsappMessage', value: 'ג׳וז ולוז עדיין עובדת. אם יכולים — עוזרים: ' },

  // ── transparency ──────────────────────────────────────────────────────────
  { mode: 'shared', field_path: 'transparency.heading',     value: 'שקיפות כלכלית' },
  { mode: 'shared', field_path: 'transparency.placeholder', value: 'הנתונים יתווספו בקרוב.' },
];

const records = rows.map(r => ({
  page_key: 'kenZeOved',
  locale:   'he',
  ...r,
}));

const { error } = await sb.from('page_content').upsert(records, {
  onConflict:       'page_key,field_path,mode,locale',
  ignoreDuplicates: true,
});

if (error) { console.error('seed failed:', error.message); process.exit(1); }
console.log(`seeded ${records.length} rows (existing untouched).`);
