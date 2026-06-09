// src/data/commons/commonsClient.js
// Commons Engine data handle: the shared Supabase client scoped to the `commons` schema.
// Import this only inside src/data/commons/ — never from components or features directly.

import { supabase } from '../timeline/supabaseClient.js';

// Every commons-engine table read/write goes through this schema-scoped handle.
export const commonsDb = supabase.schema('commons');
