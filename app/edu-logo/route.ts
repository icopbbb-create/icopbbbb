// app/edu-logo/route.ts
import { NextResponse } from "next/server";

/**
 * Redirect /edu-logo -> /edu-logo/index.html (static file in public/)
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/edu-logo/index.html", origin));
}
