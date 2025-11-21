// app/api/credits/topup/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Admin / webhook top-up endpoint.
 * - Expects: { userId, amount, action?, note? }
 * - NOTE: Protect this route appropriately in production (webhook secret or admin-only).
 */
export async function POST(req: Request) {
  try {
    // Optional: you can require a special header for admin/webhook calls.
    // For now: allow server-side calls (but in production ensure a secret or server-to-server call).
    const payload = await req.json().catch(() => ({}));
    const targetUserId = String(payload?.userId ?? '');
    const amount = Number(payload?.amount ?? 0);
    const action = String(payload?.action ?? 'admin_topup');
    const note = payload?.note ?? null;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'missing_userId' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ success: false, error: 'invalid_amount' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase.rpc('topup_credits', {
      p_user_id: targetUserId,
      p_amount: amount,
      p_action: action,
      p_note: note,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
