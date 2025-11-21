// app/api/credits/recharge/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * POST handler: create a recharge_requests row
 *
 * Body: { name, email, phone, requested_credits }
 *
 * Notes:
 * - Defensive JSON parsing (handles non-JSON bodies)
 * - Wraps Supabase calls in try/catch so we always return JSON (no HTML error pages)
 * - Logs useful debugging info in dev
 */

export async function POST(request: Request) {
  try {
    // --- safe parse body ---
    let body: any = {};
    try {
      // Try JSON parse first
      body = await request.json();
    } catch (jsonErr) {
      // If body isn't JSON (or parsing fails), try text and attempt to parse
      try {
        const txt = await request.text();
        if (txt) {
          body = JSON.parse(txt);
        } else {
          body = {};
        }
      } catch (txtErr) {
        // give up and treat as empty object
        body = {};
      }
    }

    // log incoming (truncate to avoid huge logs)
    try {
      console.debug("[recharge] incoming body:", JSON.stringify(body).slice(0, 2000));
    } catch (e) {
      // ignore stringify errors
    }

    const name = typeof body.name === "string" ? body.name.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const requested_credits = Number(body.requested_credits ?? 0);

    if (!email || !requested_credits || requested_credits <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();
    if (!supabase) {
      console.error("[recharge] supabase service role client not available");
      return NextResponse.json({ ok: false, error: "internal_service_unavailable" }, { status: 500 });
    }

    // Basic rate-limiting check: do not allow >1 pending request for same email in last 10 minutes
    let existing: any = null;
    try {
      const { data: existingData, error: errCheck } = await supabase
        .from("recharge_requests")
        .select("id, requested_at, status")
        .ilike("email", email)
        .order("requested_at", { ascending: false })
        .limit(1);

      if (errCheck) {
        // Log but continue — not fatal for insertion path
        console.error("[recharge] check existing err:", errCheck);
      } else {
        existing = existingData;
      }
    } catch (e: any) {
      console.error("[recharge] unexpected error during existing-check:", e);
      // continue to insertion attempt; don't leak internal error to client beyond generic error if insert fails
    }

    if (Array.isArray(existing) && existing.length) {
      const last = existing[0];
      if (last?.status === "pending") {
        // reject quick duplicate
        return NextResponse.json({ ok: false, error: "duplicate_pending" }, { status: 429 });
      }
    }

    // Insert recharge request
    const insertPayload: any = {
      email,
      name,
      phone,
      requested_credits,
      status: "pending",
    };

    try {
      const { data, error } = await supabase
        .from("recharge_requests")
        .insert([insertPayload])
        .select("id")
        .limit(1)
        .single();

      if (error || !data) {
        console.error("[recharge] insert error:", error);
        return NextResponse.json({ ok: false, error: "db_insert_failed" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, id: data.id });
    } catch (insertErr: any) {
      // unexpected insertion error
      console.error("[recharge] unexpected insert error:", insertErr);
      return NextResponse.json({ ok: false, error: "db_insert_failed" }, { status: 500 });
    }
  } catch (err: any) {
    // catch-all: ensure we always return JSON
    console.error("[recharge] unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message ?? err),
        ...(process.env.NODE_ENV === "development" ? { stack: err?.stack } : {}),
      },
      { status: 500 }
    );
  }
}
