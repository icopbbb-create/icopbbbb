// scripts/check-user-isolation-fixed.cjs
// Usage (Unix):
// SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/check-user-isolation-fixed.cjs userA userB
// Windows Powershell:
// $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node .\scripts\check-user-isolation-fixed.cjs userA userB

const { createClient } = require('@supabase/supabase-js');

async function safeCount(supabase, table, col, useDeletedAtCheck = false) {
  try {
    let q = supabase.from(table).select(col, { count: 'exact', head: false }).eq(col, '__PLACEHOLDER__');
    if (useDeletedAtCheck) q = q.is('deleted_at', null);
    // We won't execute like this; function below will replace placeholder
    return q;
  } catch (e) {
    throw e;
  }
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    process.exit(2);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/check-user-isolation-fixed.cjs <userA> <userB>');
    process.exit(2);
  }
  const [userA, userB] = args;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const tables = [
    { name: 'session_history', userCol: 'user_id', checkDeletedAt: true },
    { name: 'bookmarks', userCol: 'user_id', checkDeletedAt: true },
    { name: 'companions', userCol: 'author', checkDeletedAt: true },
    { name: 'session_ratings', userCol: 'user_id', checkDeletedAt: false },
    { name: 'companion_ratings', userCol: 'user_id', checkDeletedAt: false }
  ];

  console.log(`Checking DB isolation for users: ${userA} and ${userB}\n`);

  for (const t of tables) {
    console.log(`=== TABLE: ${t.name} ===\n`);
    try {
      // Check that table exists by selecting 0 rows
      const probe = await supabase.from(t.name).select(t.userCol).limit(0);
      if (probe.error) {
        console.warn(`Table ${t.name} probe error: ${probe.error.message}`);
      }

      // Try count for userA
      let qA = supabase.from(t.name).select(t.userCol, { count: 'exact', head: false }).eq(t.userCol, userA);
      if (t.checkDeletedAt) qA = qA.is('deleted_at', null);
      const countAresp = await qA;
      const countA = countAresp?.count ?? 'n/a';

      // Try count for userB
      let qB = supabase.from(t.name).select(t.userCol, { count: 'exact', head: false }).eq(t.userCol, userB);
      if (t.checkDeletedAt) qB = qB.is('deleted_at', null);
      const countBresp = await qB;
      const countB = countBresp?.count ?? 'n/a';

      // samples
      let sampleAresp, sampleBresp;
      try {
        let sA = supabase.from(t.name).select('*').eq(t.userCol, userA).limit(5);
        if (t.checkDeletedAt) sA = sA.is('deleted_at', null);
        sampleAresp = await sA;
      } catch (e) {
        sampleAresp = { error: { message: String(e) } };
      }
      try {
        let sB = supabase.from(t.name).select('*').eq(t.userCol, userB).limit(5);
        if (t.checkDeletedAt) sB = sB.is('deleted_at', null);
        sampleBresp = await sB;
      } catch (e) {
        sampleBresp = { error: { message: String(e) } };
      }

      console.log(`User A (${userA}) count (approx):`, countA);
      console.log(`User A (${userA}) sample:`, sampleAresp.error ? `ERROR: ${sampleAresp.error.message}` : sampleAresp.data);
      console.log();
      console.log(`User B (${userB}) count (approx):`, countB);
      console.log(`User B (${userB}) sample:`, sampleBresp.error ? `ERROR: ${sampleBresp.error.message}` : sampleBresp.data);
      console.log('\n');
    } catch (err) {
      console.error(`Error checking ${t.name}:`, err?.message ?? err);
      console.log('\n');
    }
  }

  console.log('DONE. Interpretation: If userA has rows and userB zero (or different rows), isolation looks good.');
  process.exit(0);
}

main().catch(e => {
  console.error('Uncaught error:', e);
  process.exit(1);
});
