import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // 1. NEON QUERIES
    const [neonIDV, neonClientBriefings, neonInstaBriefings] = await Promise.all([
      sql`
        SELECT *
        FROM briefings_identidade_visual
        ORDER BY created_at DESC
      `.catch(err => {
        console.error('[Briefings List] Error Neon briefings_identidade_visual:', err);
        return [];
      }),
      sql`
        SELECT cb.*, p.nome as profile_nome, p.empresa as profile_empresa, p.email as profile_email
        FROM client_briefings cb
        LEFT JOIN profiles p ON cb.client_id = p.id
        ORDER BY cb.created_at DESC
      `.catch(err => {
        console.error('[Briefings List] Error Neon client_briefings:', err);
        return [];
      }),
      sql`
        SELECT ib.*, p.nome as profile_nome, p.empresa as profile_empresa, p.email as profile_email
        FROM instagram_briefings ib
        LEFT JOIN profiles p ON ib.client_id = p.id
        ORDER BY ib.created_at DESC
      `.catch(err => {
        console.error('[Briefings List] Error Neon instagram_briefings:', err);
        return [];
      }),
    ]);

    // 2. SUPABASE QUERIES
    let supaIDV: any[] = [];
    let supaClientBriefings: any[] = [];
    let supaInstaBriefings: any[] = [];

    if (supabase) {
      const [resIDV, resCB, resIB] = await Promise.all([
        supabase.from('briefings_identidade_visual').select('*').order('created_at', { ascending: false }),
        supabase.from('client_briefings').select('*, profiles(nome, empresa, email)').order('created_at', { ascending: false }),
        supabase.from('instagram_briefings').select('*, profiles(nome, empresa, email)').order('created_at', { ascending: false })
      ]);
      supaIDV = resIDV.data || [];
      supaClientBriefings = resCB.data || [];
      supaInstaBriefings = resIB.data || [];
    }

    // 3. NORMALIZE AND MERGE
    const allBriefings: any[] = [];
    const seenIds = new Set<string>();
    const seenEmailsAndDates = new Set<string>();

    // Helper to deduplicate
    const addBriefing = (b: any) => {
      const idKey = String(b.id || '');
      const clientEmail = (b.profiles?.email || b.answers?.Email || b.answers?.email || '').toLowerCase().trim();
      const clientName = (b.profiles?.nome || b.answers?.Nome_Cliente || b.answers?.nome || '').toLowerCase().trim();
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
      const nome = b.Nome_Cliente || d.Nome_Cliente || 'Cliente';
      const email = b.Email || d.Email || '';
      const empresa = b.Nome_Logotipo || d.Nome_Logotipo || '';

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

    // B) client_briefings (Neon & Supabase)
    const combinedCB = [...neonClientBriefings, ...supaClientBriefings];
    for (const b of combinedCB) {
      const profileNome = b.profile_nome || b.profiles?.nome || b.answers?.nome || 'Cliente';
      const profileEmail = b.profile_email || b.profiles?.email || b.answers?.email || '';
      const profileEmpresa = b.profile_empresa || b.profiles?.empresa || '';

      addBriefing({
        id: b.id,
        briefing_type: 'IDV',
        created_at: b.created_at,
        is_completed: b.is_completed ?? true,
        status: b.is_completed ? 'approved' : 'pending',
        profiles: {
          nome: profileNome,
          email: profileEmail,
          empresa: profileEmpresa
        },
        answers: b.answers || b,
        raw: b,
        source_table: 'client_briefings'
      });
    }

    // C) instagram_briefings (Neon & Supabase)
    const combinedIB = [...neonInstaBriefings, ...supaInstaBriefings];
    for (const b of combinedIB) {
      const profileNome = b.profile_nome || b.profiles?.nome || b.answers?.nome || 'Cliente';
      const profileEmail = b.profile_email || b.profiles?.email || b.answers?.email || '';
      const profileEmpresa = b.profile_empresa || b.profiles?.empresa || '';

      addBriefing({
        id: b.id,
        briefing_type: 'INSTA',
        created_at: b.created_at,
        is_completed: b.is_completed ?? true,
        status: b.is_completed ? 'approved' : 'pending',
        profiles: {
          nome: profileNome,
          email: profileEmail,
          empresa: profileEmpresa
        },
        answers: b.answers || b,
        raw: b,
        source_table: 'instagram_briefings'
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
