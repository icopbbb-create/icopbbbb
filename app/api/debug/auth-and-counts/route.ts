// app/api/debug/auth-and-counts/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // Clerk auth from request (server)
    const { userId, sessionId } = getAuth(req);

    // also attempt to return safeCurrentUser-like minimal info
    // (you may already have a safeCurrentUser helper — this duplicates minimally)
    const safeUser = userId
      ? { id: userId }
      : null;

    // Admin supabase client (service role)
    const supabase = getSupabaseServiceRole();

    // Helper to safely count rows for a given table & filter
    const countFor = async (table: string, eqCol: string, eqVal: string | null) => {
      try {
        if (!eqVal) return { count: 0 };
        const q = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq(eqCol, eqVal)
          .is("deleted_at", null);
        const res = await q;
        return { count: res.count ?? 0, error: res.error ? String(res.error) : null };
      } catch (err: any) {
        return { count: 0, error: String(err?.message ?? err) };
      }
    };

    // Helper to sample rows
    const sampleFor = async (table: string, eqCol: string, eqVal: string | null, cols = "*") => {
      try {
        if (!eqVal) return [];
        const { data, error } = await supabase
          .from(table)
          .select(cols)
          .eq(eqCol, eqVal)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) {
          return { error: String(error) };
        }
        return data ?? [];
      } catch (err: any) {
        return { error: String(err?.message ?? err) };
      }
    };

    // Which clerk id we will inspect (prefer the authenticated userId)
    const inspectId = userId ?? null;

    // Counts
    const [sessionCounts, bookmarkCounts, companionCounts] = await Promise.all([
      countFor("session_history", "user_id", inspectId),
      countFor("bookmarks", "user_id", inspectId),
      countFor("companions", "author", inspectId),
    ]);

    // Samples
    const [sessionSamples, bookmarkSamples, companionSamples] = await Promise.all([
      sampleFor("session_history", "user_id", inspectId, "id, user_id, created_at, metadata, transcript"),
      sampleFor("bookmarks", "user_id", inspectId, "id, companion_id, user_id, created_at, deleted_at"),
      sampleFor("companions", "author", inspectId, "id, name, author, created_at, subject, deleted_at"),
    ]);

    return NextResponse.json(
      {
        ok: true,
        getAuth: { userId, sessionId },
        safeCurrentUser: safeUser,
        counts: {
          session_history: sessionCounts,
          bookmarks: bookmarkCounts,
          companions: companionCounts,
        },
        samples: {
          session_history: sessionSamples,
          bookmarks: bookmarkSamples,
          companions: companionSamples,
        },
        note:
          "This endpoint uses the service-role admin client to read rows for the authenticated Clerk id. Use from two different browser profiles to confirm per-user counts.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("debug/auth-and-counts error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
