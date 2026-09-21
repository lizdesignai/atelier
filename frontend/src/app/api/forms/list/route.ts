import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

function formatFormRow(row: any, tipo: string, tableName: string) {
  // If dados_completos is missing or empty, build it from the row columns
  let dados = row.dados_completos;
  if (!dados || Object.keys(dados).length === 0) {
    dados = { ...row };
    delete dados.id;
    delete dados.created_at;
    delete dados.lido;
    delete dados.notificado;
    delete dados.dados_completos;
  }

  const clientName = dados.Nome || dados.nome || row.Nome || row.nome || 'Sem Nome';

  return {
    ...row,
    tipo,
    table_name: tableName,
    Nome: clientName,
    dados_completos: dados,
    lido: Boolean(row.lido)
  };
}

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. NEON QUERIES
    const [neonInstas, neonIdvs] = await Promise.all([
      (sql as any).query(`
        SELECT *
        FROM orcamentos_gerenciamento_instagram
        ORDER BY created_at DESC
      `).catch((err: any) => {
        console.error('[Forms List] Error querying Neon orcamentos_gerenciamento_instagram:', err);
        return [];
      }),
      (sql as any).query(`
        SELECT *
        FROM orcamentos_identidade_visual
        ORDER BY created_at DESC
      `).catch((err: any) => {
        console.error('[Forms List] Error querying Neon orcamentos_identidade_visual:', err);
        return [];
      })
    ]);

    // 2. SUPABASE QUERIES
    let supaInstas: any[] = [];
    let supaIdvs: any[] = [];

    if (supabase) {
      const [resInsta, resIdv] = await Promise.all([
        supabase.from('orcamentos_gerenciamento_instagram').select('*').order('created_at', { ascending: false }),
        supabase.from('orcamentos_identidade_visual').select('*').order('created_at', { ascending: false })
      ]);
      supaInstas = resInsta.data || [];
      supaIdvs = resIdv.data || [];
    }

    // 3. MERGE & DEDUPLICATE
    const seenMap = new Set<string>();
    const allForms: any[] = [];

    const addItems = (items: any[], tipo: string, tableName: string) => {
      for (const item of items) {
        const key = `${tableName}:${item.id}`;
        if (seenMap.has(key)) continue;

        // Skip empty test rows
        const d = item.dados_completos || item;
        const name = d.Nome || d.nome || item.Nome;
        const email = d.Email || d.email || item.Email;
        if (!name && !email) continue;
        if (name === 'null' && email === 'null') continue;

        seenMap.add(key);
        allForms.push(formatFormRow(item, tipo, tableName));
      }
    };

    // Prioritize Neon records, then Supabase records
    addItems(neonInstas, 'Gerenciamento Instagram', 'orcamentos_gerenciamento_instagram');
    addItems(supaInstas, 'Gerenciamento Instagram', 'orcamentos_gerenciamento_instagram');

    addItems(neonIdvs, 'Identidade Visual', 'orcamentos_identidade_visual');
    addItems(supaIdvs, 'Identidade Visual', 'orcamentos_identidade_visual');

    // Sort by created_at DESC
    allForms.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, forms: allForms });
  } catch (error: any) {
    console.error('[Forms List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
