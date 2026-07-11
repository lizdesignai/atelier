require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching agencies...');
  const { data: agencies } = await supabase.from('agencies').select('id, name');
  console.log('Agencies:', agencies);

  if (agencies && agencies.length > 0) {
    const firstAgencyId = agencies[0].id;
    console.log(`Fetching subclients for agency: ${agencies[0].name} (${firstAgencyId})`);
    const { data: subs, error } = await supabase
      .from('agency_subclients')
      .select('*')
      .eq('agency_id', firstAgencyId);
      
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Subclients found:', subs);
    }
  }
}

test();
