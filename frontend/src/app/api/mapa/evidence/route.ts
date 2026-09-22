// POST /api/mapa/evidence — Recebe evidência do cliente para uma etapa

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

export async function POST(request: Request) {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { etapa, tipo, conteudo, arquivo_url } = body;

    if (etapa === undefined || !tipo) {
      return NextResponse.json({ error: 'Campos "etapa" e "tipo" são obrigatórios' }, { status: 400 });
    }

    const sql = getDb();

    // Buscar mapa do cliente
    const mapas = await sql`
      SELECT id, progresso_etapas FROM mapas 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (mapas.length === 0) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
    }

    const mapa = mapas[0];

    // Inserir evidência
    const result = await sql`
      INSERT INTO mapa_evidencias (mapa_id, client_id, etapa, tipo, conteudo, arquivo_url)
      VALUES (${mapa.id}, ${clientId}, ${etapa}, ${tipo}, ${conteudo || null}, ${arquivo_url || null})
      RETURNING id, etapa, tipo, created_at
    `;

    // Marcar evidência como enviada no progresso
    const progresso = mapa.progresso_etapas || {};
    if (!progresso[String(etapa)]) {
      progresso[String(etapa)] = {
        aula_vista: false,
        pdf_aberto: false,
        checkpoint_score: 0,
        tarefas: {},
        evidencia_enviada: false,
        concluida: false,
      };
    }
    progresso[String(etapa)].evidencia_enviada = true;

    await sql`
      UPDATE mapas 
      SET progresso_etapas = ${JSON.stringify(progresso)}::jsonb
      WHERE id = ${mapa.id}
    `;

    return NextResponse.json({ 
      success: true, 
      data: result[0],
      message: 'Evidência registrada com sucesso.'
    });

  } catch (error: any) {
    console.error('[api/mapa/evidence POST] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
