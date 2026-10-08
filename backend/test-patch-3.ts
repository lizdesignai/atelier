import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data, error } = await supabase.from('tasks').update({ dummy: 'test' }).eq('id', 'undefined').single();
  console.log('Update undefined error:', error);
}

test();
