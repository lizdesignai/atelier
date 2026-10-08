import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  // Get a real task
  const { data: task, error: fetchErr } = await supabase.from('tasks').select('*').limit(1).single();
  if (fetchErr) {
    console.log('Fetch error:', fetchErr);
    return;
  }
  
  console.log('Updating task:', task.id);
  
  const updates = {
    title: task.title,
    description: task.description,
    caption: task.caption,
    urgency: task.urgency,
    deadline: task.deadline,
    assigned_to: task.assigned_to || null,
    external_links: task.external_links || [],
    media_assets: task.media_assets || [],
    attachment_url: task.attachment_url || null
  };
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', task.id)
    .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
    .single();

  console.log('Update task error:', error);
}

test();
