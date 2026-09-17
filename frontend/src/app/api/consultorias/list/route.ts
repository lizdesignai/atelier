import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

function normalizeConsultoria(c: any, sourceDb: 'neon' | 'supabase') {
  const d = c.dados_completos || {};
  return {
    id: c.id,
    source_table: 'consultorias_posicionamento',
    source_db: sourceDb,
    created_at: c.created_at,
    nome: c.Nome || d.Nome || c.nome || d.nome || 'Prospect',
    email: c.Email || d.Email || c.email || d.email || '',
    telefone: c.WhatsApp || d.WhatsApp || c.telefone || d.telefone || '',
    instagram: c.Redes_Sociais || d.Redes_Sociais || c.Instagram || d.Instagram || c.instagram || d.instagram || '',
    nicho: c.Nome_Marca_Area || d.Nome_Marca_Area || c.Funcao_Empresa || d.Funcao_Empresa || c.nicho || d.nicho || 'Consultoria',
    market_positioning: c.Objetivos_6_Meses || d.Objetivos_6_Meses || c.market_positioning || '',
    strategic_justification: c.Diferencial_Mercado || d.Diferencial_Mercado || c.strategic_justification || '',
    ai_stories_strategy: c.Marca_Pessoa || d.Marca_Pessoa || c.ai_stories_strategy || '',
    ai_tone_of_voice: c.Referencias_Inspiracao || d.Referencias_Inspiracao || c.ai_tone_of_voice || '',
    ai_visual_diagnosis: c.Como_Consultoria_Ajuda || d.Como_Consultoria_Ajuda || c.ai_visual_diagnosis || '',
    ai_brand_archetype: c.Algo_Mais || d.Algo_Mais || c.ai_brand_archetype || '',
    publico_atual: c.Publico_Atual || d.Publico_Atual || '',
    publico_desejado: c.Publico_Desejado || d.Publico_Desejado || '',
    tempo_marca: c.Tempo_Marca || d.Tempo_Marca || '',
    como_conheceu: c.Como_Conheceu || d.Como_Conheceu || '',
    funcao_empresa: c.Funcao_Empresa || d.Funcao_Empresa || '',
    link_logo_atual: c.Link_Logo_Atual || d.Link_Logo_Atual || '',
    descricao_identidade_atual: c.Descricao_Identidade_Atual || d.Descricao_Identidade_Atual || '',
    dados_completos: { ...c, ...d },
    raw: c
  };
}

function normalizeLead(l: any, sourceDb: 'neon' | 'supabase') {
  return {
    id: l.id,
    source_table: 'leads',
    source_db: sourceDb,
    created_at: l.created_at,
    nome: l.nome || 'Lead',
    email: l.email || '',
    telefone: l.telefone || '',
    instagram: l.instagram || '',
    nicho: l.nicho || 'Lead',
    market_positioning: l.market_positioning || '',
    strategic_justification: l.strategic_justification || '',
    ai_stories_strategy: l.ai_stories_strategy || '',
    ai_tone_of_voice: l.ai_tone_of_voice || '',
    ai_visual_diagnosis: l.ai_visual_diagnosis || '',
    ai_brand_archetype: l.ai_brand_archetype || '',
    status: l.status || 'prospect',
    dados_completos: l,
    raw: l
  };
}

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. Neon queries
    const [neonConsultorias, neonLeads] = await Promise.all([
      sql`SELECT * FROM consultorias_posicionamento ORDER BY created_at DESC`.catch(err => {
        console.error('[Consultorias List] Error querying Neon consultorias:', err);
        return [];
      }),
      sql`SELECT * FROM leads ORDER BY created_at DESC`.catch(err => {
        console.error('[Consultorias List] Error querying Neon leads:', err);
        return [];
      })
    ]);

    // 2. Supabase queries
    let supaConsultorias: any[] = [];
    let supaLeads: any[] = [];

    if (supabase) {
      const [resCons, resLeads] = await Promise.all([
        supabase.from('consultorias_posicionamento').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false })
      ]);
      supaConsultorias = resCons.data || [];
      supaLeads = resLeads.data || [];
    }

    // 3. Deduplicate and normalize
    // Keep track of seen IDs and emails
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const result: any[] = [];

    // Prioritize consultorias (Neon first, then Supabase)
    const allConsultorias = [
      ...neonConsultorias.map((c: any) => normalizeConsultoria(c, 'neon')),
      ...supaConsultorias.map((c: any) => normalizeConsultoria(c, 'supabase'))
    ];

    for (const item of allConsultorias) {
      const idKey = String(item.id);
      const emailKey = item.email ? String(item.email).toLowerCase().trim() : '';

      if (seenIds.has(idKey)) continue;
      if (emailKey && seenEmails.has(emailKey)) {
        // If already seen by email, check if current has more info
        continue;
      }

      seenIds.add(idKey);
      if (emailKey) seenEmails.add(emailKey);
      result.push(item);
    }

    // Next add leads (if not already included by id or email)
    const allLeads = [
      ...neonLeads.map((l: any) => normalizeLead(l, 'neon')),
      ...supaLeads.map((l: any) => normalizeLead(l, 'supabase'))
    ];

    for (const lead of allLeads) {
      const idKey = String(lead.id);
      const emailKey = lead.email ? String(lead.email).toLowerCase().trim() : '';

      if (seenIds.has(idKey)) continue;
      if (emailKey && seenEmails.has(emailKey)) continue;

      seenIds.add(idKey);
      if (emailKey) seenEmails.add(emailKey);
      result.push(lead);
    }

    // 4. Sort by created_at DESC
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Consultorias List] General Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
