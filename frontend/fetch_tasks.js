require('dotenv').config({path: '.env.local'});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(`${SUPABASE_URL}/rest/v1/tasks?select=title,status,task_type,stage&order=created_at.desc&limit=30`, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  }
}).then(r => r.json()).then(data => {
  console.log("RECENT TASKS:");
  data.forEach(d => console.log(`- [${d.stage}] [${d.task_type}] ${d.title} (${d.status})`));
}).catch(console.error);
