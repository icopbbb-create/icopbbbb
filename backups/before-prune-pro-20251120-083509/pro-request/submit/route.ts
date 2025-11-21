// app/api/pro-request/submit/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailRaw = (body?.email ?? "").toString();
    const email = emailRaw.trim().toLowerCase();
    const message = (body?.message ?? "").toString();

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // insert a new pro_requests row (id defaults to gen_random_uuid())
    const { data, error } = await supabase
      .from("pro_requests")
      .insert([
        {
          email,
          message,
          status: "pending",
          metadata: body?.metadata ?? {},
          clerk_user_id: body?.clerk_user_id ?? null,
          user_id: body?.user_id ?? null,
        },
      ])
      .select()
      .limit(1);

    if (error) {
      console.error("pro-request/submit: supabase insert error:", error);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, row: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: any) {
    console.error("pro-request/submit: unexpected error:", err);
    return NextResponse.json({ error: "internal_error", detail: String(err) }, { status: 500 });
  }
}
