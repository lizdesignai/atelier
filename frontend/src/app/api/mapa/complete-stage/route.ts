// POST /api/mapa/complete-stage — Valida critérios e desbloqueia próxima etapa

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

// Tarefas obrigatórias por etapa (IDs que precisam estar true)
const REQUIRED_TASKS: Record<number, string[]> = {
  1: ['t1_bio', 't1_oferta', 't1_cta', 't1_link'],
  2: ['t2_sistema_visual', 't2_padronizar', 't2_aplicar'],
  3: ['t3_caso', 't3_provas', 't3_metodo', 't3_destaque'],
  4: ['t4_oferta', 't4_cta', 't4_caminho', 't4_link'],
};

const TOTAL_STAGES = 5; // Semana 0 (diagnóstico) + 4 semanas + Evolução

export async function POST(request: Request) {
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { etapa } = body;

    if (etapa === undefined) {
      return NextResponse.json({ error: 'Campo "etapa" é obrigatório' }, { status: 400 });
    }

    const sql = getDb();

    // Buscar mapa do cliente
    const mapas = await sql`
      SELECT id, etapa_atual, progresso_etapas FROM mapas 
      WHERE client_id = ${clientId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (mapas.length === 0) {
      return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 });
    }

    const mapa = mapas[0];
    const progresso = mapa.progresso_etapas || {};
    const etapaData = progresso[String(etapa)];

    // Etapa 0 (Baseline)
    if (etapa === 0) {
      if (!etapaData?.objetivos || !etapaData?.compromisso) {
        return NextResponse.json({ 
          error: 'É necessário definir seus objetivos e assumir o compromisso antes de avançar.',
        }, { status: 400 });
      }

      if (!progresso['0']) progresso['0'] = {};
      progresso['0'].concluida = true;

      await sql`
        UPDATE mapas 
        SET etapa_atual = GREATEST(etapa_atual, 1), 
            progresso_etapas = ${JSON.stringify(progresso)}::jsonb
        WHERE id = ${mapa.id}
      `;

      return NextResponse.json({ 
        success: true, 
        message: 'Baseline concluído. Sprint 1 desbloqueado!',
        data: { nova_etapa: 1 }
      });
    }

    // Etapas 1–4: Validar critérios de conclusão
    if (etapa >= 1 && etapa <= 4) {
      if (!etapaData) {
        return NextResponse.json({ 
          error: 'Nenhum progresso registrado para esta etapa.',
          criteria: getCriteria(etapa, null)
        }, { status: 400 });
      }

      const criteria = getCriteria(etapa, etapaData);

      if (!criteria.all_met) {
        return NextResponse.json({ 
          error: 'Critérios de conclusão não atendidos.',
          criteria
        }, { status: 400 });
      }

      // Marcar como concluída e desbloquear próxima
      progresso[String(etapa)].concluida = true;
      const novaEtapa = Math.min(etapa + 1, TOTAL_STAGES);

      await sql`
        UPDATE mapas 
        SET etapa_atual = ${novaEtapa}, 
            progresso_etapas = ${JSON.stringify(progresso)}::jsonb
        WHERE id = ${mapa.id}
      `;

      // INSTRUMENTAÇÃO: Se concluiu a semana 4, ele foi para a Evolução (quente para Upsell)
      if (etapa === 4) {
        try {
          const managers = await sql`SELECT id FROM profiles WHERE role IN ('admin', 'gestor')`;
          for (const m of managers) {
            await sql`
              INSERT INTO notifications (user_id, title, message, type, action_url, is_read)
              VALUES (${m.id}, '🎯 Jornada Concluída', 'Um cliente do Mapa 4D chegou à etapa final de Evolução e reavaliação.', 'success', '/admin/clientes', false)
            `;
          }
        } catch (e) {
          console.error('Erro ao notificar gestores:', e);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Sprint ${etapa} concluído! ${novaEtapa <= 4 ? `Sprint ${novaEtapa} desbloqueado.` : 'Reavaliação disponível!'}`,
        data: { nova_etapa: novaEtapa, criteria }
      });
    }

    return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('[api/mapa/complete-stage POST] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}

function getCriteria(etapa: number, etapaData: any) {
  const data = etapaData || {};
  const requiredTasks = REQUIRED_TASKS[etapa] || [];
  const tarefas = data.tarefas || {};
  
  const aula_vista = !!data.aula_vista;
  const checkpoint_ok = (data.checkpoint_score || 0) >= 80;
  const evidencia_ok = !!data.evidencia_enviada;
  const tarefas_ok = requiredTasks.length === 0 || requiredTasks.every((t: string) => !!tarefas[t]);

  return {
    aula_vista,
    checkpoint_ok,
    checkpoint_score: data.checkpoint_score || 0,
    evidencia_ok,
    tarefas_ok,
    tarefas_pendentes: requiredTasks.filter((t: string) => !tarefas[t]),
    all_met: aula_vista && checkpoint_ok && evidencia_ok && tarefas_ok,
  };
}
