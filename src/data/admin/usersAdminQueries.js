// src/data/admin/usersAdminQueries.js
// Admin queries for user management — requires admin role.

import { supabase } from '../timeline/supabaseClient.js';

export async function fetchAllUsers() {
  const { data, error } = await supabase.rpc('get_all_users_with_roles');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateUserRole(userId, role) {
  const { error } = await supabase.rpc('set_user_role', {
    target_uid: userId,
    new_role: role,
  });
  if (error) throw new Error(error.message);
}
