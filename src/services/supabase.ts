import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // It's fine for dev — env vars can be provided at runtime. Keep a runtime-warning.
  // Avoid throwing so builds/typechecks in CI don't fail when secrets aren't present.
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY not set.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
