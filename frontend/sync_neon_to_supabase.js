require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const { createClient } = require('@supabase/supabase-js');

const sql = neon(process.env.POSTGRES_URL);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  const neonProfiles = await sql`SELECT id, email FROM profiles`;
  const { data: sbProfiles } = await supabase.from('profiles').select('id, email');
  
  const emailToSbId = {};
  for (const sp of sbProfiles) {
    if (sp.email) emailToSbId[sp.email] = sp.id;
  }
  const neonIdToSbId = {};
  for (const np of neonProfiles) {
    neonIdToSbId[np.id] = emailToSbId[np.email] || np.id;
  }

  // Agencies
  const neonAgencies = await sql`SELECT * FROM agencies`;
  const { data: sbAgencies } = await supabase.from('agencies').select('id');
  const sbAgencyIds = new Set(sbAgencies.map(a => a.id));
  const agenciesToInsert = neonAgencies.filter(a => !sbAgencyIds.has(a.id));
  if (agenciesToInsert.length > 0) {
    const { error } = await supabase.from('agencies').insert(agenciesToInsert);
    if (error) console.error('Agencies err', error);
  }

  // Agency subclients
  const neonSubclients = await sql`SELECT * FROM agency_subclients`;
  const { data: sbSubclients } = await supabase.from('agency_subclients').select('id');
  const sbSubclientIds = new Set(sbSubclients.map(s => s.id));
  const subclientsToInsert = neonSubclients.filter(s => !sbSubclientIds.has(s.id));
  if (subclientsToInsert.length > 0) {
    const { error } = await supabase.from('agency_subclients').insert(subclientsToInsert);
    if (error) console.error('Subclients err', error);
  }

  // Tasks
  const neonTasks = await sql`SELECT * FROM tasks`;
  const { data: sbTasks } = await supabase.from('tasks').select('id');
  const sbTaskIds = new Set(sbTasks.map(t => t.id));

  const tasksToInsert = neonTasks
    .filter(t => !sbTaskIds.has(t.id))
    .map(t => {
      const copy = { ...t };
      delete copy.sent_reminders; 
      if (copy.client_id) copy.client_id = neonIdToSbId[copy.client_id] || copy.client_id;
      if (copy.assigned_to) copy.assigned_to = neonIdToSbId[copy.assigned_to] || copy.assigned_to;
      return copy;
    });

  if (tasksToInsert.length > 0) {
    console.log(`Inserting ${tasksToInsert.length} tasks into Supabase...`);
    const { error } = await supabase.from('tasks').insert(tasksToInsert);
    if (error) console.error('Error inserting tasks:', error);
    else console.log('Tasks synced!');
  }
}

sync().catch(console.error);
