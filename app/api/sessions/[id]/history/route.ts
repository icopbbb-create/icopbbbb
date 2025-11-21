// app/api/sessions/[id]/history/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseServiceRole } from '@/lib/supabase';

/**
 * POST /api/sessions/:id/history
 *
 * Behavior (idempotent + dedupe):
 * - If client supplies `clientSessionId` (UUID), return existing row with that id or create it once.
 * - Else: attempt to find a *recent* session for same companion_id + user_id (within RECENT_WINDOW_MS).
 *   If found, update it (append/overwrite transcript & metadata) and return it.
 * - Else: insert a new row.
 *
 * Body (optional):
 * { companionId?: string, transcript?: string, metadata?: any, clientSessionId?: string }
 */

const RECENT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes — tweak if needed

const isUUID = (s: string | null) =>
  Boolean(s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s));

// helper: trigger notes generation server-to-server (fire-and-forget)
async function maybeTriggerNotesGeneration(sessionRow: any) {
  try {
    if (!sessionRow) return;
    if (!sessionRow.transcript) return;

    const prevMeta = sessionRow.metadata ?? {};
    const hasNotes = prevMeta && (prevMeta.ai_notes || prevMeta.ai_generated_at);
    if (hasNotes) {
      // Already has ai notes — skip
      return;
    }

    const secret = process.env.INTERNAL_API_SECRET;
    const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? '';
    if (!secret || !origin) {
      // cannot perform server->server call without secret & origin configured
      if (!secret) console.warn('[history] INTERNAL_API_SECRET not configured - skipping auto notes generation.');
      if (!origin) console.warn('[history] NEXT_PUBLIC_SITE_ORIGIN not configured - skipping auto notes generation.');
      return;
    }

    const notesUrl = `${origin.replace(/\/$/, '')}/api/sessions/${sessionRow.id}/notes`;

    // fire-and-forget
    fetch(notesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ force: true }),
    }).catch((e) => {
      console.warn('[history] auto notes generation request failed', e);
    });
  } catch (err) {
    console.error('[history] maybeTriggerNotesGeneration error', err);
  }
}

