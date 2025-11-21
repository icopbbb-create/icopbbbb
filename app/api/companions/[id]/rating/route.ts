// app/api/companions/[id]/rating/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rating } = await req.json().catch(() => ({}));
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    const payload = {
      companion_id: params.id,
      user_id: user.id,
      rating,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("companion_ratings")
      .upsert(payload, { onConflict: ["companion_id", "user_id"] })
      .select()
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("companion rating supabase error", error);
      return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
    }

    return NextResponse.json({ message: "Rating saved", rating: data?.rating ?? rating });
  } catch (err: any) {
    console.error("companion rating error", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
