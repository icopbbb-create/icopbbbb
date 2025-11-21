// app/api/companions/[id]/latest-session/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase.server"; // adjust path if needed

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const companionId = params.id;
    if (!companionId) return NextResponse.json({ error: "Missing companion id" }, { status: 400 });

    // Attempt to find the latest session for this companion
    const { data, error } = await supabaseAdmin
      .from("session_history")
      .select("id")
      .eq("companion_id", companionId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    const latest_session_id = data?.[0]?.id ?? null;
    return NextResponse.json({ latest_session_id });
  } catch (err: any) {
    console.error("latest-session error", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
