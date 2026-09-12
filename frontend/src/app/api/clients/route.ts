import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    
    // Fetch directly from Neon
    const clients = await (sql as any).query(`
      SELECT id, nome, avatar_url, role 
      FROM profiles 
      WHERE role IN ('client', 'agencia') 
      ORDER BY nome
    `);
    
    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[api/clients] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}