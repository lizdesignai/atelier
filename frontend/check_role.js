const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tmmptilchainrsptwsxc.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data } = await supabase.from('profiles').select('*').in('role', ['admin', 'gestor', 'colaborador']).order('nome');
  console.log('Data:', data);
  
  if (data) {
    const filtered = data.filter(t => t.status !== 'paused' && !t.is_paused);
    console.log('Filtered team:', filtered.map(t => t.nome));
  }
}

main().catch(console.error);
