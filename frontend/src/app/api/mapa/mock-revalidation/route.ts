// POST /api/mapa/mock-revalidation
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

async function getClientId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb();
    
    // Buscar mapa atual
    const mapas = await sql`
      SELECT * FROM mapas 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (mapas.length === 0) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
    }

    const mapaAtual = mapas[0];

    // Criar um novo mapa com IPD maior (+15 pontos totais, divididos)
    await sql`
      INSERT INTO mapas (
        client_id, 
        created_at, 
        etapa_atual, 
        progresso_etapas, 
        score_total, 
        score_clareza, 
        score_autoridade, 
        score_percepcao, 
        score_conversao,
        principal_gargalo, 
        recomendacao,
        mapa_verificado
      )
      VALUES (
        ${clientId}, 
        NOW(), 
        5, 
        '{}'::jsonb,
        LEAST(${mapaAtual.score_total + 15}, 100), 
        LEAST(${mapaAtual.score_clareza + 4}, 100), 
        LEAST(${mapaAtual.score_autoridade + 4}, 100), 
        LEAST(${mapaAtual.score_percepcao + 4}, 100), 
        LEAST(${mapaAtual.score_conversao + 3}, 100),
        'Nenhum', 
        'Parabéns pela evolução do seu IPD. Mantenha a consistência.',
        true
      )
    `;

    return NextResponse.json({ success: true, message: 'Revalidação concluída' });
  } catch (error: any) {
    console.error('[mock-revalidation]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
