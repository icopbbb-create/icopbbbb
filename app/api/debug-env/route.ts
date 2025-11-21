// app/api/debug-env/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const envVal = process.env.PRO_REQUEST_ADMIN_PASSWORD ?? process.env.ADMIN_PANEL_PASSWORD ?? null;
  const nodeEnv = process.env.NODE_ENV ?? "development";

  // Only allow in dev
  if (nodeEnv !== "development") {
    return NextResponse.json({ ok: false, error: "not-allowed" }, { status: 403 });
  }

  // Very small host check: prefer localhost requests (helps avoid accidental remote calls)
  const host = req.headers.get("host") ?? "";
  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    return NextResponse.json({ ok: false, error: "host-not-allowed", host }, { status: 403 });
  }

  // Mask the secret: show only first 2 and last 2 chars if present
  function mask(s: string | null) {
    if (!s) return null;
    if (s.length <= 6) return s.replace(/./g, "*");
    return `${s.slice(0, 2)}${s.slice(2, -2).replace(/./g, "*")}${s.slice(-2)}`;
  }

  return NextResponse.json({
    ok: true,
    nodeEnv,
    PRO_REQUEST_ADMIN_PASSWORD_masked: mask(envVal),
    hasValue: Boolean(envVal),
  });
}
