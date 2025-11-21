// app/api/pro-request/approve/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Approve a pro_request. This endpoint is intentionally minimal:
 * - Accepts JSON { id } OR { email }
 * - Requires header 'x-admin-pass' matching process.env.PRO_REQUEST_ADMIN_PASSWORD
 * - Marks status='approved' and sets reviewed_at/reviewed_by
 *
 * You can call this from your admin UI (app/admin/pro-requests/page.tsx) when admin approves.
 */

export async function POST(request: Request) {
  const adminPass = process.env.PRO_REQUEST_ADMIN_PASSWORD ?? "";
  const provided = request.headers.get("x-admin-pass") ?? "";

  if (!adminPass || provided !== adminPass) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = (body?.id ?? null) as string | null;
    const emailRaw = (body?.email ?? "").toString().trim() ?? null;
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const reviewedBy = body?.reviewed_by ?? "admin (manual)";

    if (!id && !email) {
      return NextResponse.json({ error: "id_or_email_required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    let query = supabase.from("pro_requests").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    });

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.ilike("email", email!);
    }

    const { data, error } = await query.select().limit(1);

    if (error) {
      console.error("pro-request/approve: db error:", error);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err: any) {
    console.error("pro-request/approve: unexpected error:", err);
    return NextResponse.json({ error: "internal_error", detail: String(err) }, { status: 500 });
  }
}
