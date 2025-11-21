// app/api/pro-request/debug/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServer();

    // small diagnostic: return counts by status and sample pending rows
    const [{ data: counts }, { data: pending }] = await Promise.all([
      supabase.rpc("", {}).then(() => ({ data: null })).catch(() => ({ data: null })).catch(() => ({ data: null })),
      supabase
        .from("pro_requests")
        .select("id, email, status, requested_at, metadata")
        .order("requested_at", { ascending: false })
        .limit(10),
    ]).catch(() => [ { data: null }, { data: null } ]);

    // If the above rpc path failed (we used a no-op), do a safe fallback query for counts:
    const { data: counts2 } = await supabase
      .from("pro_requests")
      .select("status")
      .maybeSingle()
      .catch(() => ({ data: null }));

    // simpler, return some rows so admin can inspect quickly
    const { data: someRows, error } = await supabase
      .from("pro_requests")
      .select("id, email, status, requested_at, metadata")
      .order("requested_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("pro-request/debug: error", error);
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sample: someRows ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("pro-request/debug: unexpected", err);
    return NextResponse.json({ ok: false, error: "internal_error", details: String(err) }, { status: 500 });
  }
}
