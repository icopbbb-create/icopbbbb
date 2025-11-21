// app/api/pro-request/status/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/pro-request/status?email=...
 * Returns the latest matching request (by email, case-insensitive).
 * Response shape expected by UI: { ok: true, request: {...} }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const emailRaw = (url.searchParams.get("email") ?? "").toString().trim();
    if (!emailRaw) {
      return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
    }
    const email = emailRaw.toLowerCase();

    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("pro_requests")
      .select("id, email, status, requested_at, reviewed_at, reviewed_by, metadata, clerk_user_id")
      .ilike("email", email)
      .order("requested_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("pro-request/status: db error", error);
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) && data.length ? data[0] : null;
    return NextResponse.json({ ok: true, request: row }, { status: 200 });
  } catch (err: any) {
    console.error("pro-request/status: unexpected", err);
    return NextResponse.json({ ok: false, error: "internal_error", details: String(err) }, { status: 500 });
  }
}
