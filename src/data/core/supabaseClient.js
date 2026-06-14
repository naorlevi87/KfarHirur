// src/data/core/supabaseClient.js
// Supabase client singleton — the neutral account/identity authority + DB handle shared by every
// product (community site, Commons). Lives in data/core, NOT inside any feature, because it is the
// trunk both products sit on (see docs/superpowers/specs/2026-06-14-account-and-products-model-design.md).
// Import this only inside src/data/ — never from components or features directly.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env');
}

export const supabase = createClient(url, key, {
  auth: {
    storageKey: 'kfar-hirur-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
