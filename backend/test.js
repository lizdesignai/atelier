require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const { data, error } = await supabase.from('tasks')
    .select('id, project_id, assigned_to, title, status, deadline, created_at, completed_at, actual_time, estimated_time, stage, task_type, attachment_url, subclient_id, agency_id, projects(type, service_type, profiles(nome, avatar_url))')
    .or(`status.neq.completed,completed_at.gte.${fifteenDaysAgo.toISOString()}`)
    .order('deadline', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Database Query Error:', error);
  } else {
    console.log('Query success! Sample:', data);
  }
}

test();
