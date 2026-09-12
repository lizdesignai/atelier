import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    
    const instas = await (sql as any).query(`
      SELECT id, created_at, lido, dados_completos, 'Gerenciamento Instagram' as tipo, 'orcamentos_gerenciamento_instagram' as table_name
      FROM orcamentos_gerenciamento_instagram
      ORDER BY created_at DESC
    `);
    
    const idvs = await (sql as any).query(`
      SELECT id, created_at, lido, "dados_completos", 'Identidade Visual' as tipo, 'orcamentos_identidade_visual' as table_name
      FROM orcamentos_identidade_visual
      ORDER BY created_at DESC
    `);
    
    const consultorias = await (sql as any).query(`
      SELECT id, created_at, lido, "dados_completos", 'Consultoria de Posicionamento' as tipo, 'consultorias_posicionamento' as table_name
      FROM consultorias_posicionamento
      ORDER BY created_at DESC
    `);

    // Merge and sort
    const allForms = [...instas, ...idvs, ...consultorias].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, forms: allForms });
  } catch (error: any) {
    console.error('[Forms List] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
