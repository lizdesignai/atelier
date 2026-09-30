require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updateStage() {
  const { data: users, error: uErr } = await supabase.from('profiles').select('id').eq('nome', 'Liz Design'); 
  // Wait, I can't query auth.users with anon key, but I can query profiles to find the client.
  const { data: profile } = await supabase.from('profiles').select('id, nome').ilike('nome', '%Test%').single();

  console.log("Profile:", profile);

  // let's query projects by client_id = profile.id
  if (profile) {
    const { data: proj, error: pErr } = await supabase
      .from('projects')
      .update({ stage: 'descobrir' })
      .eq('client_id', profile.id)
      .select();

    if (pErr) { console.error(pErr); return; }
    console.log("Stage updated", proj);
  } else {
    // try to fetch all profiles to see what the name is
    const { data: all } = await supabase.from('profiles').select('id, nome');
    console.log("All profiles:", all.map(a => a.nome));
  }
}

updateStage();
