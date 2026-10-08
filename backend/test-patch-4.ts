import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data: task, error: fetchErr } = await supabase.from('tasks').select('*').limit(1).single();
  if (fetchErr) {
    console.log('Fetch error:', fetchErr);
    return;
  }
  
  console.log('Updating task:', task.id);
  
  const updates = {
    assigned_to: '11111111-1111-1111-1111-111111111111'
  };
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', task.id)
    .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
    .single();

  console.log('Update task error with bad assigned_to:', error);
}

test();
