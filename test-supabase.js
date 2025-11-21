// test-supabase.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing SUPABASE URL or ANON KEY; check .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

(async () => {
  try {
    // Select all fields from session_history and all fields from the related companions object
    const { data, error } = await supabase
      .from('session_history')
      .select('*, companions(*)')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Err:', error);
      process.exit(1);
    }

    console.log('✅ Recent session_history rows (full objects):');
    console.dir(data, { depth: 6 });
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
