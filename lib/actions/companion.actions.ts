// lib/actions/companion.actions.ts
import { getSupabaseServiceRole } from "@/lib/supabase";

/** Companion row shape (loose) */
export type CompanionRow = {
  id: string;
  name?: string;
  subject?: string;
  topic?: string;
  duration?: number;
  style?: string;
  voice?: string;
  created_at?: string;
  author?: string;
  deleted_at?: string | null;
  [k: string]: any;
};

/** Session history row shape (loose) */
export type SessionHistoryRow = {
  id?: string;
  companion_id: string;
  user_id?: string | null;
  transcript?: string | null;
  metadata?: any;
  created_at?: string;
  deleted_at?: string | null;
};

/**
 * getCompanion(id)
 * Returns a companion by id or null if not found.
 */
export async function getCompanion(id: string): Promise<CompanionRow | null> {
  if (!id) return null;
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("companions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getCompanion supabase error:", error);
    throw error;
  }
  // don't return deleted companions unless you explicitly request
  if (!data) return null;
  if (data.deleted_at) return null;
  return data ?? null;
}

/**
 * addToSessionHistory(companionId, opts)
 * Inserts a lightweight session_history row and returns the inserted row.
 */
export async function addToSessionHistory(
  companionId: string,
  opts: { userId?: string; transcript?: string; metadata?: any } = {}
): Promise<SessionHistoryRow | null> {
  if (!companionId) {
    throw new Error("companionId is required for addToSessionHistory");
  }

  const supabase = getSupabaseServiceRole();

  const payload = {
    companion_id: companionId,
    user_id: opts.userId ?? null,
    transcript: opts.transcript ?? null,
    metadata: opts.metadata ?? null,
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  const { data, error } = await supabase
    .from("session_history")
    .insert(payload)
    .select()
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("addToSessionHistory supabase error:", error);
    throw error;
  }
  return data ?? null;
}

/**
 * getUserSessions(userId)
 * Convenience helper to fetch `session_history` rows for a user.
 * **Important**: only returns rows that are not soft-deleted.
 */
export async function getUserSessions(userId: string, limit = 50) {
  if (!userId) return [];
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("session_history")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null) // <-- exclude soft-deleted rows
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserSessions supabase error:", error);
    throw error;
  }
  return data ?? [];
}

/**
 * getUserCompanions(userId)
 * Fetch companions created by the user (exclude deleted).
 */
export async function getUserCompanions(userId: string, limit = 50) {
  if (!userId) return [];
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("companions")
    .select("*")
    .eq("author", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserCompanions supabase error:", error);
    throw error;
  }
  return data ?? [];
}

/**
 * getBookmarkedCompanions(userId)
 * Fetch user bookmarks (adapt table name if yours is different).
 * Excludes deleted bookmarks and companions.
 */
export async function getBookmarkedCompanions(userId: string, limit = 50) {
  if (!userId) return [];
  const supabase = getSupabaseServiceRole();

  // If you have a join table bookmarks(bookmark_id, user_id, companion_id),
  // adjust the select to join companions and exclude deleted companions/bookmarks.
  // This example assumes a simple bookmarks table with `companion_id` and `user_id`.
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*, companions(*)")
    .eq("user_id", userId)
    .is("deleted_at", null) // bookmark not soft-deleted
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getBookmarkedCompanions supabase error:", error);
    throw error;
  }

  // Filter out any entries with companions.deleted_at set (defensive)
  const filtered = (data ?? []).filter((row: any) => {
    const c = row?.companions ?? row?.companion ?? null;
    if (!c) return true;
    return !c.deleted_at;
  });

  return filtered;
}

/**
 * Backwards-compatibility / named export shims
 *
 * Some older files/pages import names like:
 *  - getCompanionById
 *  - fetchCompanion
 *  - getById
 *  - getCompanionRecord
 *
 * Provide light aliases that map to the canonical `getCompanion` function.
 * Also keep the default export object for safety.
 */

/* Named aliases mapping to getCompanion */
export const getCompanionById = getCompanion;
export const fetchCompanion = getCompanion;
export const getById = getCompanion;
export const getCompanionRecord = getCompanion;

/**
 * Re-export default (optional safety)
 */
const exported = {
  getCompanion,
  addToSessionHistory,
  getUserSessions,
  getUserCompanions,
  getBookmarkedCompanions,
};
export default exported;
