// app/after-signin/route.ts
import { NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const isDev = process.env.NODE_ENV !== "production";

/**
 * after-signin route
 *
 * Flow:
 * - If server-side Clerk user is present:
 *    * Look up pro_requests by clerk_user_id (preferred) then by email (fallback).
 *    * If found && approved -> redirect to the Vite SPA at /interactive-logo-app with ?redirect=/home
 *    * else -> redirect to /edu-logo?redirect=/home (interactive logo for free users)
 * - If no server-side user -> redirect to Clerk sign-in so client SDK can finish UAT handshake.
 */

function makeSignInRedirect(origin: string) {
  const signInUrl = new URL("/sign-in", origin);
  signInUrl.searchParams.set("redirect", "/after-signin");
  return signInUrl.toString();
}

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // Lightweight diagnostic object for logs
  const diag: any = { env: process.env.NODE_ENV };

  // Try to read Clerk auth from middleware (getAuth) safely
  let clerkAuthUserId: string | null = null;
  try {
    const auth = getAuth(request as any);
    clerkAuthUserId = auth?.userId ?? null;
    diag.getAuth = { userId: clerkAuthUserId };
  } catch (err: any) {
    diag.getAuth = { error: String(err) };
  }

  // Try to fetch full Clerk user server-side
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
    diag.currentUser = {
      id: clerkUser?.id ?? null,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
    };
  } catch (err: any) {
    diag.currentUser = { error: String(err) };
    clerkUser = null;
  }

  // If server-side Clerk user exists, decide where to send them
  if (clerkUser && clerkUser.id) {
    try {
      const supabase = getSupabaseServer();

      // Preferred: search by clerk_user_id (text)
      const { data: rowsByClerk, error: errByClerk } = await supabase
        .from("pro_requests")
        .select("*")
        .eq("clerk_user_id", clerkUser.id)
        .order("requested_at", { ascending: false })
        .limit(1);

      if (errByClerk) {
        console.error("after-signin: supabase query by clerk_user_id error:", errByClerk);
      }

      let requestRow = Array.isArray(rowsByClerk) && rowsByClerk.length ? rowsByClerk[0] : null;

      // Fallback: lookup by email if no clerk_id match
      if (!requestRow) {
        const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
        if (email) {
          const { data: rowsByEmail, error: errByEmail } = await supabase
            .from("pro_requests")
            .select("*")
            .ilike("email", email)
            .order("requested_at", { ascending: false })
            .limit(1);
          if (errByEmail) console.error("after-signin: supabase query by email error:", errByEmail);
          requestRow = Array.isArray(rowsByEmail) && rowsByEmail.length ? rowsByEmail[0] : null;
        }
      }

      // If requestRow exists and is approved -> redirect to the Vite SPA with ?redirect=/home
      if (requestRow && requestRow.status === "approved") {
        const target = new URL("/interactive-logo-app", origin);
        target.searchParams.set("redirect", "/home");
        if (isDev) target.searchParams.set("_dbg", "1");
        return NextResponse.redirect(target);
      }

      // NOT approved or no pro request: send free users to interactive logo which then forwards to /home
      const eduLogo = new URL("/edu-logo", origin);
      eduLogo.searchParams.set("redirect", "/home");
      if (isDev) eduLogo.searchParams.set("_dbg", "1");
      return NextResponse.redirect(eduLogo);
    } catch (err) {
      console.error("after-signin: unexpected server error:", err, diag);
      // As a safe fallback, redirect to the interactive logo for free users instead of root
      const fallback = new URL("/edu-logo", origin);
      fallback.searchParams.set("redirect", "/home");
      return NextResponse.redirect(fallback);
    }
  }

  // No server-side Clerk user detected: send to Clerk sign-in so the client can finish UAT handshake
  console.warn("[after-signin] no authenticated Clerk user found server-side. diag:", diag);
  return NextResponse.redirect(makeSignInRedirect(origin));
}
