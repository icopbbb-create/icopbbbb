// app/api/sessions/[id]/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function DELETE(_: Request, { params }: { params: any }) {
  try {
    const p = await params;
    const sessionId = p?.id;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client not available" }, { status: 500 });
    }

    // Verify ownership + existence (and fetch deleted_at if any)
    const { data: existing, error: fetchErr } = await supabase
      .from("session_history")
      .select("id, user_id, deleted_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (fetchErr) {
      console.error("fetch session error", fetchErr);
      // differentiate not found vs other errors if possible
      return NextResponse.json({ error: fetchErr.message || "Failed to fetch session" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already soft-deleted, return success (idempotent)
    if (existing.deleted_at) {
      try {
        revalidatePath("/my-journey");
        revalidatePath("/");
      } catch (e) {
        console.warn("revalidation failed", e);
      }
      return NextResponse.json({ message: "Already deleted", data: existing });
    }

    // Soft-delete: set deleted_at timestamp
    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("session_history")
      .update({ deleted_at: now })
      .eq("id", sessionId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("soft-delete error", updateErr);
      return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
    }

    // Revalidate pages that list sessions
    try {
      revalidatePath("/my-journey");
      revalidatePath("/");
    } catch (e) {
      console.warn("revalidation failed", e);
    }

    // Return the updated row so client/devs can verify
    return NextResponse.json({ message: "Deleted", data: updated ?? { id: sessionId, deleted_at: now } });
  } catch (err: any) {
    console.error("delete session error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
