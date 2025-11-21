// app/api/pro-request/public/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Public endpoint: create / upsert a pro_request
 * POST body: { username?, email, password_hint?, metadata? }
 */
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer();
    const body = await req.json().catch(() => ({}));
    const emailRaw = (body?.email ?? "").toString().trim();
    const email = emailRaw.toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
    }

    const username = (body?.username ?? null) as string | null;
    const password_hint = (body?.password_hint ?? null) as string | null;
    const metadata = body?.metadata ?? {};
    const clerk_user_id = body?.clerk_user_id ?? null;
    const user_id = body?.user_id ?? null;

    // If there is already a request for this email, update it (set to pending).
    const { data: existing, error: findErr } = await supabase
      .from("pro_requests")
      .select("*")
      .ilike("email", email)
      .order("requested_at", { ascending: false })
      .limit(1);

    if (findErr) {
      console.error("pro-request/public: find error", findErr);
      return NextResponse.json({ ok: false, error: "db_error", details: findErr.message }, { status: 500 });
    }

    if (Array.isArray(existing) && existing.length > 0) {
      // update existing row: set status to pending and refresh requested_at
      const row = existing[0];
      const { data: updated, error: updErr } = await supabase
        .from("pro_requests")
        .update({
          status: "pending",
          requested_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
          message: password_hint ?? row.message ?? null,
          metadata: { ...(row.metadata ?? {}), ...(metadata ?? {}), username: username ?? (row.metadata?.username ?? null) },
          clerk_user_id,
          user_id,
        })
        .eq("id", row.id)
        .select()
        .limit(1);

      if (updErr) {
        console.error("pro-request/public: update err", updErr);
        return NextResponse.json({ ok: false, error: "db_error", details: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, request: Array.isArray(updated) ? updated[0] : updated }, { status: 200 });
    }

    // otherwise insert a new request
    const insertPayload = {
      email,
      message: password_hint ?? null,
      status: "pending",
      metadata: { ...(metadata ?? {}), username: username ?? null },
      clerk_user_id,
      user_id,
    };

    const { data: insData, error: insErr } = await supabase
      .from("pro_requests")
      .insert([insertPayload])
      .select()
      .limit(1);

    if (insErr) {
      console.error("pro-request/public: insert err", insErr);
      return NextResponse.json({ ok: false, error: "db_error", details: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, request: Array.isArray(insData) ? insData[0] : insData }, { status: 201 });
  } catch (err: any) {
    console.error("pro-request/public: unexpected", err);
    return NextResponse.json({ ok: false, error: "internal_error", details: String(err) }, { status: 500 });
  }
}
