// app/api/pro-request/issue-session/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // look for an approved pro_request by email (case-insensitive)
    const { data, error } = await supabase
      .from("pro_requests")
      .select("*")
      .ilike("email", email)
      .eq("status", "approved")
      .limit(1);

    if (error) {
      console.error("issue-session: supabase error", error);
      return NextResponse.json({ ok: false, error: "db error" }, { status: 500 });
    }

    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) {
      return NextResponse.json({ ok: false, error: "not approved" }, { status: 403 });
    }

    // create a minimal payload and base64 encode it into the cookie
    const payload = {
      email,
      username: (email.split("@")[0] || "").slice(0, 40),
      issued_at: new Date().toISOString(),
    };
    const cookieVal = Buffer.from(JSON.stringify(payload)).toString("base64");

    // cookie attributes
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const isProd = process.env.NODE_ENV === "production";
    const cookieParts = [
      `pro_session=${cookieVal}`,
      `Path=/`,
      `Max-Age=${maxAge}`,
      `HttpOnly`,
      `SameSite=Lax`,
    ];
    if (isProd) cookieParts.push("Secure");

    const headers = new Headers();
    headers.append("Set-Cookie", cookieParts.join("; "));

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("issue-session unexpected", err);
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 500 });
  }
}
