// src/data/admin/mediaQueries.js
// Upload and delete helpers for the homepage Supabase Storage bucket.
// Used by admin media UI only — never called from public-facing components.

import { supabase } from '../timeline/supabaseClient.js';

const BUCKET = 'homepage';
const BUCKET_HOST = 'kqlfvwlzayinngrgafec.supabase.co/storage';

/**
 * Upload a file to the homepage bucket.
 * Returns the public URL.
 */
export async function uploadToHomepage(file) {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from the homepage bucket.
 * Skips silently if the URL is not from our own storage bucket.
 */
export async function deleteStorageFile(url) {
  if (!url || !url.includes(BUCKET_HOST)) return;
  // Extract the path after /object/public/homepage/
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
