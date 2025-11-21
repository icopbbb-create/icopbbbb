// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const clerk = clerkMiddleware();

/*
  NOTES:
  - Static SPA files under /edu-logo should bypass Clerk so assets load fast.
  - BUT Clerk's OAuth handshake uses query params (e.g. __clerk_handshake). Those
    requests must be processed by Clerk middleware so the server-side session is completed.
  - Therefore: normally bypass /edu-logo and public assets, but if the request
    contains Clerk handshake query params, do NOT bypass (allow clerk middleware).
*/

const BYPASS_PREFIXES = [
  "/sign-in",
  "/sign-in/",
  "/pro-request",
  "/pro-request/",
  "/interactive-logo",
  "/interactive-logo/",
  "/interactive-logo-app",
  "/interactive-logo-app/",
  "/interactive-logo-app/index.html",
  "/interactive-logo-app/assets",
  "/interactive-logo-app/assets/",
  // allow static edu-logo files to be served directly (images/js/css)
  "/edu-logo/assets",
  "/edu-logo/assets/",
  "/edu-logo/index.html",
  // top-level static/public folders
  "/assets",
  "/assets/",
  "/images",
  "/images/",
  "/favicon.ico",
];

function isStaticBypass(pathname: string) {
  // exact or prefix match for static/public assets
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) return true;
  }
  return false;
}

export default function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // If this request is for the edu-logo path but contains Clerk handshake params,
  // DO NOT bypass — let clerkMiddleware handle it so server-side currentUser() works.
  const hasClerkHandshake =
    searchParams.has("__clerk_handshake") ||
    searchParams.has("__clerk_sign_in") ||
    searchParams.has("__clerk_sign_up");

  // Decide bypass: normally bypass static paths, but if handshake present -> do NOT bypass.
  let bypass = isStaticBypass(pathname);

  // If the path is the edu-logo base (or starts with it) and we're carrying a Clerk handshake,
  // force middleware to run (i.e. do not bypass).
  if ((pathname === "/edu-logo" || pathname.startsWith("/edu-logo")) && hasClerkHandshake) {
    bypass = false;
  }

  try {
    console.log(
      `[middleware] path=${pathname} | bypass=${bypass} | clerkApplied=${!bypass} | handshake=${String(hasClerkHandshake)}`
    );
  } catch {}

  if (bypass) {
    return NextResponse.next();
  }

  // Apply Clerk middleware for auth-protected routes and handshake requests
  return clerk(req);
}

export const config = {
  // Exclude common static folders from running middleware by default.
  // Note: we still explicitly allow middleware to run for paths which carry handshake params.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|assets|images|edu-logo/assets|interactive-logo-app/assets).*)",
  ],
};
