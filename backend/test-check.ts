import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', '54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9');
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
