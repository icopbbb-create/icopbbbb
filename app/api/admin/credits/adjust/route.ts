// app/api/admin/credits/adjust/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * Admin credits adjustment endpoint (patched)
 *
 * Security:
 * - Requires header: x-admin-password matching process.env.PRO_REQUEST_ADMIN_PASSWORD
 *
 * Body (JSON) accepted:
 * {
 *   "user_id": "<uuid>"            // preferred: update by user_id
 *   "email": "user@example.com"   // fallback: find user by email if no user_id
 *   "change_amount": 120,         // integer (positive to add, negative to deduct)
 *   "reason": "manual top-up",    // optional string
 *   "admin_by": "admin-identifier", // optional string for audit
 *   "adjust_used": false,         // optional boolean: whether to also increment credits_used (default false)
 *   "recharge_request_id": "<uuid>" // optional: mark recharge_requests row fulfilled
 * }
 *
 * Response:
 * { ok: true, user: { ...updated user row... }, credit_history_id: "<uuid>", recharge_request_updated: true|false }
 *
 * Notes on changes:
 * - Defensive JSON parsing
 * - Uses getSupabaseServiceRole() and guards if not available
 * - Writes an audit row into `credits_history` (schema expected: user_id, change_amount, action, before_balance, after_balance, note, created_at, archived)
 * - Returns consistent JSON on all error paths
 */

export async function PATCH(request: Request) {
  try {
    // simple admin guard using env var used elsewhere in your app
    const adminHeader = request.headers.get("x-admin-password") ?? "";
    const expected = process.env.PRO_REQUEST_ADMIN_PASSWORD ?? "";

    if (!expected || adminHeader !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // defensive parse
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      try {
        const t = await request.text();
        body = t ? JSON.parse(t) : {};
      } catch {
        body = {};
      }
    }

    const supabase = getSupabaseServiceRole();
    if (!supabase) {
      console.error("[admin/credits/adjust] supabase client not available");
      return NextResponse.json({ ok: false, error: "internal_service_unavailable" }, { status: 500 });
    }

    // Validate input
    const change_amount = Number(body.change_amount ?? NaN);
    if (!Number.isFinite(change_amount) || Math.round(change_amount) !== change_amount) {
      return NextResponse.json({ ok: false, error: "invalid_change_amount" }, { status: 400 });
    }

    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
    const admin_by = typeof body.admin_by === "string" && body.admin_by.trim() ? body.admin_by.trim() : "admin";
    const adjust_used = Boolean(body.adjust_used ?? false);
    const recharge_request_id =
      typeof body.recharge_request_id === "string" && body.recharge_request_id.trim()
        ? body.recharge_request_id.trim()
        : null;

    // Find user by id or email
    let userRow: any = null;
    if (body.user_id) {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, plan, credits_remaining, credits_used, blocked, credits_updated_at")
        .eq("id", body.user_id)
        .maybeSingle();
      if (error) {
        console.error("[admin/credits/adjust] db lookup by id error:", error);
        return NextResponse.json({ ok: false, error: "db_lookup_error" }, { status: 500 });
      }
      userRow = data ?? null;
    } else if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      const { data, error } = await supabase
        .from("users")
        .select("id, email, plan, credits_remaining, credits_used, blocked, credits_updated_at")
        .ilike("email", email)
        .maybeSingle();
      if (error) {
        console.error("[admin/credits/adjust] db lookup by email error:", error);
        return NextResponse.json({ ok: false, error: "db_lookup_error" }, { status: 500 });
      }
      userRow = data ?? null;
    } else {
      return NextResponse.json({ ok: false, error: "missing_user_identifier" }, { status: 400 });
    }

    if (!userRow) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    // Compute new values
    const prevRemaining = Number(userRow.credits_remaining ?? 0);
    const prevUsed = Number(userRow.credits_used ?? 0);

    let newRemaining = prevRemaining + change_amount;
    // Safety floor
    if (newRemaining < -1000000) newRemaining = -1000000;

    let newUsed = prevUsed;
    if (adjust_used) {
      if (change_amount < 0) {
        newUsed = prevUsed + Math.abs(change_amount);
      } else {
        // no automatic decrement for used on top-up; keep as-is
        newUsed = prevUsed;
      }
    }

    // ensure integers
    newRemaining = Math.round(newRemaining);
    newUsed = Math.round(newUsed);

    // update users row
    const { data: updatedUser, error: updateErr } = await supabase
      .from("users")
      .update({
        credits_remaining: newRemaining,
        credits_used: newUsed,
        blocked: newRemaining <= 0 ? true : false,
        credits_updated_at: new Date().toISOString(),
      })
      .eq("id", userRow.id)
      .select("id, email, plan, credits_remaining, credits_used, blocked, credits_updated_at")
      .single();

    if (updateErr) {
      console.error("[admin/credits/adjust] failed to update user:", updateErr);
      return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
    }

    // insert credits_history audit row (schema: user_id, change_amount, action, before_balance, after_balance, note, created_at, archived)
    const chPayload: any = {
      user_id: userRow.id,
      change_amount: change_amount,
      action: "admin_manual_adjust",
      before_balance: prevRemaining,
      after_balance: newRemaining,
      note: reason ? `${reason} — admin:${admin_by}` : `admin_manual_adjust — admin:${admin_by}`,
      created_at: new Date().toISOString(),
      archived: false,
    };

    const { data: chData, error: chErr } = await supabase
      .from("credits_history")
      .insert([chPayload])
      .select("id")
      .single();

    if (chErr) {
      console.error("[admin/credits/adjust] failed to insert credits_history:", chErr);
      // Not fatal for user update, but surface error
      return NextResponse.json({ ok: false, error: "credit_history_failed", user: updatedUser }, { status: 500 });
    }

    // Optionally fulfill a recharge_request (if provided)
    let rechargeUpdated = false;
    if (recharge_request_id) {
      try {
        const { data: rrData, error: rrErr } = await supabase
          .from("recharge_requests")
          .update({
            status: "fulfilled",
            fulfilled_at: new Date().toISOString(),
            admin_note: admin_by,
          })
          .eq("id", recharge_request_id)
          .select("id, status, fulfilled_at")
          .maybeSingle();

        if (rrErr) {
          console.error("[admin/credits/adjust] failed to update recharge_requests:", rrErr);
        } else if (rrData) {
          rechargeUpdated = true;
        }
      } catch (e: any) {
        console.error("[admin/credits/adjust] unexpected error updating recharge_requests:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      user: updatedUser,
      credit_history_id: chData.id,
      recharge_request_updated: rechargeUpdated,
    });
  } catch (err: any) {
    console.error("[admin/credits/adjust] unexpected error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
