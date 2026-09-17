import { createClient, SupabaseClient } from '@supabase/supabase-js';

let rawClient: SupabaseClient | null = null;

/**
 * Returns a direct Supabase client instance (server-side only)
 * bypassing the NeonProxyBuilder monkey-patch in lib/supabase.ts.
 * Returns null if Supabase credentials are not configured.
 */
export function getRawSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key || url.includes('placeholder')) {
    return null;
  }

  if (!rawClient) {
    rawClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return rawClient;
}
