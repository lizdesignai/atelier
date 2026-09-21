import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRawSupabase } from '@/lib/supabase-raw';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const supabase = getRawSupabase();

    let neonData = [];
    try {
      neonData = await (sql as any).query(`SELECT * FROM raiox_instagram ORDER BY created_at DESC`);
    } catch (e) {
      console.error('Neon error', e);
    }

    let supaData = [];
    if (supabase) {
      try {
        const { data } = await supabase.from('raiox_instagram').select('*').order('created_at', { ascending: false });
        if (data) supaData = data;
      } catch (e) {
        console.error('Supa error', e);
      }
    }

    const seen = new Set();
    const merged = [];

    for (const item of [...neonData, ...supaData]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push({ ...item, table_name: 'raiox_instagram', tipo: 'O Mapa - Raio X' });
    }

    merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
