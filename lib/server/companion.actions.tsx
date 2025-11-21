// lib/server/companion.actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { getSupabaseServiceRole } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { subjectToIconFilename } from '@/lib/utils';

/** Server Supabase helper */
function serverSupabase() {
  return getSupabaseServiceRole();
}

/* -------------------------
   Utils
   ------------------------- */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(val?: string | null) {
  return typeof val === 'string' && uuidRegex.test(val);
}

/* -------------------------
   Companion CRUD
   ------------------------- */

/** Create a companion (server action) */
export const createCompanion = async (formData: CreateCompanion) => {
  const { userId: author } = await auth();
  if (!author) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from('companions')
    .insert([{ ...formData, author }])
    .select('*');

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create a companion');
  }

  return data[0];
};

/**
 * Get paginated / filtered companions
 * Now excludes soft-deleted rows (deleted_at IS NULL).
 */
export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
  q,
}: GetAllCompanions & { q?: string } = {}) => {
  const supabase = serverSupabase();

  // start with non-deleted rows
  let baseQuery: any = supabase.from('companions').select('*').is('deleted_at', null);

  // filters by subject/topic (keeps original behaviour)
  if (subject && topic) {
    baseQuery = baseQuery.ilike('subject', `%${subject}%`).or(
      `topic.ilike.%${topic}%,name.ilike.%${topic}%`
    );
  } else if (subject) {
    baseQuery = baseQuery.ilike('subject', `%${subject}%`);
  } else if (topic) {
    baseQuery = baseQuery.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }

  const range = (qObj: any) => qObj.range((page - 1) * limit, page * limit - 1);

  if (q && String(q).trim().length > 0) {
    const term = String(q).trim();
    const candidateClauses = [
      `name.ilike.%${term}%`,
      `topic.ilike.%${term}%`,
      `subject.ilike.%${term}%`,
    ];

    try {
      const orClause = candidateClauses.join(',');
      const { data: companions, error } = await range(baseQuery.or(orClause));
      if (error) {
        console.warn('getAllCompanions: OR query failed, falling back to base query. Error:', error.message ?? error);
      } else {
        return companions ?? [];
      }
    } catch (err: any) {
      console.warn('getAllCompanions: OR query threw, falling back to base query. Error:', String(err?.message ?? err));
    }

    try {
      const { data: companions, error } = await range(baseQuery);
      if (error) {
        throw new Error(`Failed to fetch companions (fallback): ${error.message}`);
      }
      return companions ?? [];
    } catch (err: any) {
      throw new Error(`Failed to fetch companions: ${String(err?.message ?? err)}`);
    }
  }

  try {
    const { data: companions, error } = await range(baseQuery);
    if (error) throw new Error(`Failed to fetch companions: ${error.message}`);
    return companions ?? [];
  } catch (err: any) {
    throw new Error(`Failed to fetch companions: ${String(err?.message ?? err)}`);
  }
};

/** Get single companion by ID or name */
export const getCompanion = async (id: string) => {
  if (!id) throw new Error('Missing companion id');
  const supabase = serverSupabase();

  const isIdUUID = isUUID(id);

  try {
    const { data, error } = isIdUUID
      ? await supabase.from('companions').select('*').is('deleted_at', null).eq('id', id).limit(1)
      : await supabase.from('companions').select('*').is('deleted_at', null).ilike('name', `%${id}%`).limit(1);

    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  } catch (err: any) {
    throw new Error(`Failed to fetch companion: ${String(err?.message || err)}`);
  }
};

/* -------------------------
   SESSION HISTORY HELPERS
   ------------------------- */

export const createSessionHistory = async (
  companionId: string,
  clientSessionId?: string | null,
  opts?: { metadata?: any; created_at?: string }
) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  try {
    const insertObj: any = {
      companion_id: companionId,
      user_id: userId,
      metadata: opts?.metadata ?? {},
    };
    if (opts?.created_at) insertObj.created_at = opts.created_at;

    if (clientSessionId && isUUID(clientSessionId)) {
      insertObj.id = clientSessionId;
    } else if (clientSessionId) {
      insertObj.metadata = {
        ...(insertObj.metadata || {}),
        client_session_id: clientSessionId,
      };
    }

    const { data, error } = await supabase.from('session_history').insert([insertObj]).select('*');
    if (error) throw error;

    try { revalidatePath('/my-journey'); } catch (e) {}

    return (data && data[0]) || null;
  } catch (err: any) {
    throw new Error(`createSessionHistory failed: ${String(err?.message || err)}`);
  }
};

