// app/api/sessions/[id]/transcript/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseServiceRole } from '@/lib/supabase';

/**
 * GET /api/sessions/:id/transcript
 * - uses server/service-role supabase client
 * - returns plain text when possible (helpful for downloads)
 * - logs detailed DB errors to server console for debugging
 */
export async function GET(req: Request, { params }: { params: { id?: string } }) {
  const sessionId = params?.id ?? null;

  try {
    if (!sessionId) {
      console.error('[transcript route] missing session id');
      return NextResponse.json({ transcript: null, message: 'Missing session id' }, { status: 400 });
    }

    // Clerk auth read from request (cookies)
    const auth = getAuth(req as any);
    const userId = auth?.userId ?? null;

    if (!userId) {
      console.warn(`[transcript route] unauthenticated request for session ${sessionId}`);
      return NextResponse.json({ transcript: null, message: 'Unauthenticated' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Query session_history (server side; service role bypasses RLS)
    const { data, error } = await supabase
      .from('session_history')
      .select('id, companion_id, created_at, transcript, metadata, user_id')
      .eq('id', sessionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Log full error server-side for inspection
      console.error('[transcript route] Supabase error fetching session:', JSON.stringify(error));
      return NextResponse.json({ transcript: null, message: 'DB error' }, { status: 500 });
    }

    if (!data) {
      console.info(`[transcript route] session not found: ${sessionId} (user ${userId})`);
      return NextResponse.json({ transcript: null, message: 'Session not found' }, { status: 200 });
    }

    // Enforce ownership (don't return other users' transcripts)
    if (data.user_id && data.user_id !== userId) {
      console.warn('[transcript route] ownership mismatch', { sessionId, owner: data.user_id, requestUser: userId });
      return NextResponse.json({ transcript: null, message: 'Session not found' }, { status: 200 });
    }

    // Prefer raw transcript string
    if (typeof data.transcript === 'string' && data.transcript.trim().length) {
      return new Response(data.transcript, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Fallback: metadata shapes
    const meta: any = data.metadata ?? null;
    if (meta) {
      if (typeof meta.transcript === 'string' && meta.transcript.trim().length) {
        return new Response(meta.transcript, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      if (Array.isArray(meta.messages) && meta.messages.length) {
        const parts = meta.messages.map((m: any) => m.text ?? m.content ?? '').filter(Boolean);
        if (parts.length) return new Response(parts.join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }

    return NextResponse.json({ transcript: null, message: 'No transcript available.' }, { status: 200 });
  } catch (err: any) {
    console.error('[transcript route] unexpected error:', err?.stack ?? err);
    return NextResponse.json({ transcript: null, message: String(err?.message ?? 'Server error') }, { status: 500 });
  }
}
