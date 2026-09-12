import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    
    const idvBriefings = await sql`
      SELECT *
      FROM briefings_identidade_visual
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json({ success: true, data: idvBriefings });
  } catch (error: any) {
    console.error('[IDV Briefings List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
