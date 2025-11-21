// app/api/credits/me/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * Resolve the DB user's UUID using the Clerk user object (by email).
 * Returns { dbId, row } or throws an error response.
 */
async function resolveDbUserByClerk(clerkUser: any, supabase: any) {
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    throw new Error("clerk_no_email");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, plan, credits_remaining, credits_used, blocked")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`db_lookup_failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("db_user_not_found");
  }
  return { dbId: data.id, row: data };
}

export async function GET() {
  try {
    const clerk = await currentUser();
    if (!clerk || !clerk.emailAddresses?.length) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    try {
      const { row } = await resolveDbUserByClerk(clerk, supabase);
      return NextResponse.json({
        userId: row.id,
        plan: row.plan,
        credits_remaining: row.credits_remaining,
        credits_used: row.credits_used,
        blocked: row.blocked,
      });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg === "db_user_not_found") {
        return NextResponse.json({ error: "db_user_not_found", message: "No matching user record found in public.users; please create profile." }, { status: 404 });
      }
      if (msg === "clerk_no_email") {
        return NextResponse.json({ error: "clerk_no_email", message: "Clerk user does not expose an email." }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
