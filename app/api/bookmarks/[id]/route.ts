// app/api/bookmarks/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";

/**
 * Soft-delete a bookmark belonging to the authenticated user.
 * Route path: /api/bookmarks/[id]
 *
 * Behavior:
 *  - First attempt: treat :id as companion_id and soft-delete bookmarks where companion_id = id AND user_id = currentUser
 *  - Fallback: treat :id as the bookmark row id (primary key) and soft-delete where id = id AND user_id = currentUser
 *
 * This prevents accidental cross-user deletion and avoids returning other users' rows.
 */

export async function DELETE(_: Request, { params }: { params: { id?: string } }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    // Require authenticated Clerk user on server
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    const now = new Date().toISOString();

    // Attempt 1: update by companion_id (older behavior)
    const { data: dataByCompanion, error: errByCompanion } = await supabase
      .from("bookmarks")
      .update({ deleted_at: now })
      .eq("companion_id", id)
      .eq("user_id", userId)
      .select();

    if (errByCompanion) {
      console.error("supabase bookmarks soft-delete (by companion_id) error", errByCompanion);
      return NextResponse.json({ error: errByCompanion.message ?? String(errByCompanion) }, { status: 500 });
    }

    const updatedCountByCompanion = Array.isArray(dataByCompanion) ? dataByCompanion.length : 0;
    if (updatedCountByCompanion > 0) {
      return NextResponse.json({ ok: true, method: "companion_id", companion_id: id, updated: updatedCountByCompanion }, { status: 200 });
    }

    // Attempt 2: update by bookmark id (row PK) — handle cases where route expects bookmark PK
    const { data: dataById, error: errById } = await supabase
      .from("bookmarks")
      .update({ deleted_at: now })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (errById) {
      console.error("supabase bookmarks soft-delete (by id) error", errById);
      return NextResponse.json({ error: errById.message ?? String(errById) }, { status: 500 });
    }

    const updatedCountById = Array.isArray(dataById) ? dataById.length : 0;
    if (updatedCountById > 0) {
      return NextResponse.json({ ok: true, method: "id", id, updated: updatedCountById }, { status: 200 });
    }

    // Nothing updated -> row not found or not owned by user
    return NextResponse.json({ ok: false, error: "No matching bookmark found for this user" }, { status: 404 });
  } catch (err: any) {
    console.error("DELETE /api/bookmarks/[id] error", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
