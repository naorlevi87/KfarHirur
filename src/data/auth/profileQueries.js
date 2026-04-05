// src/data/auth/profileQueries.js
// Profile DB queries: fetch, upsert display name / avatar.

import { supabase } from '../timeline/supabaseClient.js';

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function upsertUserProfile(userId, { displayName, avatarUrl }) {
  const payload = { id: userId };
  if (displayName !== undefined) payload.display_name = displayName;
  if (avatarUrl   !== undefined) payload.avatar_url   = avatarUrl;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' });
  return error ? error.message : null;
}

// Uploads a File object to the avatars bucket and returns the public URL.
export async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
