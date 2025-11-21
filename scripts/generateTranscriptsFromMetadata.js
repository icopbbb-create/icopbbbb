// scripts/generateTranscriptsFromMetadata.js
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generateTranscriptsFromMetadata.js

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function buildTranscriptFromMetadata(meta) {
  if (!meta) return null;
  // If metadata.transcript exists already, prefer it
  if (typeof meta.transcript === 'string' && meta.transcript.trim()) return meta.transcript;

  const msgs = Array.isArray(meta.messages) ? meta.messages : null;
  if (!msgs) return null;

  // join with role prefix
  const parts = msgs.map(m => {
    const role = (m.role || m.sender || '').toString().trim();
    const text = (m.text || m.content || m.message || '').toString().trim();
    if (!text) return null;
    if (!role) return text;
    // map common role names
    const roleLabel = role.toLowerCase() === 'assistant' ? 'AI' : role;
    return `${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}: ${text}`;
  }).filter(Boolean);

  if (!parts.length) return null;
  return parts.join('\n\n');
}

async function main() {
  console.log('Querying session_history rows with metadata.messages...');
  // fetch rows that have metadata.messages and transcript is null
  const { data, error } = await supabase
    .from('session_history')
    .select('id, metadata')
    .is('transcript', null)
    .not('metadata', 'is', null)
    .limit(1000); // adjust pagination as needed

  if (error) {
    console.error('Fetch error', error);
    return;
  }
  console.log(`Found ${data.length} rows to process (first batch).`);

  for (const row of data) {
    try {
      const meta = row.metadata;
      const transcript = await buildTranscriptFromMetadata(meta);
      if (!transcript) {
        console.log(`Skipping ${row.id} — no transcript extracted.`);
        continue;
      }
      const upd = await supabase
        .from('session_history')
        .update({ transcript })
        .eq('id', row.id);

      if (upd.error) {
        console.error('Update error for', row.id, upd.error);
      } else {
        console.log('Updated transcript for', row.id);
      }
    } catch (err) {
      console.error('Row processing error for', row.id, err);
    }
  }

  console.log('Done with this batch. If you have more rows, run script again with pagination.');
}

main().catch(console.error);
