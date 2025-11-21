// scripts/check-user-isolation-debug.cjs
// Robust CommonJS script to check per-user rows in key tables using the Supabase service-role key.
// Usage:
//   SUPABASE_URL=https://<your-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=sk-... node scripts/check-user-isolation-debug.cjs user_A user_B

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
if (args.length < 2) {
  console.error("Usage: node scripts/check-user-isolation-debug.cjs <clerk_user_id_1> <clerk_user_id_2>");
  process.exit(1);
}

const [userA, userB] = args;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function countRows(table, userId) {
  try {
    const { data, error, count, status } = await supabase
      .from(table)
      .select("id", { count: "exact", head: false })
      .eq("user_id", userId)
      .limit(1);
    if (error) return { error };
    // supabase-js returns .count only when count requested, but some setups vary — fallback to a safe query:
    try {
      const q = await supabase.from(table).select("id", { count: "exact" }).eq("user_id", userId);
      return { count: q.count ?? (Array.isArray(q.data) ? q.data.length : null) };
    } catch (e) {
      return { count: count ?? (data ? data.length : 0) };
    }
  } catch (err) {
    return { error: err };
  }
}

async function sampleRows(table, userId, cols = "*", limit = 6) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { error };
    return { data };
  } catch (err) {
    return { error: err };
  }
}

async function runChecks() {
  const tables = [
    { name: "session_history", sampleCols: "id, user_id, created_at, substring(transcript,1,200) as sample_transcript" },
    { name: "bookmarks", sampleCols: "id, companion_id, user_id, created_at, deleted_at" },
    { name: "companions", sampleCols: "id, name, user_id, author, subject, created_at" },
    { name: "session_ratings", sampleCols: "session_id, user_id, rating, updated_at" },
    { name: "companion_ratings", sampleCols: "companion_id, user_id, rating, created_at" },
  ];

  console.log("Checking DB isolation for users:", userA, "and", userB);
  for (const t of tables) {
    console.log("\n=== TABLE:", t.name, "===\n");

    for (const [label, userId] of [["User A", userA], ["User B", userB]]) {
      // count
      const c = await countRows(t.name, userId);
      if (c.error) {
        console.log(`${label} (${userId}) count: ERROR:`, c.error.message || c.error);
      } else {
        console.log(`${label} (${userId}) count (approx):`, c.count);
      }

      // sample rows (safe, non-destructive)
      const s = await sampleRows(t.name, userId, t.sampleCols, 5);
      if (s.error) {
        console.log(`${label} (${userId}) sample: ERROR:`, s.error.message || s.error);
      } else {
        console.log(`${label} (${userId}) sample rows:`);
        console.table(s.data || []);
      }
    }
  }

  console.log("\nDONE. Interpretation:");
  console.log("- If User A has rows and User B has zero rows, DB separation looks good.");
  console.log("- If both users have rows, check whether rows are owned by different clerk ids (they should be).");
  console.log("- If both users show identical rows, those rows were created under the same user_id and must be backfilled/deleted.");
}

runChecks().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
