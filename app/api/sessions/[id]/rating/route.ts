// app/api/sessions/[id]/rating/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: any }) {
  try {
    // Next App Router exposes `params` as a possibly async object — await before using.
    const p = await params;
    const sessionId = p?.id;
    if (!sessionId) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rating = body?.rating;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    // Clerk user id is a string like "user_..." — keep as string (DB user_id should be TEXT).
    const payload = {
      session_id: sessionId,
      user_id: user.id,
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
      console.error("session rating supabase error", error);
      return NextResponse.json({ error: "Failed to save rating", detail: error }, { status: 500 });
    }

    return NextResponse.json({ message: "Rating saved", rating: data?.rating ?? rating });
  } catch (err: any) {
    console.error("session rating error", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
