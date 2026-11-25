import { createClient } from '@supabase/supabase-js'

/**
 * Create a privileged Supabase client for server-side use only.
 *
 * Uses `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses Row-Level Security**.
 * A fresh client is returned on every call to avoid leaking elevated
 * privileges across requests.
 *
 * **Security constraint:** this module must never be imported from
 * components, routes, or any code that ends up in the client bundle.
 * Only import it from server functions (`src/server/*.ts`).
 */
export function createServerSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars',
    )
  }

  return createClient(url, key)
}
