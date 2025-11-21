// app/api/clerk/debug/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    // getAuth - does not require middleware but may return better info when middleware runs
    let authDiag: any = { getAuth: null, currentUser: null };
    try {
      const auth = getAuth(req as any);
      authDiag.getAuth = {
        raw: { userId: auth.userId ?? null, isAuthenticated: !!auth.userId },
        debug: typeof auth.getToken === "function" ? "has getToken()" : "no getToken()",
      };
    } catch (err) {
      authDiag.getAuth = { error: String(err) };
    }

    try {
      const u = await currentUser();
      authDiag.currentUser = { id: u?.id ?? null, email: u?.emailAddresses?.[0]?.emailAddress ?? null };
    } catch (err) {
      authDiag.currentUser = { error: String(err) };
    }

    // echo some headers / cookies
    const cookieHeader = req.headers.get("cookie") ?? "";
    const headers: Record<string, string | null> = {};
    ["x-clerk-auth-status", "x-clerk-auth-reason", "x-clerk-auth-token", "x-clerk-auth-message"].forEach((k) => {
      headers[k] = req.headers.get(k);
    });

    const payload = {
      receivedUrl: req.url,
      cookiePreview: cookieHeader.slice(0, 200),
      headers,
      authDiag,
    };

    return NextResponse.json({ ok: true, payload });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
