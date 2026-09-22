require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const { createClient } = require('@supabase/supabase-js');

const sql = neon(process.env.POSTGRES_URL);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncProfiles() {
  const neonProfiles = await sql`SELECT * FROM profiles`;
  const { data: sbProfiles } = await supabase.from('profiles').select('id');
  const sbProfileIds = new Set(sbProfiles.map(p => p.id));

  const missingProfiles = neonProfiles.filter(p => !sbProfileIds.has(p.id));
  console.log(`Missing profiles: ${missingProfiles.length}`);
  
  for (const p of missingProfiles) {
    console.log(`Syncing missing profile: ${p.nome} (${p.email})`);
    if (!p.email) {
      console.log('No email, skipping auth creation');
      continue;
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: p.email,
      password: 'password123',
      email_confirm: true
    });
    
    let targetId = p.id;
    if (authError) {
      if (authError.message.includes('already exists')) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const user = existing.users.find(u => u.email === p.email);
        if (user) targetId = user.id;
      }
    } else {
      targetId = authData.user.id;
    }
    
    // update or insert? the auth trigger might insert
    const { error: updErr } = await supabase.from('profiles').update({
        nome: p.nome, role: p.role, empresa: p.empresa
    }).eq('id', targetId);
    if (updErr) console.error('Error updating profile:', updErr);
  }
}

syncProfiles().catch(console.error);
