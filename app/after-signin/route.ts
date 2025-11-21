// app/after-signin/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

function makeSignInRedirect(origin: string) {
  const signInUrl = new URL("/sign-in", origin);
  signInUrl.searchParams.set("redirect", "/after-signin");
  return signInUrl.toString();
}

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    // Try to read server-side clerk user (if middleware set context)
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
    } catch (err) {
      // non-fatal - log and continue
      console.warn("[after-signin] currentUser() threw:", String(err).slice(0, 200));
      clerkUser = null;
    }

    if (clerkUser && clerkUser.id) {
      // We no longer maintain a separate 'pro' flow here.
      // All signed-in users go to the same edu-logo -> click -> /home experience.
      const target = new URL("/edu-logo", origin);
      target.searchParams.set("redirect", "/home");
      if (process.env.NODE_ENV !== "production") target.searchParams.set("_dbg", "1");
      console.log("[after-signin] server user detected, redirecting to edu-logo -> /home", {
        clerkUserId: String(clerkUser.id).slice(0, 12),
        email: (clerkUser?.emailAddresses?.[0]?.emailAddress ?? null),
      });
      return NextResponse.redirect(target);
    }

    // No server-side user present — send to Clerk sign-in so client can finish handshake
    console.warn("[after-signin] no server-side user detected; redirecting to /sign-in to complete handshake");
    return NextResponse.redirect(makeSignInRedirect(origin));
  } catch (err) {
    console.error("[after-signin] unexpected error:", String(err));
    // Safe fallback — send the user to edu-logo (free flow)
    const fallback = new URL("/edu-logo", origin);
    fallback.searchParams.set("redirect", "/home");
    return NextResponse.redirect(fallback);
  }
}
