import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const tables = ['tasks', 'projects', 'profiles', 'agencies', 'agency_subclients', 'routing_rules'];
  const id = '54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9';
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id);
    if (data && data.length > 0) {
      console.log(`Found in table ${table}:`, data);
    }
  }
  console.log("Search complete.");
}
run();
