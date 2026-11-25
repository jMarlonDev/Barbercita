import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for the browser (public).
 *
 * Uses the anon key exposed via `VITE_SUPABASE_URL` and
 * `VITE_SUPABASE_ANON_KEY`. All queries go through Row-Level Security
 * (RLS), so this client is safe to use in components and routes.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
