// app/api/companions/[id]/recent-session/route.ts
import { NextResponse } from "next/server";

/**
 * Example server-side handler to return the most recent session id
 * for a companion. Adjust to match your DB schema and Supabase client.
 *
 * Returns:
 *  - 200 { sessionId: "<uuid>" } when found
 *  - 404 { error: "No recent session" } when none found
 *  - 500 on unexpected errors
 */

// --- IMPORT YOUR SUPABASE SERVER CLIENT HERE ---
// Replace this with your project's server-side supabase client
// e.g. import { supabaseServer } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id?: string } }) {
  const companionId = params?.id ?? null;
  if (!companionId) {
    return NextResponse.json({ error: "Missing companion id" }, { status: 400 });
  }

  try {
    // Create a Supabase server client tied to the request (auth helpers used for example)
    const supabase = createServerSupabaseClient({ req, res: undefined as any });

    // Query the sessions table for the most recent session with this companion id.
    // Adjust table and column names to match your schema.
    // Example assumes you have a "session_history" table with companion_id and created_at
    const { data, error } = await supabase
      .from("session_history")
      .select("id, created_at")
      .eq("companion_id", companionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("recent-session supabase error:", error);
      return NextResponse.json({ error: "DB query failed" }, { status: 500 });
    }

    if (!data || !data.id) {
      return NextResponse.json({ error: "No recent session" }, { status: 404 });
    }

    return NextResponse.json({ sessionId: data.id }, { status: 200 });
  } catch (err) {
    console.error("recent-session handler error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
