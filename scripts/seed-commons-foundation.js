// scripts/seed-commons-foundation.js
// One-time seed: creates the Joz ve Loz workspace and adds Naor & Shay as admins.
// Resolves users by email via the admin API; users without an account yet are warned + skipped.
// Re-runnable (upserts). Uses the service role key — never run in the browser.
//
// Run:
//   node --env-file=.env.local scripts/seed-commons-foundation.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

// Data client scoped to the commons schema; admin client for auth lookups.
const db        = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'commons' } });
const authAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

const WORKSPACE = { slug: 'joz-ve-loz', name: "ג'וז ולוז" };
const ADMINS = [
  { email: 'naorlevi87@gmail.com', display_name: 'נאור' },
  { email: 'sknic83@gmail.com',    display_name: 'שי'  },
];

const { data: ws, error: wsErr } = await db
  .from('workspaces')
  .upsert({ slug: WORKSPACE.slug, name: WORKSPACE.name }, { onConflict: 'slug' })
  .select()
  .single();
if (wsErr) { console.error('Workspace seed failed:', wsErr.message); process.exit(1); }
console.log(`Workspace ready: ${ws.name} (${ws.id})`);

const { data: list, error: listErr } = await authAdmin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }

for (const admin of ADMINS) {
  const u = list.users.find(x => x.email?.toLowerCase() === admin.email.toLowerCase());
  if (!u) {
    console.warn(`No account for ${admin.email} yet — skipped. Re-run after they sign up.`);
    continue;
  }
  const { error: mErr } = await db
    .from('workspace_members')
    .upsert(
      { workspace_id: ws.id, user_id: u.id, permission_level: 'admin', status: 'active', display_name: admin.display_name },
      { onConflict: 'workspace_id,user_id' }
    );
  if (mErr) { console.error(`Member seed failed for ${admin.email}:`, mErr.message); process.exit(1); }
  console.log(`OK ${admin.email} -> admin`);
}

console.log('Done.');
