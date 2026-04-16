// src/data/pageContent/pageContent.queries.js
// Supabase fetch + upsert for the page_content table.

import { supabase } from '../timeline/supabaseClient.js';

/**
 * Fetch all content rows for a page + locale.
 * Returns array of { field_path, mode, value }.
 */
export async function fetchPageContent(pageKey, locale = 'he') {
  const { data, error } = await supabase
    .from('page_content')
    .select('field_path, mode, value')
    .eq('page_key', pageKey)
    .eq('locale', locale);

  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert a single content field.
 * value must be a string or array of strings.
 */
export async function upsertPageContent({ pageKey, fieldPath, mode, locale = 'he', value }) {
  const { error } = await supabase
    .from('page_content')
    .upsert(
      {
        page_key:   pageKey,
        field_path: fieldPath,
        mode,
        locale,
        value,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      },
      { onConflict: 'page_key,field_path,mode,locale' }
    );

  if (error) throw error;
}

/**
 * Delete rows for specific field paths + modes (used to clean up stale rows when
 * switching a field between shared and naor/shay split).
 * fieldPaths: string[]
 * modes: ('shared' | 'naor' | 'shay')[]
 */
export async function deletePageContentRows({ pageKey, locale = 'he', fieldPaths, modes }) {
  const { error } = await supabase
    .from('page_content')
    .delete()
    .eq('page_key', pageKey)
    .eq('locale', locale)
    .in('field_path', fieldPaths)
    .in('mode', modes);

  if (error) throw error;
}

/**
 * Upsert multiple fields at once (one section save).
 * rows: Array of { fieldPath, mode, value }
 */
export async function upsertPageContentBatch({ pageKey, locale = 'he', rows }) {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const now = new Date().toISOString();

  const records = rows.map(({ fieldPath, mode, value }) => ({
    page_key:   pageKey,
    field_path: fieldPath,
    mode,
    locale,
    value,
    updated_at: now,
    updated_by: userId,
  }));

  const { error } = await supabase
    .from('page_content')
    .upsert(records, { onConflict: 'page_key,field_path,mode,locale' });

  if (error) throw error;
}
