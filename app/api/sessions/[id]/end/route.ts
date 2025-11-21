import { NextResponse } from 'next/server';

// Example: POST /api/sessions/{id}/end
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // TODO: Replace the following with your real DB / Supabase logic.
    // Example with Supabase (server-side):
    // const supabase = createServerSupabaseClient(...);
    // await supabase.from('session_history').insert({ session_id: id, ended_at: new Date().toISOString() });

    console.log('Session end received for:', id);

    return NextResponse.json({ ok: true, sessionId: id });
  } catch (err) {
    console.error('Failed to save session end:', err);
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
  }
}
