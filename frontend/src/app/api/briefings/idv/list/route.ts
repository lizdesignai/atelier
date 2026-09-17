import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    // Query Neon
    const neonBriefings = await sql`
      SELECT *
      FROM briefings_identidade_visual
      ORDER BY created_at DESC
    `.catch(err => {
      console.error('[IDV Briefings List] Error querying Neon:', err);
      return [];
    });

    // Query Supabase
    let supaBriefings: any[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('briefings_identidade_visual')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[IDV Briefings List] Error querying Supabase:', error);
      } else if (data) {
        supaBriefings = data;
      }
    }

    // Merge & Deduplicate
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const merged: any[] = [];

    // Prioritize Neon records, then Supabase
    for (const b of [...neonBriefings, ...supaBriefings]) {
      // Normalize fields if dados_completos exists
      const d = b.dados_completos || {};
      const normalized = {
        ...b,
        Nome_Cliente: b.Nome_Cliente || d.Nome_Cliente || 'Cliente',
        Email: b.Email || d.Email || '',
        WhatsApp: b.WhatsApp || d.WhatsApp || '',
        Nome_Logotipo: b.Nome_Logotipo || d.Nome_Logotipo || '',
      };

      const idKey = String(b.id || '');
      const emailKey = normalized.Email ? String(normalized.Email).toLowerCase().trim() : '';

      // Skip empty test rows that have no name and no email
      if (!normalized.Nome_Cliente && !normalized.Email) continue;
      if (normalized.Nome_Cliente === 'null' && normalized.Email === 'null') continue;

      if (idKey && seenIds.has(idKey)) continue;
      if (emailKey && seenEmails.has(emailKey)) {
        // If already seen by email and current has no unique content, skip
        continue;
      }

      if (idKey) seenIds.add(idKey);
      if (emailKey) seenEmails.add(emailKey);
      merged.push(normalized);
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: merged });
  } catch (error: any) {
    console.error('[IDV Briefings List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
