// server/getRecentSessions.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getRecentSessions(limit = 12) {
  const { data, error } = await supabase
    .from('session_history')
    .select(`
      id,
      created_at,
      companion_id,
      metadata,
      transcript,
      companions (
        id,
        name,
        subject
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentSessions error:', error);
    throw error;
  }

  return data;
}