export const updateSessionHistory = async (
  sessionIdentifier: string,
  opts?: { transcript?: string; metadata?: any; updated_at?: string }
) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  try {
    const updateObj: any = {};
    if (opts?.transcript !== undefined) updateObj.transcript = opts.transcript;
    if (opts?.metadata !== undefined) updateObj.metadata = opts.metadata;
    if (opts?.updated_at) updateObj.updated_at = opts.updated_at;

    if (isUUID(sessionIdentifier)) {
      const { data, error } = await supabase
        .from('session_history')
        .update(updateObj)
        .eq('id', sessionIdentifier)
        .select('*')
        .limit(1);

      if (error) throw error;
      try { revalidatePath('/my-journey'); } catch {}
      return data?.[0] ?? null;
    }

    const { data, error } = await supabase
      .from('session_history')
      .update(updateObj)
      .filter("metadata->>client_session_id", "eq", sessionIdentifier)
      .select('*')
      .limit(1);

    if (error) throw error;
    try { revalidatePath('/my-journey'); } catch {}
    return data?.[0] ?? null;
  } catch (err: any) {
    throw new Error(`updateSessionHistory failed: ${String(err?.message || err)}`);
  }
};

export const addToSessionHistory = async (
  companionId: string,
  opts?: { transcript?: string; metadata?: any }
) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  try {
    const insertObj: any = { companion_id: companionId, user_id: userId };
    if (opts?.transcript) insertObj.transcript = opts.transcript;
    if (opts?.metadata) insertObj.metadata = opts.metadata;

    const { data, error } = await supabase.from('session_history').insert([insertObj]).select('*');
    if (error) throw error;
    try { revalidatePath('/my-journey'); } catch {}
    return data;
  } catch (err: any) {
    throw new Error(`Failed to add session history: ${String(err?.message || err)}`);
  }
};

