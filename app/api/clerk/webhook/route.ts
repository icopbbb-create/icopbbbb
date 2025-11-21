// app/api/clerk/webhook/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Clerk webhook receiver (minimal).
 *
 * - Configure your Clerk webhook to POST billing/checkout events here.
 * - It will try to verify signature if CLERK_WEBHOOK_SECRET is set (recommended).
 * - On a successful billing/checkout completion event we mark the Clerk user:
 *     publicMetadata.isPro = true
 *     publicMetadata.credits = 1200
 *
 * NOTE: Adjust event type matching to Clerk's actual event names if needed.
 */

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET ?? null;

// Helper: verify signature if secret present. Clerk's signature header may vary by setup.
// Many webhook setups use a 'Clerk-Signature' header + HMAC SHA256 over body.
// If your Clerk dashboard gives you a different verification approach, replace this accordingly.
function verifySignature(secret: string, rawBody: string, signatureHeader?: string | null) {
  if (!signatureHeader) return false;
  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    // signatureHeader may come as "t=...,v1=signature" or raw; do a contains check
    if (signatureHeader.includes(expected)) return true;
    // direct compare as fallback
    if (signatureHeader === expected) return true;
  } catch (e) {
    // ignore and return false
  }
  return false;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const diag: any = { now: new Date().toISOString() };

  // read raw text for signature verification
  const rawBody = await req.text();
  diag.rawBodyLength = rawBody?.length ?? 0;

  // read signature header (common header names tried)
  const sigHeader = req.headers.get("clerk-signature") ?? req.headers.get("Clerk-Signature") ?? req.headers.get("x-clerk-signature") ?? null;

  if (WEBHOOK_SECRET) {
    const ok = verifySignature(WEBHOOK_SECRET, rawBody, sigHeader);
    if (!ok) {
      console.warn("[clerk-webhook] signature verification failed. diag:", diag);
      return NextResponse.json({ ok: false, error: "signature_verification_failed" }, { status: 401 });
    }
  } else {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET not set — skipping signature verification. This is ok for local testing but insecure in production.");
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch (e) {
    console.warn("[clerk-webhook] failed to parse JSON payload. diag:", diag);
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  diag.event = payload?.type ?? payload?.event?.type ?? null;
  diag.payloadSample = (payload && typeof payload === "object") ? Object.keys(payload).slice(0, 6) : null;
  console.log("[clerk-webhook] received event:", diag);

  try {
    // cheap event normalization: different systems name events differently.
    const eventType = (payload.type || payload.event?.type || "").toString().toLowerCase();

    // Possible Clerk/billing event names: "checkout.session.completed", "billing.subscription.created", "invoice.payment_succeeded"
    const successEventNames = [
      "checkout.session.completed",
      "billing.subscription.created",
      "subscription.created",
      "invoice.payment_succeeded",
      "payment.succeeded",
      "billing.session.completed",
    ];

    let userId: string | null = null;
    // try to read direct fields clerk provides
    if (payload?.data?.object?.client_reference_id) {
      userId = payload.data.object.client_reference_id;
    }
    // Clerk may include user id at different paths
    userId = userId || payload?.data?.object?.metadata?.clerkUserId || payload?.data?.object?.metadata?.userId || payload?.user?.id || payload?.data?.user_id || payload?.data?.object?.customer || null;

    // Also try top-level 'user_id' or 'clerk_user_id'
    userId = userId || payload?.user_id || payload?.clerk_user_id || null;

    // If payload contains nested 'user' object with id, prefer it
    if (!userId && payload?.data?.object?.customer && typeof payload.data.object.customer === "string") {
      userId = payload.data.object.customer;
    }

    const isSuccessEvent = successEventNames.some((n) => eventType.includes(n));

    if (isSuccessEvent && userId) {
      // Mark user as pro
      console.log(`[clerk-webhook] success event "${eventType}" for user "${userId}". Updating publicMetadata.isPro=true`);
      try {
        // Merge metadata carefully: read existing, then update
        const existing = await clerkClient.users.getUser(userId);
        const existingMeta = existing?.publicMetadata ?? {};
        const newMeta = { ...existingMeta, isPro: true, credits: 1200 };

        await clerkClient.users.updateUser(userId, {
          publicMetadata: newMeta,
        });

        console.log(`[clerk-webhook] updated user ${userId} publicMetadata -> isPro=true`);
        return NextResponse.json({ ok: true }, { status: 200 });
      } catch (err) {
        console.error("[clerk-webhook] failed to update user metadata:", err);
        return NextResponse.json({ ok: false, error: "update_user_failed" }, { status: 500 });
      }
    }

    // If event doesn't map to success or userId absent, respond 200 but noop
    console.log("[clerk-webhook] ignoring event (not a success or no userId). eventType:", eventType, "userId:", userId);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  } catch (err) {
    console.error("[clerk-webhook] unexpected error:", err, diag);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
