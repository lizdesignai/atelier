import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('atelier_session');
    
    if (!tokenCookie) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const payload = await verifyToken(tokenCookie.value);
    if (!payload || payload.type !== 'session') {
      return NextResponse.json({ success: false, error: 'Sessão inválida.' }, { status: 401 });
    }

    const clientId = payload.sub as string;
    const sql = getDb();

    // Buscar evidências do cliente e ordenar da mais recente para a mais antiga
    const evidencias = await sql`
      SELECT id, etapa, tipo, conteudo, arquivo_url, created_at 
      FROM mapa_evidencias 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC;
    `;

    // Buscar IPD inicial e final se houver
    const mapas = await sql`
      SELECT id, score_total, created_at
      FROM mapas
      WHERE client_id = ${clientId}
      ORDER BY created_at DESC;
    `;
    
    const mapaAtual = mapas.length > 0 ? mapas[0] : null;
    const mapaInicial = mapas.length > 1 ? mapas[mapas.length - 1] : mapaAtual;

    return NextResponse.json({ 
      success: true, 
      data: evidencias,
      evolution: {
        inicial: mapaInicial ? { score: mapaInicial.score_total, date: mapaInicial.created_at } : null,
        atual: mapaAtual ? { score: mapaAtual.score_total, date: mapaAtual.created_at } : null
      }
    });

  } catch (error: any) {
    console.error('Erro em /api/mapa/evidence/list:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
