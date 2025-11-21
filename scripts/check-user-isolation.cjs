// scripts/check-user-isolation.cjs
// Usage:
//   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_role node scripts/check-user-isolation.cjs user_XXXX user_YYYY
// Windows Powershell:
//   $env:SUPABASE_URL="https://..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node .\scripts\check-user-isolation.cjs user_1 user_2

const { createClient } = require("@supabase/supabase-js");

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(2);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scripts/check-user-isolation.cjs <userA> <userB>");
    process.exit(2);
  }
  const [userA, userB] = args;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const tables = [
    { name: "session_history", userCol: "user_id" },
    { name: "bookmarks", userCol: "user_id" },
    // companions may use 'author' as owner column in your schema
    { name: "companions", userCol: "author" },
    { name: "session_ratings", userCol: "user_id" },
    { name: "companion_ratings", userCol: "user_id" },
  ];

  console.log(`Checking DB isolation for users: ${userA} and ${userB}\n`);

  for (const t of tables) {
    try {
      console.log(`=== TABLE: ${t.name} ===\n`);

      const countA = await supabase
        .from(t.name)
        .select(t.userCol, { count: "exact", head: false })
        .eq(t.userCol, userA)
        .is("deleted_at", null)
        .limit(1);

      const countB = await supabase
        .from(t.name)
        .select(t.userCol, { count: "exact", head: false })
        .eq(t.userCol, userB)
        .is("deleted_at", null)
        .limit(1);

      // read a few sample rows for each user
      const sampleA = await supabase.from(t.name).select("*").eq(t.userCol, userA).is("deleted_at", null).limit(5);
      const sampleB = await supabase.from(t.name).select("*").eq(t.userCol, userB).is("deleted_at", null).limit(5);

      console.log(`User A (${userA}) count (approx):`, countA?.count ?? "n/a");
      console.log(`User A (${userA}) sample:`, sampleA.error ? `ERROR: ${sampleA.error.message}` : sampleA.data);
      console.log();
      console.log(`User B (${userB}) count (approx):`, countB?.count ?? "n/a");
      console.log(`User B (${userB}) sample:`, sampleB.error ? `ERROR: ${sampleB.error.message}` : sampleB.data);
      console.log("\n");
    } catch (err) {
      console.error(`Error checking table ${t.name}:`, err?.message ?? err);
      console.log("\n");
    }
  }

  console.log("DONE. Interpretation tips:");
  console.log("- If User A has rows and User B has zero rows, DB separation looks good.");
  console.log("- If both users show rows, check the rows' owner columns to confirm they belong to different clerk ids.");
  console.log("- If both users show identical rows (same row id or same content), those rows were created under the same user_id and must be fixed/backfilled.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Uncaught error:", e);
  process.exit(1);
});
