// app/api/sessions/start/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addToSessionHistory } from "@/lib/server/companion.actions";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

function supabaseAdmin() {
  return getSupabaseServiceRole();
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const companionId = body?.companionId;
    if (!companionId) {
      return NextResponse.json({ ok: false, message: "missing companionId" }, { status: 400 });
    }

    if (typeof addToSessionHistory !== "function") {
      console.error("addToSessionHistory helper not found or not a function");
      return NextResponse.json(
        { ok: false, message: "server helper addToSessionHistory not configured" },
        { status: 500 }
      );
    }

    try {
      // Try to pass userId to helper (many helpers accept an options param).
      // If helper ignores it, we will attempt a safe ownership patch below.
      const helperResult = await addToSessionHistory(companionId, { userId });

      // helper may return an array (data) or a single row object
      let row: any = null;
      if (Array.isArray(helperResult)) {
        row = helperResult[0] ?? null;
      } else if (helperResult && typeof helperResult === "object") {
        if (helperResult.data && Array.isArray(helperResult.data)) {
          row = helperResult.data[0] ?? null;
        } else if (helperResult.id || helperResult?.row) {
          row = helperResult.row ?? helperResult;
        } else {
          row = helperResult;
        }
      }

      if (!row) {
        return NextResponse.json(
          { ok: false, message: "addToSessionHistory returned no row" },
          { status: 500 }
        );
      }

      // If the helper returned a row but did not set user_id, attempt to set it
      // only when user_id is currently null to avoid overwriting a real owner.
      if (row.id && (!row.user_id || row.user_id === null)) {
        try {
          const supabase = supabaseAdmin();
          await supabase
            .from("session_history")
            .update({ user_id: userId })
            .eq("id", row.id)
            .eq("user_id", null);
        } catch (patchErr) {
          // non-fatal: log but don't break the response
          console.warn("Failed to backfill session_history.user_id for created row:", patchErr);
        }
      }

      if (row.id) {
        return NextResponse.json({ ok: true, id: row.id, row }, { status: 200 });
      }

      return NextResponse.json({ ok: true, row }, { status: 200 });
    } catch (helperErr) {
      console.error("addToSessionHistory threw:", helperErr);
      return NextResponse.json(
        { ok: false, message: "addToSessionHistory threw an error", error: String(helperErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("/api/sessions/start general error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
