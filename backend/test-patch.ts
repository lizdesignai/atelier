import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const updates = { assigned_to: 'some-id' };
  const id = '54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9';
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
    .single();

  console.log('Update task error:', error);
}

test();
