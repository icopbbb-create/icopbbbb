// app/api/sessions/for-companion/[companionId]/transcript/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * Return the most recent session transcript for a given companion for the authenticated user.
 * This route uses the Supabase service-role key on the server, but strict user_id filtering prevents leakage.
 */

function pickTranscriptField(row: any) {
  if (!row) return null;
  if (row.transcript) return row.transcript;
  if (row.content) return row.content;
  if (row.text) return row.text;
  if (row.body) return row.body;
  if (Array.isArray(row.messages)) return row.messages.join("\n\n");
  for (const k of Object.keys(row)) {
    const v = row[k];
    if (typeof v === "string" && v.length > 20) return v;
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { companionId: string } }) {
  try {
    const { companionId } = params;
    if (!companionId) {
      return NextResponse.json({ error: "Missing companionId" }, { status: 400 });
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated — no Clerk user" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase
      .from("session_history")
      .select("*")
      .eq("companion_id", companionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("DB error in for-companion transcript route:", error);
      return NextResponse.json({ error: "Failed to fetch transcript (DB error)" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ transcript: null, message: "No session found" }, { status: 200 });
    }

    const transcript = pickTranscriptField(data);
    return NextResponse.json({
      transcript,
      row: {
        id: data.id,
        created_at: data.created_at,
        title: data.title,
        subject: data.subject,
      },
    });
  } catch (err: any) {
    console.error("Unexpected for-companion transcript error:", err);
    return NextResponse.json({ error: String(err?.message ?? "Server error") }, { status: 500 });
  }
}
