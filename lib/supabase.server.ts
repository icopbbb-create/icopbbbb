// lib/supabase.server.ts
// Dedicated server-only supabase admin client. Use in API routes / server handlers.
// This file intentionally validates env vars early so missing configuration surfaces in dev.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Try multiple env names to be resilient across environments.
 * Prefer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for server.
 */
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE;

/**
 * Basic validation: throw early in dev so missing server keys are obvious.
 */
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase server client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables. " +
      "Set SUPABASE_SERVICE_ROLE_KEY in .env.local (service role key). Do NOT expose this key to the browser."
  );
}

/**
 * Create an admin/client instance suitable for server-side operations.
 * This client uses the service-role key and must never be exposed in client bundles.
 */
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { "x-application-name": "edu-voice-agent-server" } },
});

/**
 * Helper alias (optional) for consistency with other helpers.
 * import { supabaseAdmin } from "@/lib/supabase.server";
 */
export default supabaseAdmin;
