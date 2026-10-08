import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = postgres(process.env.POSTGRES_URL!);
  const tasks = await sql`SELECT count(*) FROM tasks`;
  console.log('Neon Tasks count:', tasks[0].count);
  await sql.end();
  
  import { createClient } from '@supabase/supabase-js';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  console.log('Supabase Tasks count:', count);
}
run();
