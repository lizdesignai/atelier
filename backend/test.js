require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Routing Rules Query...');
  const { data: d1, error: err1 } = await supabase.from('routing_rules').select('id, project_id, task_type, assignee_id, created_at');
  console.log('Routing Rules Error:', err1 ? err1 : 'SUCCESS, length: ' + d1.length);

  console.log('Testing Subclients Query...');
  const { data: d2, error: err2 } = await supabase.from('agency_subclients').select('id, agency_id, name, deliverables_count, created_at, trello_url');
  console.log('Subclients Error:', err2 ? err2 : 'SUCCESS, length: ' + d2.length);
}

test();
