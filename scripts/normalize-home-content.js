// scripts/normalize-home-content.js
// One-time cleanup: aligns DB rows with the home schema mode definitions.
//
// Rules:
//   schema mode:'shared' → DB must have exactly one 'shared' row, no naor/shay
//   schema mode:'both'   → DB must have naor + shay rows only, no shared
//
// Existing user-edited values are preserved wherever possible.
//
// Run: node --env-file=.env.local scripts/normalize-home-content.js

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Delete stale rows ────────────────────────────────────────────────────────

// schema mode:'shared' fields that accidentally have naor/shay rows
const deleteNaorShay = ['origin.body', 'origin.heading'];

// schema mode:'both' fields that accidentally have a shared row
const deleteShared = [
  'community.heading',
  'joz.heading',
  'timeline.heading',
  'timeline.teaser',
];

for (const path of deleteNaorShay) {
  const { error } = await sb.from('page_content').delete()
    .eq('page_key', 'home').eq('locale', 'he')
    .eq('field_path', path).in('mode', ['naor', 'shay']);
  if (error) { console.error(`delete naor/shay ${path}:`, error.message); process.exit(1); }
  console.log(`deleted naor/shay rows for ${path}`);
}

for (const path of deleteShared) {
  const { error } = await sb.from('page_content').delete()
    .eq('page_key', 'home').eq('locale', 'he')
    .eq('field_path', path).eq('mode', 'shared');
  if (error) { console.error(`delete shared ${path}:`, error.message); process.exit(1); }
  console.log(`deleted shared row for ${path}`);
}

// ── Ensure shared row exists for origin.body (clean value) ───────────────────

const { error: e } = await sb.from('page_content').upsert({
  page_key: 'home', locale: 'he',
  field_path: 'origin.body', mode: 'shared',
  value: 'קהילה שהתחילה ברגע אחד בזולה בנווה ים, והתמקמה בעתלית.',
}, { onConflict: 'page_key,field_path,mode,locale' });
if (e) { console.error('upsert origin.body shared:', e.message); process.exit(1); }
console.log('upserted origin.body shared');

console.log('\nDone. DB is now consistent with the home schema.');