export async function POST(request: Request, { params }: { params: { id?: string } }) {
  const sessionIdParam = params?.id ?? null;
  if (!sessionIdParam) {
    return NextResponse.json({ message: 'Missing session id in URL' }, { status: 400 });
  }

  const auth = getAuth(request as any);
  const userId = auth?.userId ?? null;

  let body: any = {};
  try {
    body = (await request.json()) || {};
  } catch (e) {
    body = {};
  }

  const companionId = body?.companionId ?? sessionIdParam;
  const transcript = typeof body?.transcript === 'string' ? body.transcript : null;
  const metadata = body?.metadata ?? {};
  const clientSessionId = typeof body?.clientSessionId === 'string' ? body.clientSessionId : null;

  try {
    const supabase = getSupabaseServiceRole();

    // 1) If client provided a UUID-like clientSessionId, prefer that as canonical id.
    if (isUUID(clientSessionId)) {
      // check existing by id
      const { data: existingById, error: getErr } = await supabase
        .from('session_history')
        .select('*')
        .eq('id', clientSessionId)
        .limit(1)
        .maybeSingle();

      if (getErr) {
        console.error('[history] error checking existing by id', getErr);
      }

      if (existingById) {
        // Update transcript/metadata if provided (so single row accumulates data)
        const updatePayload: any = {};
        if (transcript) updatePayload.transcript = transcript;
        if (metadata && Object.keys(metadata).length) updatePayload.metadata = { ...(existingById.metadata || {}), ...metadata };

        if (Object.keys(updatePayload).length) {
          const { data: updated, error: updErr } = await supabase
            .from('session_history')
            .update(updatePayload)
            .eq('id', existingById.id)
            .select('*')
            .limit(1)
            .maybeSingle();

          if (updErr) {
            console.error('[history] error updating existing by id', updErr);
            // return existing row anyway
            return NextResponse.json({ ok: true, created: false, session: existingById }, { status: 200 });
          }

          // trigger notes generation if transcript saved
          const rowToUse = updated ?? existingById;
          await maybeTriggerNotesGeneration(rowToUse);

          return NextResponse.json({ ok: true, created: false, session: updated ?? existingById }, { status: 200 });
        }

        return NextResponse.json({ ok: true, created: false, session: existingById }, { status: 200 });
      }

      // not found: attempt an insert with client-supplied id
      const insertPayload: any = {
        id: clientSessionId,
        companion_id: companionId ?? null,
        user_id: userId ?? null,
        transcript: transcript ?? null,
        metadata: metadata ?? {},
      };

      const { data: inserted, error: insErr } = await supabase
        .from('session_history')
        .insert([insertPayload])
        .select('*')
        .limit(1);

      if (insErr) {
        console.error('[history] insert with clientSessionId failed', insErr);
        // fallback: try to return existing by client_session_id in metadata
        try {
          const { data: maybeByMeta, error: metaErr } = await supabase
            .from('session_history')
            .select('*')
            .filter("metadata->>client_session_id", "eq", clientSessionId)
            .limit(1);

          if (!metaErr && maybeByMeta && maybeByMeta.length) {
            return NextResponse.json({ ok: true, created: false, session: maybeByMeta[0] }, { status: 200 });
          }
        } catch (e) {
          // ignore and continue to error below
        }

        return NextResponse.json({ ok: false, message: 'Failed to insert session_history with clientSessionId', detail: String(insErr) }, { status: 500 });
      }

      const row = inserted?.[0] ?? null;
      if (!row) {
        return NextResponse.json({ ok: false, message: 'Insert returned no row' }, { status: 500 });
      }

      // trigger notes generation if transcript present
      await maybeTriggerNotesGeneration(row);

      return NextResponse.json({ ok: true, created: true, session: row }, { status: 201 });
    }

    // 2) No UUID provided: try to find a *recent* session for same companion + user
    // This prevents multiple near-duplicate inserts when the client calls the endpoint twice in a short span.
    const recentSince = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
    const { data: recentRows, error: recentErr } = await supabase
      .from('session_history')
      .select('*')
      .eq('companion_id', companionId)
      .eq('user_id', userId)
      .gt('created_at', recentSince)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentErr) {
      console.error('[history] error querying recent session', recentErr);
    }

    const recent = Array.isArray(recentRows) && recentRows.length ? recentRows[0] : null;

    if (recent) {
      // Update transcript/metadata if provided (merge metadata)
      const updatePayload: any = {};
      if (transcript) updatePayload.transcript = transcript;
      if (metadata && Object.keys(metadata).length) updatePayload.metadata = { ...(recent.metadata || {}), ...metadata };

      if (Object.keys(updatePayload).length) {
        const { data: updated, error: updErr } = await supabase
          .from('session_history')
          .update(updatePayload)
          .eq('id', recent.id)
          .select('*')
          .limit(1)
          .maybeSingle();

        if (updErr) {
          console.error('[history] error updating recent session', updErr);
          // return recent row anyway
          return NextResponse.json({ ok: true, created: false, session: recent }, { status: 200 });
        }

        const rowToUse = updated ?? recent;
        await maybeTriggerNotesGeneration(rowToUse);

        return NextResponse.json({ ok: true, created: false, session: updated ?? recent }, { status: 200 });
      }

      return NextResponse.json({ ok: true, created: false, session: recent }, { status: 200 });
    }

    // 3) Nothing recent found -> insert a new row
    const insertPayload: any = {
      companion_id: companionId ?? null,
      user_id: userId ?? null,
      transcript: transcript ?? null,
      metadata: metadata ?? {},
    };

    // if client provided a non-UUID clientSessionId, stash it in metadata for future lookup
    if (clientSessionId) {
      insertPayload.metadata = { ...(insertPayload.metadata || {}), client_session_id: clientSessionId };
    }

    const { data: inserted, error: insErr } = await supabase
      .from('session_history')
      .insert([insertPayload])
      .select('*')
      .limit(1);

    if (insErr) {
      console.error('[history] insert error', insErr);
      return NextResponse.json({ ok: false, message: 'Failed to insert session_history', detail: String(insErr) }, { status: 500 });
    }

    const row = inserted?.[0] ?? null;
    if (!row) {
      return NextResponse.json({ ok: false, message: 'Insert returned no row' }, { status: 500 });
    }

    // trigger notes generation if transcript present
    await maybeTriggerNotesGeneration(row);

    return NextResponse.json({ ok: true, created: true, session: row }, { status: 201 });
  } catch (err: any) {
    console.error('[history] unhandled error', err);
    return NextResponse.json({ ok: false, message: 'Server error', detail: String(err) }, { status: 500 });
  }
}
