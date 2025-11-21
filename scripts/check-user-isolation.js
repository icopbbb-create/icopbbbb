// scripts/check-user-isolation.js
// Usage:
//   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=sk... node scripts/check-user-isolation.js user_ABC user_DEF
//
// The script will print counts and sample rows for both Clerk user ids provided.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/check-user-isolation.js <clerk_user_id_1> <clerk_user_id_2>");
  process.exit(1);
}

const [userA, userB] = args;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sample(table, userId, cols = "*", limit = 6) {
  const { data, error } = await supabase
    .from(table)
    .select(cols)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error };
  }
  return { data };
}

async function count(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: false })
    .eq("user_id", userId);

  if (error) {
    return { error };
  }
  // The select returned rows; count is in error? When using select with {count:'exact'} the result object includes .count
  // When using supabase-js v2, a common pattern is to use .select('id', { count: 'exact' })
  // If count is undefined, fallback to length.
  return { count: Array.isArray(count) ? count.length : (count ?? null) };
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
      const { data: countRows, error: countErr } = await supabase
        .from(t.name)
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .limit(1); // limiting rows but count is exact in response

      const count = (countErr ? `ERROR: ${countErr.message}` : (typeof countRows?.length === "number" ? countRows.length : "unknown"));
      console.log(`${label} (${userId}) count (approx):`, count);

      // sample rows (safe, non-destructive)
      const { data, error } = await supabase
        .from(t.name)
        .select(t.sampleCols)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.log(`${label} (${userId}) sample: ERROR:`, error.message || error);
      } else {
        console.log(`${label} (${userId}) sample rows:`);
        console.table(data || []);
      }
    }
  }

  console.log("\nDONE. If both users show rows in the same tables, the DB currently holds data for both.");
  console.log(
    "If a user shows 0 rows but the UI still shows sessions for that user, your app is leaking data (server-side caching or missing user scoping in queries)."
  );
}

runChecks().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
