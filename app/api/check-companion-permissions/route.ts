// app/api/check-companion-permissions/route.ts
import { NextResponse } from 'next/server';
import { newCompanionPermissions } from '@/lib/server/companion.actions';

export async function GET() {
  try {
    const result = await newCompanionPermissions();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ allowed: false, reason: 'error', detail: String(err?.message || err) }, { status: 500 });
  }
}
