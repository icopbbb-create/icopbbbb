// lib/supabase-server.ts
// Server-only Supabase helper — returns a service-role client for admin actions.
// Place this file at /lib/supabase-server.ts so imports like "@/lib/supabase-server" work.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _serviceClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client initialized with the SUPABASE_SERVICE_ROLE_KEY.
 * IMPORTANT: This client must only be used in server-side code (API routes,
 * server components). Do NOT expose the service role key to the browser.
 */
export function getSupabaseServer(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase service client not configured. Ensure SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are set in your environment."
    );
  }

  _serviceClient = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  return _serviceClient;
}

/**
 * If you need a normal (non-service) server client (anon key) for safe reads,
 * you can use this helper. Anon clients still enforce RLS.
 */
export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Supabase anon client not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment."
    );
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}
