import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export async function POST(request: Request) {
  try {
    const { id, table } = await request.json();

    if (!id || !table) {
      return NextResponse.json({ error: 'Faltando id ou tabela' }, { status: 400 });
    }

    const validTables = ['orcamentos_gerenciamento_instagram', 'orcamentos_identidade_visual', 'consultorias_posicionamento'];
    
    if (!validTables.includes(table)) {
      return NextResponse.json({ error: 'Tabela inválida' }, { status: 400 });
    }

    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. Update on Neon
    try {
      if (table === 'orcamentos_gerenciamento_instagram') {
        await (sql as any).query(`UPDATE orcamentos_gerenciamento_instagram SET lido = true WHERE id = $1`, [id]);
      } else if (table === 'orcamentos_identidade_visual') {
        await (sql as any).query(`UPDATE orcamentos_identidade_visual SET lido = true WHERE id = $1`, [id]);
      } else if (table === 'consultorias_posicionamento') {
        await (sql as any).query(`UPDATE consultorias_posicionamento SET lido = true WHERE id = $1`, [id]);
      }
    } catch (neonErr) {
      console.warn('[Forms Mark Read] Neon update warning:', neonErr);
    }

    // 2. Update on Supabase (if present)
    if (supabase) {
      try {
        await supabase.from(table).update({ lido: true }).eq('id', id);
      } catch (supaErr) {
        console.warn('[Forms Mark Read] Supabase update warning:', supaErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Marcado como lido.' });
  } catch (error: any) {
    console.error('[Forms Mark Read] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
