import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

function normalizePesquisa(item: any, tipo: 'IDV' | 'INSTA', sourceDb: 'neon' | 'supabase') {
  const d = item.dados_completos || {};
  return {
    id: item.id,
    pesquisa_type: tipo,
    source_table: tipo === 'IDV' ? 'pesquisa_satisfacao_idv' : 'pesquisa_satisfacao_instagram',
    source_db: sourceDb,
    created_at: item.created_at,
    nome_cliente: item.nome_cliente || d.Nome_Cliente || d.nome_cliente || 'Cliente Anônimo',
    email: item.email || d.Email || d.email || '',
    whatsapp: item.whatsapp || d.WhatsApp || d.whatsapp || '',
    chance_indicar: item.chance_indicar || d.Chance_Indicar || d.chance_indicar || '',
    relato: item.relato || d.Relato || d.relato || '',
    autoriza_depoimento: item.autoriza_depoimento || d.Autoriza_Depoimento || d.autoriza_depoimento || '',
    // Campos específicos IDV
    satisfacao_resultado: item.satisfacao_resultado || d.Satisfacao_Resultado || d.satisfacao_resultado || '',
    representa_melhor: item.representa_melhor || d.Representa_Melhor || d.representa_melhor || '',
    percepcao_marca: item.percepcao_marca || d.Percepcao_Marca || d.percepcao_marca || '',
    // Campos específicos Instagram
    satisfacao_gerenciamento: item.satisfacao_gerenciamento || d.Satisfacao_Gerenciamento || d.satisfacao_gerenciamento || '',
    instagram_melhorou: item.instagram_melhorou || d.Instagram_Melhorou || d.instagram_melhorou || '',
    o_que_melhorou: item.o_que_melhorou || d.O_Que_Melhorou || d.o_que_melhorou || '',
    dados_completos: { ...item, ...d },
    raw: item
  };
}

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. Consultar Neon
    const [neonIdv, neonInsta] = await Promise.all([
      (sql as any).query(`
        SELECT *
        FROM pesquisa_satisfacao_idv
        ORDER BY created_at DESC
      `).catch((err: any) => {
        console.error('[Pesquisas List] Erro ao buscar Neon pesquisa_satisfacao_idv:', err);
        return [];
      }),
      (sql as any).query(`
        SELECT *
        FROM pesquisa_satisfacao_instagram
        ORDER BY created_at DESC
      `).catch((err: any) => {
        console.error('[Pesquisas List] Erro ao buscar Neon pesquisa_satisfacao_instagram:', err);
        return [];
      })
    ]);

    // 2. Consultar Supabase se existir
    let supaIdv: any[] = [];
    let supaInsta: any[] = [];
    if (supabase) {
      try {
        const { data: dataIdv } = await supabase.from('pesquisa_satisfacao_idv').select('*').order('created_at', { ascending: false });
        if (dataIdv) supaIdv = dataIdv;
      } catch (err) {
        console.warn('[Pesquisas List] Supabase IDV warning:', err);
      }

      try {
        const { data: dataInsta } = await supabase.from('pesquisa_satisfacao_instagram').select('*').order('created_at', { ascending: false });
        if (dataInsta) supaInsta = dataInsta;
      } catch (err) {
        console.warn('[Pesquisas List] Supabase Instagram warning:', err);
      }
    }

    const allPesquisas: any[] = [];
    const seen = new Set<string>();

    // Processar IDV
    for (const item of [...(neonIdv || []), ...(supaIdv || [])]) {
      const normalized = normalizePesquisa(item, 'IDV', item.source_db || 'neon');
      const key = `IDV-${normalized.id}-${normalized.created_at}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPesquisas.push(normalized);
      }
    }

    // Processar Instagram
    for (const item of [...(neonInsta || []), ...(supaInsta || [])]) {
      const normalized = normalizePesquisa(item, 'INSTA', item.source_db || 'neon');
      const key = `INSTA-${normalized.id}-${normalized.created_at}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPesquisas.push(normalized);
      }
    }

    // Ordenar decrescente por created_at
    allPesquisas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: allPesquisas });
  } catch (error: any) {
    console.error('[Pesquisas List] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
