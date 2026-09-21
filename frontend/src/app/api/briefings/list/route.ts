import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. NEON QUERIES
    const [neonIDV, neonOnboarding] = await Promise.all([
      sql`
        SELECT *
        FROM briefings_identidade_visual
        ORDER BY created_at DESC
      `.catch(err => {
        console.error('[Briefings List] Error Neon briefings_identidade_visual:', err);
        return [];
      }),
      sql`
        SELECT *
        FROM onboarding_respostas
        ORDER BY created_at DESC
      `.catch(err => {
        console.error('[Briefings List] Error Neon onboarding_respostas:', err);
        return [];
      })
    ]);

    // 2. SUPABASE QUERIES
    let supaIDV: any[] = [];
    let supaOnboarding: any[] = [];

    if (supabase) {
      const [resIDV, resOnboarding] = await Promise.all([
        supabase.from('briefings_identidade_visual').select('*').order('created_at', { ascending: false }),
        supabase.from('onboarding_respostas').select('*').order('created_at', { ascending: false })
      ]);
      supaIDV = resIDV.data || [];
      supaOnboarding = resOnboarding.data || [];
    }

    // 3. NORMALIZE AND MERGE
    const allBriefings: any[] = [];
    const seenIds = new Set<string>();
    const seenEmailsAndDates = new Set<string>();

    // Helper to deduplicate
    const addBriefing = (b: any) => {
      const idKey = String(b.id || '');
      const clientEmail = (b.profiles?.email || b.answers?.Email || b.answers?.email || b.email || '').toLowerCase().trim();
      const clientName = (b.profiles?.nome || b.answers?.Nome_Cliente || b.answers?.nome || b.nome || '').toLowerCase().trim();
      const dedupKey = `${b.briefing_type}:${clientEmail || clientName}`;

      if (idKey && seenIds.has(idKey)) return;
      if (dedupKey !== `${b.briefing_type}:` && seenEmailsAndDates.has(dedupKey)) return;

      if (idKey) seenIds.add(idKey);
      if (dedupKey !== `${b.briefing_type}:`) seenEmailsAndDates.add(dedupKey);
      allBriefings.push(b);
    };

    // A) briefings_identidade_visual (Neon & Supabase)
    const combinedIDV = [...neonIDV, ...supaIDV];
    for (const b of combinedIDV) {
      const d = b.dados_completos || {};
      const nome = b.Nome_Cliente || d.Nome_Cliente || b.nome || d.nome || 'Cliente';
      const email = b.Email || d.Email || b.email || d.email || '';
      const empresa = b.Nome_Logotipo || d.Nome_Logotipo || b.nome_logo || d.nome_logo || '';

      // Skip invalid empty test submissions
      if ((!nome || nome === 'null') && (!email || email === 'null')) continue;

      addBriefing({
        id: b.id,
        briefing_type: 'IDV',
        created_at: b.created_at,
        is_completed: b.lido ?? true,
        status: b.lido ? 'approved' : 'pending',
        profiles: {
          nome,
          email,
          empresa
        },
        answers: { ...b, ...d },
        raw: b,
        source_table: 'briefings_identidade_visual'
      });
    }

    // B) onboarding_respostas (Neon & Supabase)
    const combinedOnboarding = [...neonOnboarding, ...supaOnboarding];
    for (const b of combinedOnboarding) {
      const d = b.dados_completos || {};
      const nome = b.Nome || d.Nome || b.nome || d.nome || 'Cliente';
      const email = b.Email || d.Email || b.email || d.email || '';
      const empresa = b.Empresa || d.Empresa || b.empresa || d.empresa || '';

      addBriefing({
        id: b.id,
        briefing_type: 'ONBOARDING',
        created_at: b.created_at,
        is_completed: b.lido ?? true,
        status: b.lido ? 'approved' : 'pending',
        profiles: {
          nome,
          email,
          empresa
        },
        answers: { ...b, ...d },
        raw: b,
        source_table: 'onboarding_respostas'
      });
    }

    // Sort by created_at DESC
    allBriefings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: allBriefings });
  } catch (error: any) {
    console.error('[Briefings List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
