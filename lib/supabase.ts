// lib/supabase.ts
// A single source of truth for Supabase clients (browser-safe + server helper).
// - `supabase` is safe for browser/client usage (uses NEXT_PUBLIC_* keys).
// - `getSupabaseServiceRole()` returns a server-only client using the SERVICE ROLE key.
// IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Prefer explicit NEXT_PUBLIC_* values for browser usage but allow a SUPABASE_URL fallback
 * in server environments when NEXT_PUBLIC_* isn't set (helps some hosting setups).
 */
const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const PUBLIC_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Basic runtime checks to give clear errors early.
 * These will throw at import time in dev, which helps diagnose missing env vars.
 */
if (!PUBLIC_URL) {
  throw new Error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL). Set this in .env.local or in your host env."
  );
}
if (!PUBLIC_ANON_KEY) {
  throw new Error(
    "Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY. Set this in .env.local or in your host env (browser anon key)."
  );
}

/**
 * Client-side (browser) supabase instance.
 * Use this in client components / browser code.
 */
export const supabase: SupabaseClient = createClient(PUBLIC_URL, PUBLIC_ANON_KEY, {
  // Keep sessions out of localstorage in SSR flows if you prefer:
  auth: { persistSession: false },
});

/**
 * Server-side / admin client (service role).
 * Use this only in server code (API routes, route handlers, server components).
 * It gives elevated permissions — do not leak the key to the browser.
 */
let _serviceRoleClient: SupabaseClient | null = null;
export function getSupabaseServiceRole(): SupabaseClient {
  if (!_serviceRoleClient) {
    if (!SERVICE_ROLE_KEY) {
      throw new Error(
        "Missing env: SUPABASE_SERVICE_ROLE_KEY. This must be set only on the server (do NOT expose it as NEXT_PUBLIC_*)."
      );
    }
    _serviceRoleClient = createClient(PUBLIC_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _serviceRoleClient;
}

/**
 * Convenience: a small wrapper for server code that wants a guaranteed admin client.
 * Example:
 *    const supabaseAdmin = getSupabaseServiceRole();
 *    await supabaseAdmin.from('companions').insert([...]);
 */
export const getSupabaseAdmin = getSupabaseServiceRole;
