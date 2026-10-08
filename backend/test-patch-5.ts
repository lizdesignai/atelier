import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data: task } = await supabase.from('tasks').select('*').limit(1).single();
  const updates = { deadline: '' };
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', task.id).single();
  console.log('Update task error with bad deadline:', error);
}
test();
