// app/api/credits/charge/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * Resolve DB user ID for the signed-in Clerk user.
 * - Tries clerk_id (fast & robust), then email.
 * - If none found, auto-creates a DB users row and returns its id.
 */
async function resolveOrCreateDbUser(clerkUser: any, supabase: any) {
  if (!clerkUser) throw new Error("unauthenticated");

  const clerkId = clerkUser?.id ?? null;
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

  // 1) Try lookup by clerk_id if present
  if (clerkId) {
    const { data: byClerk, error: errClerk } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (errClerk) throw new Error(`db_lookup_failed: ${errClerk.message}`);
    if (byClerk && byClerk.id) return byClerk.id;
  }

  // 2) Fallback: lookup by email if we have email
  if (email) {
    const { data: byEmail, error: errEmail } = await supabase
      .from("users")
      .select("id, clerk_id")
      .eq("email", email)
      .maybeSingle();

    if (errEmail) throw new Error(`db_lookup_failed: ${errEmail.message}`);
    if (byEmail && byEmail.id) {
      // If DB row found but clerk_id is empty and we have a clerkId, update it for future speed
      if (clerkId && !byEmail.clerk_id) {
        await supabase.from("users").update({ clerk_id: clerkId }).eq("id", byEmail.id);
      }
      return byEmail.id;
    }
  }

  // 3) Not found → create a new users row
  // Use defaults: free plan, starting credits 10000, credits_used 0, not blocked
  // Ensure you don't set id (database default gen_random_uuid() will generate if configured).
  const insertRow: any = {
    email: email ?? null,
    plan: "free",
    credits_remaining: 10000,
    credits_used: 0,
    blocked: false,
    clerk_id: clerkId ?? null,
  };

  const { data: created, error: createErr } = await supabase
    .from("users")
    .insert(insertRow)
    .select("id")
    .maybeSingle();

  if (createErr) {
    throw new Error(`db_create_failed: ${createErr.message}`);
  }
  if (!created || !created.id) {
    throw new Error("db_create_no_id");
  }
  return created.id;
}

export async function POST(req: Request) {
  try {
    // get signed in clerk user
    const clerk = await currentUser();
    if (!clerk) return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 });

    const supabase = getSupabaseServiceRole();

    // Resolve or create DB user uuid
    let dbUserId: string;
    try {
      dbUserId = await resolveOrCreateDbUser(clerk, supabase);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    // parse request payload
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount ?? 0);
    const action = String(body?.action ?? "unknown");
    const note = body?.note ?? null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "invalid_amount" }, { status: 400 });
    }

    // call RPC with DB uuid
    const { data: rpcData, error: rpcErr } = await supabase.rpc("charge_credits", {
      p_user_id: dbUserId,
      p_amount: amount,
      p_action: action,
      p_note: note,
    });

    if (rpcErr) {
      return NextResponse.json({ success: false, error: rpcErr.message }, { status: 402 });
    }

    // RPC returned a JSON-like object; return it to the client
    return NextResponse.json(rpcData);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
