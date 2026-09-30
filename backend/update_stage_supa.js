require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateStage() {
  // 1. find user
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) { console.error(uErr); return; }
  
  const user = users.users.find(u => u.email === 'testeidv2@atelier.com');
  if (!user) { console.log('User not found'); return; }

  console.log("User ID:", user.id);

  // 2. update project
  const { data: proj, error: pErr } = await supabase
    .from('projects')
    .update({ stage: 'descobrir' })
    .eq('client_id', user.id)
    .in('status', ['active', 'delivered']);

  if (pErr) { console.error(pErr); return; }
  
  console.log("Stage updated to descobrir for user projects.", proj);
}

updateStage();
