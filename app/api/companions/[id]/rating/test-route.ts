// app/api/sessions/[id]/rating/test-route.ts
import { NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { rating, user_id } = (await req.json().catch(() => ({}))) as {
      rating?: number;
      user_id?: string;
    };

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating (1-5 required)" }, { status: 400 });
    }

    // provide a user_id for testing (if not provided)
    const uid = user_id ?? "test-user-" + (Math.random() + "").slice(2, 8);

    const supabase = getSupabaseServiceRole();

    const payload = {
      session_id: params.id,
      user_id: uid,
      rating,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("session_ratings")
      .upsert(payload, { onConflict: ["session_id", "user_id"] })
      .select()
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("test-session rating supabase error:", error);
      return NextResponse.json({ error: "DB error", detail: error }, { status: 500 });
    }

    return NextResponse.json({ message: "Test rating saved", rating: data?.rating ?? rating, data });
  } catch (err: any) {
    console.error("test-route error", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
