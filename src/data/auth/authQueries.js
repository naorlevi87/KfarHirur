// src/data/auth/authQueries.js
// Auth-related DB queries. Role lookup only — auth state lives in AuthContext.

import { supabase } from '../timeline/supabaseClient.js';

// Returns the role string ('admin' | 'editor' | 'member') or null if not found.
export async function fetchUserRole(userId) {
  const { data, error } = await supabase.rpc('get_user_role', { uid: userId });

  if (error) return null;
  return data ?? null;
}
