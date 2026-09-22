// GET  /api/mapa/progress — Busca mapa + progresso do cliente logado
// PATCH /api/mapa/progress — Atualiza progresso de uma etapa específica

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// Helper: extrair client_id do JWT
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

// ─── GET: Buscar mapa e progresso do cliente ───
export async function GET() {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb();

    let mapas = await sql`
      SELECT * FROM mapas 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC 
    `;

    if (mapas.length === 0) {
      // Auto-iniciar o mapa para clientes válidos com dados mockados para testes (Recuperação inteligente)
      await sql`
        INSERT INTO mapas (
          client_id, created_at, etapa_atual, progresso_etapas, 
          score_total, score_clareza, score_autoridade, score_percepcao, score_conversao,
          principal_gargalo, recomendacao
        )
        VALUES (
          ${clientId}, NOW(), 0, '{}'::jsonb,
          72, 82, 71, 76, 48,
          'conversao', 'Sua marca apresenta gaps na jornada de conversão. Recomendamos uma Gestão Estratégica.'
        )
      `;
      mapas = await sql`
        SELECT * FROM mapas 
        WHERE client_id = ${clientId} 
        ORDER BY created_at DESC 
      `;
    }

    const mapaAtual = mapas[0];
    const mapaInicial = mapas.length > 1 ? mapas[mapas.length - 1] : null;

    // Buscar evidências do cliente para o mapa atual
    const evidencias = await sql`
      SELECT id, etapa, tipo, conteudo, arquivo_url, created_at 
      FROM mapa_evidencias 
      WHERE mapa_id = ${mapaAtual.id} 
      ORDER BY etapa, created_at DESC
    `;

    // Calcular benchmark da base (média de todos os mapas com score > 0)
    const benchmarkResult = await sql`
      SELECT 
        COALESCE(ROUND(AVG(score_total)), 0) as avg_total,
        COALESCE(ROUND(AVG(score_clareza)), 0) as avg_clareza,
        COALESCE(ROUND(AVG(score_autoridade)), 0) as avg_autoridade,
        COALESCE(ROUND(AVG(score_percepcao)), 0) as avg_percepcao,
        COALESCE(ROUND(AVG(score_conversao)), 0) as avg_conversao,
        COUNT(*) as total_mapas
      FROM mapas 
      WHERE score_total > 0
    `;

    const benchmark = benchmarkResult[0];

    return NextResponse.json({
      success: true,
      data: {
        ...mapaAtual,
        evidencias,
        mapa_inicial: mapaInicial, // Opcional, usado na Semana 5
        benchmark: {
          total: Number(benchmark.avg_total),
          clareza: Number(benchmark.avg_clareza),
          autoridade: Number(benchmark.avg_autoridade),
          percepcao: Number(benchmark.avg_percepcao),
          conversao: Number(benchmark.avg_conversao),
          total_mapas: Number(benchmark.total_mapas),
        }
      }
    });

  } catch (error: any) {
    console.error('[api/mapa/progress GET] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

// ─── PATCH: Atualizar progresso de uma etapa ───
export async function PATCH(request: Request) {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { etapa, field, value } = body;
    // field pode ser: 'aula_vista', 'pdf_aberto', 'checkpoint_score', 'tarefas', 'evidencia_enviada'
    // value: true/false para booleanos, número para checkpoint, objeto para tarefas

    if (etapa === undefined || !field) {
      return NextResponse.json({ error: 'Campos "etapa" e "field" são obrigatórios' }, { status: 400 });
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
    const progresso = mapa.progresso_etapas || {};
    
    // Inicializar etapa se não existir
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

    // Atualizar o campo específico
    if (field === 'tarefas' && typeof value === 'object') {
      // Merge de tarefas (ex: { "t1": true })
      progresso[String(etapa)].tarefas = {
        ...progresso[String(etapa)].tarefas,
        ...value,
      };
    } else {
      progresso[String(etapa)][field] = value;
    }

    // Salvar no banco
    await sql`
      UPDATE mapas 
      SET progresso_etapas = ${JSON.stringify(progresso)}::jsonb,
          mapa_visualizado = true
      WHERE id = ${mapa.id}
    `;

    return NextResponse.json({ 
      success: true, 
      data: { progresso_etapas: progresso } 
    });

  } catch (error: any) {
    console.error('[api/mapa/progress PATCH] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
