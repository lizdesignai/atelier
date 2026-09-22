// POST /api/mapa/verify
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
    
    // Buscar mapa mais recente
    const mapas = await sql`
      SELECT id, score_total, mapa_verificado FROM mapas 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (mapas.length === 0) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
    }

    const mapa = mapas[0];

    // Checar se atinge 80 pontos
    if (mapa.score_total >= 80) {
      await sql`
        UPDATE mapas 
        SET mapa_verificado = true 
        WHERE id = ${mapa.id}
      `;
      return NextResponse.json({ success: true, verified: true, message: 'Mapa verificado com sucesso!' });
    } else {
      return NextResponse.json({ success: true, verified: false, message: 'IPD abaixo de 80. Continue executando o plano.' });
    }

  } catch (error: any) {
    console.error('[api/mapa/verify POST] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
