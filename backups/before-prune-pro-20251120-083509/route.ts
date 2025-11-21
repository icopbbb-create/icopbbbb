// app/after-signin/route.ts
import { NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";

const isDev = process.env.NODE_ENV !== "production";

/**
 * after-signin route (FREE-only flow)
 *
 * Simplified behavior:
 * - If server-side Clerk user exists -> always redirect to the free interactive logo
 *   (which will then forward to /home).
 * - If no server-side user -> redirect to Clerk sign-in (so client completes the handshake).
 *
 * This removes any "pro" branching at sign-in and preserves the free user flow.
 */

function makeSignInRedirect(origin: string) {
  const signInUrl = new URL("/sign-in", origin);
  signInUrl.searchParams.set("redirect", "/after-signin");
  return signInUrl.toString();
}

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const diag: any = { env: process.env.NODE_ENV, now: new Date().toISOString() };

  // Try to fetch server-side Clerk user (non-fatal)
  let clerkUser: any = null;
  try {
    // getAuth is optional, but calling currentUser() is the authoritative server-side check
    try {
      const auth = getAuth(request as any);
      diag.getAuth = { userId: auth?.userId ?? null };
    } catch (e) {
      // ignore — getAuth can fail in some dev scenarios
    }

    clerkUser = await currentUser();
    diag.currentUser = {
      id: clerkUser?.id ?? null,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
    };
  } catch (err: any) {
    diag.currentUser = { error: String(err) };
    clerkUser = null;
  }

  try {
    if (clerkUser && clerkUser.id) {
      // Signed-in — always use the free interactive logo flow (which forwards to /home)
      const eduLogo = new URL("/edu-logo", origin);
      eduLogo.searchParams.set("redirect", "/home");
      if (isDev) eduLogo.searchParams.set("_dbg", "1");
      console.log("[after-signin] server-side clerkUser present — redirecting to free edu-logo. diag:", diag);
      return NextResponse.redirect(eduLogo);
    }

    // No server-side user: redirect to Clerk sign-in to complete handshake
    console.warn("[after-signin] no authenticated Clerk user found server-side; sending to sign-in. diag:", diag);
    return NextResponse.redirect(makeSignInRedirect(origin));
  } catch (err) {
    console.error("after-signin: unexpected server error:", err, diag);
    // Safe fallback to free logo
    const fallback = new URL("/edu-logo", origin);
    fallback.searchParams.set("redirect", "/home");
    return NextResponse.redirect(fallback);
  }
}
