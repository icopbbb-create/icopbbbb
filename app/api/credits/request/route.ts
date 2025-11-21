// app/api/credits/request/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/credits/request
 *
 * Accepts:
 *  { userId?, username, name?, email, phone?, price, credits, provider?, note?, receipt_base64?, receipt_filename?, transaction_id? }
 *
 * The transaction_id, if provided, is saved into 'qr_reference' column (existing column in your schema).
 * This file preserves previous safety checks (avoid invalid UUID insertion into user_id, avoid storing
 * large base64 blobs in main table, and surfaces provided username/notes in admin_note when helpful).
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// RFC 4122-ish UUID validator to avoid 22P02 invalid uuid errors
function isValidUUIDv4(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val.trim()
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;

    // Require at least one identifier (username | userId | email)
    if (!body || (!body.username && !body.userId && !body.email)) {
      return NextResponse.json(
        { ok: false, error: "missing_identifier (username|userId|email required)" },
        { status: 400 }
      );
    }

    // Require price/credits (or requested_amount/requested_credits)
    const hasPrice =
      body.price != null || body.requested_amount != null || body.amount_paid != null;
    const hasCredits =
      body.credits != null || body.requested_credits != null;

    if (!hasPrice || !hasCredits) {
      return NextResponse.json({ ok: false, error: "missing_price_or_credits" }, { status: 400 });
    }

    // Normalize inputs
    const rawUserId = body.userId ?? null;
    const email = body.email ? String(body.email).toLowerCase() : null;
    const name = body.name ? String(body.name) : null;
    const phone = body.phone ? String(body.phone) : null;
    const username = body.username ? String(body.username) : null;
    const provider = body.provider ? String(body.provider) : "manual_qr";
    const transactionId = body.transaction_id ? String(body.transaction_id).trim() : null;

    // Numeric coercion
    const requestedCredits = Number(body.requested_credits ?? body.credits ?? 0);
    const requestedAmount =
      Number(body.requested_amount ?? body.price ?? body.amount_paid ?? 0);

    const credits = Number.isFinite(requestedCredits) ? Math.round(requestedCredits) : null;
    const amount = Number.isFinite(requestedAmount) ? requestedAmount : null;

    // Build canonical record matching your recharge_requests table columns:
    // id, user_id, email, name, phone, requested_credits, amount_paid, qr_reference, status, admin_note, requested_at, fulfilled_at
    const record: Record<string, any> = {
      user_id: null,
      email,
      name,
      phone,
      requested_credits: credits,
      amount_paid: amount,
      qr_reference: null,
      status: "pending",
      admin_note: null,
      requested_at: new Date().toISOString(),
    };

    // user_id safety: only insert valid UUIDs
    if (rawUserId) {
      if (isValidUUIDv4(rawUserId)) {
        record.user_id = rawUserId;
      } else {
        // Not a valid uuid — preserve value for admin debugging in admin_note.
        record.admin_note = `provided_userId_not_uuid: ${String(rawUserId)}`;
        console.warn("[credits/request] provided userId is not a valid UUID — storing in admin_note instead.");
      }
    }

    // preserve username for admins (if provided) — put into admin_note (table doesn't have username column)
    if (username) {
      const add = `username:${username}`;
      record.admin_note = record.admin_note ? `${record.admin_note} | ${add}` : add;
    }

    // transaction_id takes precedence for qr_reference (used for verification)
    if (transactionId) {
      record.qr_reference = transactionId;
    } else if (body.receipt_filename) {
      // fallback to receipt filename if provided
      record.qr_reference = String(body.receipt_filename);
    } else if (typeof body.note === "string" && body.note.trim().length > 0) {
      // fallback short note into qr_reference (truncated)
      record.qr_reference = body.note.trim().slice(0, 1000);
    }

    // If receipt_base64 was provided, don't store blob in main table. mark in admin_note instead.
    if (typeof body.receipt_base64 === "string" && body.receipt_base64.length > 0) {
      const sizeKb = Math.round((body.receipt_base64.length * (3 / 4)) / 1024);
      const note = `receipt_base64_uploaded(${sizeKb}KB)${body.receipt_filename ? `:${body.receipt_filename}` : ""}`;
      record.admin_note = record.admin_note ? `${record.admin_note} | ${note}` : note;
    }

    // Final safety: null out undefined
    Object.keys(record).forEach((k) => {
      if (record[k] === undefined) record[k] = null;
    });

    // Insert
    const { data, error } = await supabaseAdmin
      .from("recharge_requests")
      .insert([record])
      .select("id")
      .single();

    if (error) {
      console.error("[credits/request] insert error:", error);

      // Detect PostgREST schema-cache missing column (PGRST204)
      const errMsg = (error as any)?.message ?? String(error);
      if ((error as any)?.code === "PGRST204" || /Could not find the '/i.test(errMsg) || /column .* does not exist/i.test(errMsg)) {
        console.error("[credits/request] detected schema cache / missing column error. Restart dev server or sync DB schema.");
        return NextResponse.json(
          { ok: false, error: "db_schema_mismatch_or_missing_columns", details: errMsg },
          { status: 500 }
        );
      }

      // Generic DB error
      return NextResponse.json({ ok: false, error: error.message ?? "db_insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "request recorded", id: data?.id ?? null }, { status: 200 });
  } catch (err: any) {
    console.error("[credits/request] unexpected error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