export const saveSessionNotes = async (sessionId: string, notes: string, feedback?: string | null) => {
  if (!sessionId) throw new Error('Missing session id for saveSessionNotes');
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  try {
    const { data: currentRow, error: fetchErr } = await supabase
      .from('session_history')
      .select('metadata')
      .eq('id', sessionId)
      .limit(1)
      .single();

    if (fetchErr) throw fetchErr;

    const prevMeta = currentRow?.metadata ?? {};
    const newMeta = {
      ...(prevMeta || {}),
      ai_notes: notes,
      ai_feedback: feedback ?? null,
      ai_generated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('session_history')
      .update({ metadata: newMeta })
      .eq('id', sessionId)
      .select('*')
      .limit(1);

    if (error) throw error;
    try { revalidatePath('/my-journey'); } catch (e) {}
    return data?.[0] ?? null;
  } catch (err: any) {
    throw new Error(`saveSessionNotes failed: ${String(err?.message || err)}`);
  }
};

/* -------------------------
   Session list / flatteners
   ------------------------- */

export const getRecentSessions = async (limit = 50) => {
  try {
    const supabase = getSupabaseServiceRole();

    if (!supabase || typeof supabase.from !== "function") {
      console.error("getRecentSessions: supabase client missing or invalid:", supabase);
      return [];
    }

    // exclude soft-deleted session rows
    const { data: sessionsData, error: sessionsErr } = await supabase
      .from("session_history")
      .select("*, companions(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionsErr) {
      console.error("getRecentSessions supabase error:", sessionsErr);
      return [];
    }

    const sessions = Array.isArray(sessionsData) ? sessionsData : [];

    return sessions.map((row: any) => {
      // companion object (if any)
      const comp = row.companions ?? null;

      // explicit image if stored in companion or session row
      const explicitImage =
        comp?.companion_image_url ??
        comp?.image_url ??
        comp?.avatar_url ??
        comp?.photo_url ??
        row.companion_image_url ??
        null;

      // compute icon filename from subject (uses your existing util)
      const subjectKey = comp?.subject ?? row.metadata?.subject ?? row.subject ?? null;
      const iconFilename = subjectToIconFilename(subjectKey);
      const localIconPath = `/icons/${(iconFilename || "default")}.svg`;

      // final image url: prefer explicit DB image, otherwise use local icon
      const companion_image_url = explicitImage ?? localIconPath;

      const displayName =
        comp?.name ?? row.metadata?.title ?? row.name ?? `Session ${String(row.id ?? "").slice(0, 8)}`;

      return {
        id: row.id ?? null,
        companion_id: row.companion_id ?? null,
        name: displayName,
        companion_image_url,
        created_at: row.created_at ?? null,
        metadata: row.metadata ?? null,
        raw: row,
        companions: comp, // keep the full relation for compatibility
      };
    });
  } catch (err: any) {
    console.error("getRecentSessions unexpected error:", {
      message: err?.message ?? String(err),
      name: err?.name,
      stack: err?.stack,
      full: err,
    });
    return [];
  }
};

export const getUserSessions = async (userId: string, limit = 10) => {
  if (!userId) throw new Error('Missing userId for getUserSessions');
  const supabase = serverSupabase();
  try {
    const { data, error } = await supabase
      .from('session_history')
      .select(`
        id,
        transcript,
        created_at,
        companion_id,
        metadata,
        companions:companion_id (*)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null) // ignore deleted session rows
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (
      data?.map((row: any) => {
        const comp = row.companions || {};
        const explicitImage =
          comp.companion_image_url ?? comp.image_url ?? comp.photo_url ?? comp.icon_url ?? null;

        const iconFilename = subjectToIconFilename(comp.subject);
        const companion_image_url = explicitImage ?? `/icons/${iconFilename}.svg`;

        return {
          id: row.id,
          transcript: row.transcript,
          created_at: row.created_at,
          companion_id: row.companion_id,
          metadata: row.metadata,
          companion_image_url,
          companion: {
            id: comp.id ?? null,
            name: comp.name ?? null,
            subject: comp.subject ?? null,
            topic: comp.topic ?? null,
            deleted_at: comp.deleted_at ?? null,
            ...(() => {
              const clean: any = {};
              if (comp.description) clean.description = comp.description;
              if (comp.author) clean.author = comp.author;
              if (comp.style) clean.style = comp.style;
              return clean;
            })(),
          },
        };
      })
      // drop session rows whose linked companion is soft-deleted
      .filter((r: any) => !(r.companion && r.companion.deleted_at))
      ?? []
    );
  } catch (err: any) {
    throw new Error(`Failed to fetch user sessions: ${String(err?.message || err)}`);
  }
};

export const getUserCompanions = async (userId: string) => {
  if (!userId) throw new Error('Missing userId for getUserCompanions');
  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from('companions')
    .select('*')
    .eq('author', userId)
    .is('deleted_at', null);
  if (error) throw new Error(`Failed to fetch user companions: ${error.message}`);
  return data ?? [];
};

/* -------------------------
   NEW COMPANION PERMISSIONS
   ------------------------- */

export const newCompanionPermissions = async () => {
  const { userId, has } = await auth();
  if (!userId) return { allowed: false, reason: 'not_authenticated' };

  const supabase = serverSupabase();

  try {
    if (typeof has === 'function' && has({ plan: 'pro' })) {
      return { allowed: true, reason: 'pro_plan', limit: Infinity, count: 0, usedCol: null };
    }
  } catch (err) {
    console.warn('newCompanionPermissions: Clerk has() threw', err);
  }

  let limit = 0;
  try {
    if (typeof has === 'function') {
      if (has({ feature: '10_companion_limit' })) limit = 10;
      else if (has({ feature: '3_companion_limit' })) limit = 3;
    }
  } catch (err) {
    console.warn('newCompanionPermissions: error checking features', err);
  }

  if (!limit) limit = 3;

  const ownershipCols = ['author', 'user_id', 'created_by', 'owner'];
  let companionCount = 0;
  let usedCol: string | null = null;

  for (const col of ownershipCols) {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact' })
        .eq(col, userId)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        const msg = String(error?.message || '');
        if (msg.includes('column') && msg.includes('does not exist')) continue;
        if (msg.includes('invalid input syntax for type uuid')) continue;
        throw error;
      }

      usedCol = col;
      companionCount = Array.isArray(data) ? data.length : 0;
      break;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('column') && msg.includes('does not exist')) continue;
      if (msg.includes('invalid input syntax for type uuid')) continue;
      return { allowed: false, reason: 'db_error', detail: String(err?.message || err) };
    }
  }

  const allowed = companionCount < limit;
  return {
    allowed,
    limit,
    count: companionCount,
    usedCol,
    reason: allowed ? 'under_limit' : 'limit_reached',
  };
};

/* -------------------------
   Bookmarks
   ------------------------- */

export const addBookmark = async (companionId: string, path?: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from('bookmarks')
    .insert([{ companion_id: companionId, user_id: userId }])
    .select('*');

  if (error) {
    throw new Error(`Failed to add bookmark: ${String(error.message || error)}`);
  }

  if (path) revalidatePath(path);
  return data;
};

export const removeBookmark = async (companionId: string, path?: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const supabase = serverSupabase();
  const { data, error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('companion_id', companionId)
    .eq('user_id', userId)
    .select('*');

  if (error) {
    throw new Error(`Failed to remove bookmark: ${String(error.message || error)}`);
  }

  if (path) revalidatePath(path);
  return data;
};

export const getBookmarkedCompanions = async (userId: string) => {
  if (!userId) throw new Error('Missing userId for getBookmarkedCompanions');
  const supabase = serverSupabase();

  const { data, error } = await supabase
    .from('bookmarks')
    .select('companions:companion_id (*)')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch bookmarked companions: ${error.message}`);

  // Filter out bookmarked rows whose companion is soft-deleted
  return (
    data
      ?.map((row: any) => {
        const comp = row.companions || {};
        const explicitImage =
          comp.companion_image_url ?? comp.image_url ?? comp.photo_url ?? comp.icon_url ?? null;
        const iconFilename = subjectToIconFilename(comp.subject);
        const companion_image_url = explicitImage ?? `/icons/${iconFilename}.svg`;
        return { ...comp, companion_image_url };
      })
      // keep only not-soft-deleted companions
      .filter((c: any) => !c.deleted_at) ?? []
  );
};
