// app/api/companions/[id]/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

/**
 * DELETE /api/companions/[id]
 * - Only the companion author (if present) or the row owner (user_id) may soft-delete the companion.
 * - Uses the Supabase service-role client on the server, but verifies ownership via currentUser().
 * - If neither an author nor a user_id is present on the row, deletion is denied to avoid accidental public deletions.
 */

export async function DELETE(_: Request, { params }: { params: { id?: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "missing companion id" }, { status: 400 });

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Fetch companion row and include user_id for ownership checks
    const { data: existingRows, error: fetchErr } = await supabase
      .from("companions")
      .select("id, author, user_id, deleted_at")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("fetch companion error", fetchErr);
      return NextResponse.json({ error: "Failed to fetch companion" }, { status: 500 });
    }

    if (!existingRows) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existingRows.deleted_at) {
      // Already deleted — treat as not found
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ownership rules:
    // - If `author` exists, only the author may delete.
    // - Else if `user_id` exists, only that user may delete.
    // - If neither exists, deny to avoid deleting potentially public/system rows.
    if (existingRows.author) {
      if (existingRows.author !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (existingRows.user_id) {
      if (existingRows.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // No author or user_id -> conservative deny
      return NextResponse.json({ error: "Forbidden - companion has no owner metadata" }, { status: 403 });
    }

    // Soft-delete (set deleted_at)
    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("companions")
      .update({ deleted_at: now })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error("supabase companions soft-delete error", updateErr);
      return NextResponse.json({ error: updateErr.message ?? "Failed to delete companion" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "companion not found" }, { status: 404 });
    }

    // Revalidate pages that list companions / sessions
    try {
      revalidatePath("/companions");
      revalidatePath("/my-journey");
      revalidatePath("/");
    } catch (e) {
      console.warn("revalidation failed", e);
    }

    return NextResponse.json({ ok: true, id, deleted_at: now, data: updated });
  } catch (err: any) {
    console.error("DELETE /api/companions/[id] error", err);
    if (String(err?.message || "").toLowerCase().includes("missing env")) {
      return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
    }
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
