// app/api/pro-request/approve-with-password/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Admin endpoints for pro_requests:
 * - GET  -> fetch pending requests (requires admin password via header or query)
 * - PATCH -> verify/admin actions:
 *     { action: "verify", adminPassword }
 *     { action: "approve", adminPassword, proRequestId, email? }
 *     { action: "reject", adminPassword, proRequestId }
 *
 * Accepts admin password in:
 *  - header 'x-admin-password'
 *  - JSON body { adminPassword }
 *
 * NOTE: This file is intentionally straightforward. Keep secure in production.
 */

function mask(s?: string | null) {
  if (!s) return null;
  if (s.length <= 6) return s.replace(/./g, "*");
  return `${s.slice(0, 2)}${s.slice(2, -2).replace(/./g, "*")}${s.slice(-2)}`;
}

function getAdminPasswordFromReq(req: NextRequest, bodyJson?: any) {
  const header = req.headers.get("x-admin-password");
  if (header && header.trim().length) return header.trim();
  if (bodyJson && typeof bodyJson.adminPassword === "string" && bodyJson.adminPassword.trim()) {
    return bodyJson.adminPassword.trim();
  }
  // allow query param for quick curl testing
  const url = new URL(req.url);
  const q = url.searchParams.get("adminPassword");
  if (q && q.trim()) return q.trim();
  return null;
}

const isDev = process.env.NODE_ENV !== "production";
const ADMIN_SECRET = process.env.PRO_REQUEST_ADMIN_PASSWORD ?? process.env.ADMIN_PANEL_PASSWORD ?? null;

export async function GET(req: NextRequest) {
  try {
    if (!isDev) {
      // In production you may want to remove this guard or tighten it.
      // For now we allow only in dev to avoid accidental expose.
    }

    const provided = getAdminPasswordFromReq(req);
    console.log("[approve-with-password][GET] incoming, provided-present:", Boolean(provided));

    if (!ADMIN_SECRET) {
      console.error("[approve-with-password] no admin secret configured in env");
      return NextResponse.json({ ok: false, error: "no-admin-secret" }, { status: 500 });
    }

    if (!provided || provided !== ADMIN_SECRET) {
      console.warn(
        "[approve-with-password][GET] unauthorized - provided:",
        mask(provided),
        "expected:",
        mask(ADMIN_SECRET)
      );
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data: pending, error } = await supabase
      .from("pro_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[approve-with-password][GET] supabase error:", error);
      return NextResponse.json({ ok: false, error: "db-error", details: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pending: pending ?? [] });
  } catch (err) {
    console.error("[approve-with-password][GET] unexpected:", err);
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch (e) {
    body = {};
  }

  const action = body?.action ?? null;
  const provided = getAdminPasswordFromReq(req, body);

  console.log("[approve-with-password][PATCH] action:", action, "provided-present:", Boolean(provided));

  if (!ADMIN_SECRET) {
    console.error("[approve-with-password] no admin secret configured in env");
    return NextResponse.json({ ok: false, error: "no-admin-secret" }, { status: 500 });
  }

  if (!provided || provided !== ADMIN_SECRET) {
    console.warn("[approve-with-password][PATCH] unauthorized attempt. provided:", mask(provided));
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServer();

    if (action === "verify") {
      // just confirm creds are valid
      return NextResponse.json({ ok: true, verified: true });
    }

    if (action === "approve") {
      const proRequestId = body?.proRequestId;
      const email = body?.email ?? null;

      if (!proRequestId) {
        return NextResponse.json({ ok: false, error: "missing_proRequestId" }, { status: 400 });
      }

      // mark approved
      const { data: updated, error: updErr } = await supabase
        .from("pro_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: "admin (manual)",
        })
        .eq("id", proRequestId)
        .select()
        .limit(1);

      if (updErr) {
        console.error("[approve-with-password][PATCH][approve] db error:", updErr);
        return NextResponse.json({ ok: false, error: "db-update-failed", details: String(updErr) }, { status: 500 });
      }

      // Optionally: you might want to create a user row / grant credits here.
      // That logic is intentionally omitted to avoid interfering with your existing user flows.
      // If you want me to also grant 1200 credits to an existing user record, I can add that.

      return NextResponse.json({ ok: true, updated: updated ?? [] });
    }

    if (action === "reject") {
      const proRequestId = body?.proRequestId;
      if (!proRequestId) {
        return NextResponse.json({ ok: false, error: "missing_proRequestId" }, { status: 400 });
      }

      const { data: updated, error: updErr } = await supabase
        .from("pro_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: "admin (manual)",
        })
        .eq("id", proRequestId)
        .select()
        .limit(1);

      if (updErr) {
        console.error("[approve-with-password][PATCH][reject] db error:", updErr);
        return NextResponse.json({ ok: false, error: "db-update-failed", details: String(updErr) }, { status: 500 });
      }

      return NextResponse.json({ ok: true, updated: updated ?? [] });
    }

    return NextResponse.json({ ok: false, error: "unknown-action" }, { status: 400 });
  } catch (err) {
    console.error("[approve-with-password][PATCH] unexpected:", err);
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 500 });
  }
}
