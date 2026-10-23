// src/lib/presenca/CycleEngine.ts
// Motor de ciclos mensais do módulo Presença (Gestão de Instagram 2.0).
// Gerencia criação, avanço, fechamento de ciclos e dados de dashboard.

import { getDb } from '@/lib/db';
import { ensurePresencaSchema } from './schema';
import {
  isPieceTask, deriveStatus, businessDaysBetween,
  APPROVAL_SLA_BUSINESS_DAYS, OBJECTIVE_KINDS,
  type PillarWeights
} from './constants';

type Sql = ReturnType<typeof getDb>;

function sql(): Sql {
  return getDb();
}

/** Extrai o dia de faturamento da billing_date do projeto. */
function billingDay(billingDate: string | Date | null): number {
  if (!billingDate) return 1;
  const d = new Date(billingDate);
  return d.getUTCDate() || 1;
}

/** Calcula period_start e period_end para um ciclo baseado no billing day. */
function cyclePeriod(billingDayOfMonth: number, referenceDate: Date = new Date()) {
  const now = referenceDate;
  const year = now.getFullYear();
  const month = now.getMonth();

  // Descobre se já passamos do billing day neste mês
  const cappedDay = Math.min(billingDayOfMonth, daysInMonth(year, month));
  const thisMonthStart = new Date(Date.UTC(year, month, cappedDay));

  let periodStart: Date;
  let periodEnd: Date;

  if (now >= thisMonthStart) {
    periodStart = thisMonthStart;
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const nm = nextMonth % 12;
    const cappedEnd = Math.min(billingDayOfMonth, daysInMonth(nextYear, nm));
    periodEnd = new Date(Date.UTC(nextYear, nm, cappedEnd));
  } else {
    // Estamos antes do billing day deste mês: ciclo é do mês anterior
    const prevMonth = month - 1;
    const prevYear = prevMonth < 0 ? year - 1 : year;
    const pm = prevMonth < 0 ? 11 : prevMonth;
    const cappedPrev = Math.min(billingDayOfMonth, daysInMonth(prevYear, pm));
    periodStart = new Date(Date.UTC(prevYear, pm, cappedPrev));
    periodEnd = thisMonthStart;
  }

  // period_end é exclusivo (dia anterior ao próximo billing)
  periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function computeCycleCount(firstPaymentDate: Date, currentPeriodStart: Date): number {
  const startYear = firstPaymentDate.getUTCFullYear();
  const startMonth = firstPaymentDate.getUTCMonth();
  const curYear = currentPeriodStart.getUTCFullYear();
  const curMonth = currentPeriodStart.getUTCMonth();
  const monthsDiff = (curYear - startYear) * 12 + (curMonth - startMonth);
  return Math.max(1, monthsDiff + 1);
}

export class CycleEngine {

  // ==========================================================================
  // 1. GARANTIR CICLO CORRENTE
  // ==========================================================================
  static async ensureCurrentCycle(projectId: string) {
    const db = sql();
    await ensurePresencaSchema(db);

    // Buscar projeto com datas de faturamento e contrato
    const [project] = await db`
      SELECT id, client_id, billing_date, contract_start, created_at, type, service_type, posts_quantity, videos_quantity, current_cycle_id
      FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    if (!project) throw new Error('Projeto não encontrado.');

    // Data de primeiro pagamento / início do ciclo
    const firstPayment = project.contract_start
      ? new Date(project.contract_start)
      : (project.billing_date ? new Date(project.billing_date) : new Date(project.created_at));

    // Verificar se já existe ciclo aberto
    const [openCycle] = await db`
      SELECT * FROM ig_cycles
      WHERE project_id = ${projectId} AND status = 'open'
      ORDER BY period_start DESC LIMIT 1
    `;
    if (openCycle) {
      const todayIso = new Date().toISOString().split('T')[0];
      const cycleEndIso = typeof openCycle.period_end === 'string'
        ? openCycle.period_end.split('T')[0]
        : new Date(openCycle.period_end).toISOString().split('T')[0];

      if (cycleEndIso < todayIso) {
        // Ciclo expirou: auto-fechar para abrir o novo do período atual
        await db`
          UPDATE ig_cycles SET status = 'closed', auto_closed = true, closed_at = NOW(), updated_at = NOW()
          WHERE id = ${openCycle.id}
        `;
      } else {
        // Ciclo aberto válido: garantir contagem dinâmica com base no primeiro pagamento
        const expectedNumber = computeCycleCount(firstPayment, new Date(openCycle.period_start));
        if (openCycle.cycle_number !== expectedNumber) {
          await db`UPDATE ig_cycles SET cycle_number = ${expectedNumber}, updated_at = NOW() WHERE id = ${openCycle.id}`;
          openCycle.cycle_number = expectedNumber;
        }
        if (project.current_cycle_id !== openCycle.id) {
          await db`UPDATE projects SET current_cycle_id = ${openCycle.id} WHERE id = ${projectId}`;
        }
        // Arquivar demandas finalizadas de ciclos anteriores
        await this.archivePreviousCompletedTasks(projectId, openCycle.id, openCycle.period_start);
        // Assegurar que demandas do ciclo aberto estejam geradas
        await this.generateCycleDemands(projectId, openCycle, project);
        return openCycle;
      }
    }

    // Criar novo ciclo
    const bDay = billingDay(project.billing_date);
    const { periodStart, periodEnd } = cyclePeriod(bDay);

    // Buscar ciclo anterior (para herdar direção)
    const [prevCycle] = await db`
      SELECT * FROM ig_cycles
      WHERE project_id = ${projectId}
      ORDER BY period_start DESC LIMIT 1
    `;

    // Contagem dinâmica baseada na data de primeiro pagamento
    const nextNumber = computeCycleCount(firstPayment, new Date(periodStart));
    const inheritedPillars = prevCycle?.pillars || { descoberta: 25, autoridade: 25, relacionamento: 25, conversao: 25 };
    const inheritedKind = prevCycle?.objective_kind || null;

    const [newCycle] = await db`
      INSERT INTO ig_cycles (
        project_id, client_id, cycle_number,
        period_start, period_end, status,
        objective_kind, pillars
      ) VALUES (
        ${projectId}, ${project.client_id}, ${nextNumber},
        ${periodStart}, ${periodEnd}, 'open',
        ${inheritedKind}, ${JSON.stringify(inheritedPillars)}
      )
      ON CONFLICT (project_id, period_start) DO UPDATE
        SET cycle_number = ${nextNumber}, updated_at = NOW()
      RETURNING *
    `;

    // Atualizar referência no projeto
    await db`UPDATE projects SET current_cycle_id = ${newCycle.id} WHERE id = ${projectId}`;

    // Arquivar APENAS as demandas finalizadas do ciclo anterior
    await this.archivePreviousCompletedTasks(projectId, newCycle.id, newCycle.period_start);

    // Gerar demandas mandatórias e peças de conteúdo do novo ciclo
    await this.generateCycleDemands(projectId, newCycle, project);

    // Vincular tarefas do período ao ciclo (caso existam avulsas)
    await db`
      UPDATE tasks SET cycle_id = ${newCycle.id}
      WHERE project_id = ${projectId}
        AND cycle_id IS NULL
        AND deadline >= ${periodStart}::date
        AND deadline <= ${periodEnd}::date
    `;

    return newCycle;
  }

  // ==========================================================================
  // 2. FECHAR CICLO
  // ==========================================================================
  static async closeCycle(cycleId: string, learnings?: string, nextDecision?: string) {
    const db = sql();
    await ensurePresencaSchema(db);

    const [cycle] = await db`
      UPDATE ig_cycles SET
        status = 'closed',
        learnings = COALESCE(${learnings || null}, learnings),
        next_decision = COALESCE(${nextDecision || null}, next_decision),
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${cycleId}
      RETURNING *
    `;
    return cycle;
  }

  // ==========================================================================
  // 3. AVANÇAR / RENOVAR CICLO (fecha atual, abre próximo com geração de demandas)
  // ==========================================================================
  static async advanceCycle(projectId: string, learnings?: string, nextDecision?: string) {
    const db = sql();
    await ensurePresencaSchema(db);

    // Buscar projeto com datas de faturamento e contrato
    const [project] = await db`
      SELECT id, client_id, billing_date, contract_start, created_at, type, service_type, posts_quantity, videos_quantity, current_cycle_id
      FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    if (!project) throw new Error('Projeto não encontrado.');

    // Buscar ciclo atual aberto
    const [openCycle] = await db`
      SELECT * FROM ig_cycles
      WHERE project_id = ${projectId} AND status = 'open'
      ORDER BY period_start DESC LIMIT 1
    `;

    if (openCycle) {
      // 1. Fechar ciclo anterior
      await this.closeCycle(openCycle.id, learnings, nextDecision);

      // 2. Calcular novo período (+1 mês a partir do término do ciclo anterior)
      const prevEnd = new Date(openCycle.period_end);
      const nextStart = new Date(prevEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);

      const nextEnd = new Date(nextStart);
      nextEnd.setUTCMonth(nextEnd.getUTCMonth() + 1);
      nextEnd.setUTCDate(nextEnd.getUTCDate() - 1);

      const nextStartIso = nextStart.toISOString().split('T')[0];
      const nextEndIso = nextEnd.toISOString().split('T')[0];
      const nextNumber = (openCycle.cycle_number || 1) + 1;

      const inheritedPillars = openCycle.pillars || { descoberta: 25, autoridade: 25, relacionamento: 25, conversao: 25 };
      const inheritedKind = openCycle.objective_kind || null;

      // 3. Inserir novo ciclo
      const [newCycle] = await db`
        INSERT INTO ig_cycles (
          project_id, client_id, cycle_number,
          period_start, period_end, status,
          objective_kind, pillars
        ) VALUES (
          ${projectId}, ${project.client_id}, ${nextNumber},
          ${nextStartIso}, ${nextEndIso}, 'open',
          ${inheritedKind}, ${JSON.stringify(inheritedPillars)}
        )
        ON CONFLICT (project_id, period_start) DO UPDATE
          SET cycle_number = ${nextNumber}, status = 'open', updated_at = NOW()
        RETURNING *
      `;

      // 4. Atualizar referência no projeto e avançar data de cobrança
      await db`
        UPDATE projects
        SET current_cycle_id = ${newCycle.id},
            billing_date = ${nextStartIso}
        WHERE id = ${projectId}
      `;

      // 5. Arquivar tarefas concluídas do ciclo anterior
      await this.archivePreviousCompletedTasks(projectId, newCycle.id, newCycle.period_start);

      // 6. Gerar demandas mandatórias e peças do novo ciclo
      await this.generateCycleDemands(projectId, newCycle, project);

      return newCycle;
    }

    // Se não havia ciclo aberto, garantir criação padrão
    await db`UPDATE projects SET current_cycle_id = NULL WHERE id = ${projectId}`;
    return this.ensureCurrentCycle(projectId);
  }

  // ==========================================================================
  // 4. DASHBOARD COMPLETO DO CICLO
  // ==========================================================================
  static async getCycleDashboard(projectId: string, cycleId?: string) {
    const db = sql();
    await ensurePresencaSchema(db);

    // Ciclo ativo ou o solicitado
    let cycle: any;
    if (cycleId) {
      [cycle] = await db`SELECT * FROM ig_cycles WHERE id = ${cycleId}`;
    } else {
      cycle = await this.ensureCurrentCycle(projectId);
    }
    if (!cycle) throw new Error('Ciclo não encontrado.');

    // Todos os ciclos do projeto (para o seletor de histórico)
    const allCycles = await db`
      SELECT id, cycle_number, period_start, period_end, status, objective, objective_kind, learnings, closed_at
      FROM ig_cycles
      WHERE project_id = ${projectId}
      ORDER BY cycle_number DESC
    `;

    // Tarefas do ciclo (inclui peças e tarefas operacionais)
    const tasks = await db`
      SELECT
        t.*,
        CASE WHEN p.id IS NOT NULL THEN json_build_object('nome', p.nome, 'avatar_url', p.avatar_url)
        ELSE null END as assigned_profile
      FROM tasks t
      LEFT JOIN profiles p ON t.assigned_to = p.id
      WHERE t.project_id = ${projectId}
        AND (
          t.cycle_id = ${cycle.id}
          OR (
            t.cycle_id IS NULL
            AND t.deadline >= ${cycle.period_start}::date
            AND t.deadline <= (${cycle.period_end}::date + interval '1 day')
          )
        )
      ORDER BY t.deadline ASC NULLS LAST, t.created_at ASC
    `;

    // Auto-vincular apenas tarefas sem cycle_id que estejam estritamente dentro do período deste ciclo
    const unlinked = tasks.filter((t: any) => !t.cycle_id && t.deadline && new Date(t.deadline) >= new Date(cycle.period_start) && new Date(t.deadline) <= new Date(cycle.period_end));
    if (unlinked.length > 0) {
      const ids = unlinked.map((t: any) => t.id);
      await db`UPDATE tasks SET cycle_id = ${cycle.id} WHERE id = ANY(${ids})`;
    }

    // Eventos de aprovação do projeto/ciclo
    const approvalEvents = await db`
      SELECT * FROM ig_approval_events
      WHERE project_id = ${projectId}
        AND (cycle_id = ${cycle.id} OR cycle_id IS NULL)
      ORDER BY created_at ASC
    `;

    // Peças de conteúdo estritamente pertencentes a este ciclo
    const pieces = tasks.filter((t: any) => isPieceTask(t));
    const published = pieces.filter((t: any) => deriveStatus(t) === 'published');
    const approved = pieces.filter((t: any) => ['approved', 'published', 'scheduled'].includes(deriveStatus(t)));
    const awaitingApproval = pieces.filter((t: any) => deriveStatus(t) === 'awaiting_approval');
    const adjustRequested = pieces.filter((t: any) => deriveStatus(t) === 'adjust_requested');
    const inProduction = pieces.filter((t: any) => deriveStatus(t) === 'in_production');

    // Tempo médio de aprovação (dias úteis)
    let totalApprovalDays = 0;
    let approvalCount = 0;
    let onTimeCount = 0;
    for (const p of pieces) {
      if (p.ig_sent_for_approval_at && p.ig_approved_at) {
        const days = businessDaysBetween(new Date(p.ig_sent_for_approval_at), new Date(p.ig_approved_at));
        totalApprovalDays += days;
        approvalCount++;
        if (days <= APPROVAL_SLA_BUSINESS_DAYS) onTimeCount++;
      }
    }
    const avgApprovalDays = approvalCount > 0 ? Math.round((totalApprovalDays / approvalCount) * 10) / 10 : 0;
    const onTimeRate = approvalCount > 0 ? Math.round((onTimeCount / approvalCount) * 100) : 100;

    // Retrabalho médio
    const totalRevisions = pieces.reduce((sum: number, p: any) => sum + (p.ig_revision_round || 0), 0);
    const avgRevisions = pieces.length > 0 ? Math.round((totalRevisions / pieces.length) * 10) / 10 : 0;

    // Dias restantes no ciclo
    const today = new Date();
    const endDate = new Date(cycle.period_end);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Detectar movimento atual
    let currentMovement = 'direcionar';
    if (cycle.direction_confirmed_at && pieces.length === 0) currentMovement = 'planejar';
    else if (inProduction.length > 0 && awaitingApproval.length === 0) currentMovement = 'produzir';
    else if (awaitingApproval.length > 0 || adjustRequested.length > 0) currentMovement = 'aprovar';
    else if (approved.length > 0 && published.length < pieces.length) currentMovement = 'publicar';
    else if (published.length >= pieces.length && pieces.length > 0) currentMovement = 'aprender';

    // Próximos passos
    const nextSteps: string[] = [];
    if (!cycle.objective) nextSteps.push('Definir objetivo do ciclo');
    if (!cycle.direction_confirmed_at) nextSteps.push('Confirmar direção estratégica');
    if (awaitingApproval.length > 0) nextSteps.push(`${awaitingApproval.length} peça(s) aguardando aprovação`);
    if (adjustRequested.length > 0) nextSteps.push(`${adjustRequested.length} peça(s) com ajuste solicitado`);
    if (inProduction.length > 0) nextSteps.push(`${inProduction.length} peça(s) em produção`);
    if (!cycle.pulse_answered_at && daysRemaining <= 7) nextSteps.push('Enviar pulso mensal ao cliente');
    if (published.length >= pieces.length && pieces.length > 0 && !cycle.learnings) nextSteps.push('Registrar aprendizados do ciclo');

    return {
      cycle,
      allCycles,
      tasks,
      pieces,
      approvalEvents,
      metrics: {
        totalPieces: pieces.length,
        published: published.length,
        approved: approved.length,
        awaitingApproval: awaitingApproval.length,
        adjustRequested: adjustRequested.length,
        inProduction: inProduction.length,
        avgApprovalDays,
        onTimeRate,
        avgRevisions,
        daysRemaining,
      },
      currentMovement,
      nextSteps,
    };
  }

  // ==========================================================================
  // 5. SALVAR RESPOSTAS DO PULSO MENSAL
  // ==========================================================================
  static async savePulseAnswers(cycleId: string, answers: Record<string, string>) {
    const db = sql();
    await ensurePresencaSchema(db);

    const [cycle] = await db`
      UPDATE ig_cycles SET
        pulse_answers = ${JSON.stringify(answers)},
        pulse_answered_at = NOW(),
        updated_at = NOW()
      WHERE id = ${cycleId}
      RETURNING *
    `;
    return cycle;
  }

  // ==========================================================================
  // 6. ATUALIZAR ESTRATÉGIA DO CICLO
  // ==========================================================================
  static async updateCycleStrategy(
    cycleId: string,
    updates: {
      objective?: string;
      objective_kind?: string;
      editorial_strategy?: string;
      pillars?: PillarWeights;
      key_metrics?: { key: string; label: string }[];
      learnings?: string;
      next_decision?: string;
    }
  ) {
    const db = sql();
    await ensurePresencaSchema(db);

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (updates.objective !== undefined) { sets.push(`objective = $${idx++}`); vals.push(updates.objective); }
    if (updates.objective_kind !== undefined) { sets.push(`objective_kind = $${idx++}`); vals.push(updates.objective_kind); }
    if (updates.editorial_strategy !== undefined) { sets.push(`editorial_strategy = $${idx++}`); vals.push(updates.editorial_strategy); }
    if (updates.pillars !== undefined) { sets.push(`pillars = $${idx++}`); vals.push(JSON.stringify(updates.pillars)); }
    if (updates.key_metrics !== undefined) { sets.push(`key_metrics = $${idx++}`); vals.push(JSON.stringify(updates.key_metrics)); }
    if (updates.learnings !== undefined) { sets.push(`learnings = $${idx++}`); vals.push(updates.learnings); }
    if (updates.next_decision !== undefined) { sets.push(`next_decision = $${idx++}`); vals.push(updates.next_decision); }

    if (sets.length === 0) return null;

    sets.push('updated_at = NOW()');
    vals.push(cycleId);

    const query = `UPDATE ig_cycles SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await (db as any).query(query, vals);
    return result[0] || null;
  }

  // ==========================================================================
  // 7. RESUMO PARA ANALYTICS / CLIENTES
  // ==========================================================================
  static async getProjectPresencaSummary(projectId: string) {
    const db = sql();
    await ensurePresencaSchema(db);

    const [cycle] = await db`
      SELECT id, cycle_number, period_start, period_end, status, objective, objective_kind, pulse_answered_at
      FROM ig_cycles
      WHERE project_id = ${projectId} AND status = 'open'
      ORDER BY period_start DESC LIMIT 1
    `;

    if (!cycle) return { hasCycle: false, projectId };

    // Contar peças no ciclo
    const [counts] = await db`
      SELECT
        COUNT(*) FILTER (WHERE ig_is_piece = true OR (task_type IN ('design','video') AND stage NOT ILIKE '%estrat%' AND stage NOT ILIKE '%setup%')) as total_pieces,
        COUNT(*) FILTER (WHERE ig_publish_status = 'published' OR (status = 'completed' AND ig_published_at IS NOT NULL)) as published,
        COUNT(*) FILTER (WHERE status = 'pending_client_approval' OR ig_publish_status = 'awaiting_approval') as awaiting_approval,
        COUNT(*) FILTER (WHERE status = 'review' OR ig_publish_status = 'adjust_requested') as adjust_requested,
        AVG(ig_revision_round) FILTER (WHERE ig_revision_round > 0) as avg_revisions
      FROM tasks
      WHERE project_id = ${projectId}
        AND (cycle_id = ${cycle.id} OR (
          cycle_id IS NULL
          AND deadline >= ${cycle.period_start}::date
          AND deadline <= (${cycle.period_end}::date + interval '1 day')
        ))
    `;

    const today = new Date();
    const endDate = new Date(cycle.period_end);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      hasCycle: true,
      projectId,
      cycleId: cycle.id,
      cycleNumber: cycle.cycle_number,
      periodStart: cycle.period_start,
      periodEnd: cycle.period_end,
      objective: cycle.objective,
      objectiveKind: cycle.objective_kind,
      totalPieces: Number(counts?.total_pieces || 0),
      published: Number(counts?.published || 0),
      awaitingApproval: Number(counts?.awaiting_approval || 0),
      adjustRequested: Number(counts?.adjust_requested || 0),
      avgRevisions: Number(counts?.avg_revisions || 0),
      daysRemaining,
      pulseAnswered: !!cycle.pulse_answered_at,
    };
  }

  // ==========================================================================
  // 8. ARQUIVAR DEMANDAS FINALIZADAS DO CICLO ANTERIOR
  // ==========================================================================
  /**
   * Arquiva APENAS as demandas finalizadas (completed ou delivered) de ciclos anteriores,
   * preservando demandas não concluídas para continuidade das operações.
   */
  static async archivePreviousCompletedTasks(projectId: string, currentCycleId: string, currentCyclePeriodStart?: string | Date) {
    const db = sql();
    await ensurePresencaSchema(db);

    if (currentCyclePeriodStart) {
      const pStart = typeof currentCyclePeriodStart === 'string'
        ? currentCyclePeriodStart.split('T')[0]
        : new Date(currentCyclePeriodStart).toISOString().split('T')[0];

      await db`
        UPDATE tasks
        SET status = 'archived', updated_at = NOW()
        WHERE project_id = ${projectId}
          AND status IN ('completed', 'delivered')
          AND (
            cycle_id IS NULL
            OR cycle_id != ${currentCycleId}
            OR deadline < ${pStart}::date
          )
      `;

      await db`
        UPDATE tasks
        SET cycle_id = NULL
        WHERE project_id = ${projectId}
          AND cycle_id = ${currentCycleId}
          AND deadline < ${pStart}::date
      `;
    } else {
      await db`
        UPDATE tasks
        SET status = 'archived', updated_at = NOW()
        WHERE project_id = ${projectId}
          AND status IN ('completed', 'delivered')
          AND (cycle_id IS NULL OR cycle_id != ${currentCycleId})
      `;
    }
  }

  // ==========================================================================
  // 9. GERAR DEMANDAS DO CICLO (MANDATÓRIAS + PEÇAS)
  // ==========================================================================
  /**
   * Gera as demandas operacionais do ciclo com base no contrato do cliente.
   * Cria tarefas mandatórias (Estratégia, Pulso/Alinhamento, Aprovação, Relatório)
   * e as peças de conteúdo (Posts e Reels) vinculadas diretamente ao ciclo.
   */
  static async generateCycleDemands(projectId: string, cycle: any, projectData?: any) {
    const db = sql();
    await ensurePresencaSchema(db);

    // Verificar se já foram geradas demandas reais (peças ou estratégia) para este ciclo
    const [existing] = await db`
      SELECT COUNT(*)::int as count
      FROM tasks
      WHERE project_id = ${projectId} 
        AND cycle_id = ${cycle.id}
        AND (ig_is_piece = true OR title ILIKE 'Post %' OR title ILIKE 'Reels %' OR title ILIKE 'Planejamento Editorial%')
    `;

    if (existing && Number(existing.count) > 0) {
      return; // Idempotente: tarefas reais deste ciclo já existem
    }

    // Limpar tarefas legadas automáticas de "Novo Ciclo Iniciado" que possam ter sido criadas
    await db`
      DELETE FROM tasks
      WHERE project_id = ${projectId}
        AND (title ILIKE '%Novo Ciclo Iniciado%' OR title ILIKE '%🗓️%')
        AND (cycle_id = ${cycle.id} OR cycle_id IS NULL)
    `;

    // Buscar dados do projeto se não fornecidos
    let proj = projectData;
    if (!proj || proj.posts_quantity === undefined) {
      const [fetched] = await db`
        SELECT id, client_id, posts_quantity, videos_quantity, type, service_type
        FROM projects WHERE id = ${projectId} LIMIT 1
      `;
      proj = fetched;
    }
    if (!proj) return;

    let postsQty = parseInt(proj.posts_quantity) || 0;
    let videosQty = parseInt(proj.videos_quantity) || 0;

    // Se as quantidades não estiverem configuradas, deduzir do pacote/serviço contratado
    if (postsQty === 0 && videosQty === 0) {
      const pkg = `${proj.type || ''} ${proj.service_type || ''}`.toLowerCase();
      if (pkg.includes('pacote 4')) {
        postsQty = 12;
        videosQty = 0;
      } else if (pkg.includes('pacote 3')) {
        postsQty = 8;
        videosQty = 0;
      } else if (pkg.includes('pacote 2')) {
        postsQty = 4;
        videosQty = 0;
      } else if (pkg.includes('pacote 1')) {
        postsQty = 0;
        videosQty = 6;
      } else {
        postsQty = 8;
        videosQty = 0;
      }

      // Persistir no projeto para consistência
      await db`
        UPDATE projects 
        SET posts_quantity = ${postsQty}, videos_quantity = ${videosQty}
        WHERE id = ${projectId}
      `;
      proj.posts_quantity = postsQty;
      proj.videos_quantity = videosQty;
    }

    // Buscar regras de roteamento (para atribuir aos membros certos no Analytics e no Focus)
    const rules = await db`
      SELECT task_type, assignee_id FROM routing_rules WHERE project_id = ${projectId}
    `;
    const rulesMap: Record<string, string> = {};
    for (const r of rules) {
      if (r.task_type && r.assignee_id) rulesMap[r.task_type] = r.assignee_id;
    }

    // Regras globais caso o projeto não tenha regra específica
    const globalRules = await db`
      SELECT task_type, assignee_id FROM routing_rules WHERE assignee_id IS NOT NULL
    `;
    for (const gr of globalRules) {
      if (gr.task_type && !rulesMap[gr.task_type]) {
        rulesMap[gr.task_type] = gr.assignee_id;
      }
    }

    // Buscar admin/gestor default para tarefas estratégicas
    const [defaultAdmin] = await db`
      SELECT id FROM profiles WHERE role IN ('admin', 'gestor') ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END LIMIT 1
    `;
    const adminId = defaultAdmin?.id || null;

    const cycleNumber = cycle.cycle_number || 1;
    const periodStart = new Date(cycle.period_start);
    const periodEnd = new Date(cycle.period_end);

    const calcDeadline = (daysFromStart: number): string => {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + daysFromStart);
      if (d > periodEnd) return periodEnd.toISOString();
      return d.toISOString();
    };

    const tasksToCreate: any[] = [];

    // 1. Mandatória: Planejamento Editorial & Estratégia
    tasksToCreate.push({
      title: `Planejamento Editorial & Estratégia • Ciclo #${cycleNumber}`,
      description: `Definição de objetivos, prioridades comerciais, temas estratégicos e o mix editorial do ciclo.`,
      stage: 'Estratégia',
      task_type: 'copy',
      status: 'pending',
      priority_score: 950,
      deadline: calcDeadline(5),
      estimated_minutes: 90,
      is_blocked: false,
      ig_is_piece: false,
      urgency: true,
    });

    // 2. Mandatória: Reunião de Alinhamento & Pulso Mensal
    tasksToCreate.push({
      title: `Reunião de Alinhamento & Pulso • Ciclo #${cycleNumber}`,
      description: `Reunião mensal de alinhamento com o cliente para coleta de novidades, prioridades e direcionamento estratégico.`,
      stage: 'Planejamento',
      task_type: 'reuniao',
      status: 'pending',
      priority_score: 850,
      deadline: calcDeadline(7),
      estimated_minutes: 60,
      is_blocked: false,
      ig_is_piece: false,
      urgency: false,
    });

    // 3. Peças de Vídeo / Reels (se contratadas)
    for (let i = 1; i <= videosQty; i++) {
      tasksToCreate.push({
        title: `Reels ${i} • Ciclo #${cycleNumber}`,
        description: `Roteirização, edição e capa para o vídeo Reels ${i}.`,
        stage: 'Produção',
        task_type: 'video',
        status: 'pending',
        priority_score: 720 - i,
        deadline: calcDeadline(8 + i * 2),
        estimated_minutes: 60,
        is_blocked: false,
        ig_is_piece: true,
        ig_format: 'Reels',
        ig_publish_status: 'in_production',
        urgency: false,
      });
    }

    // 4. Peças Gráficas / Posts
    for (let i = 1; i <= postsQty; i++) {
      tasksToCreate.push({
        title: `Post ${i} • Ciclo #${cycleNumber}`,
        description: `Criação de arte, carrossel ou design gráfico com copy para o Post ${i}.`,
        stage: 'Produção',
        task_type: 'design',
        status: 'pending',
        priority_score: 700 - i,
        deadline: calcDeadline(10 + Math.floor(i * 1.5)),
        estimated_minutes: 60,
        is_blocked: false,
        ig_is_piece: true,
        ig_format: 'Carrossel / Post',
        ig_publish_status: 'in_production',
        urgency: false,
      });
    }

    // 5. Mandatória: Aprovação de Conteúdos & Agendamento
    tasksToCreate.push({
      title: `Aprovação de Conteúdos & Agendamento • Ciclo #${cycleNumber}`,
      description: `Validação interna e envio do lote completo para aprovação do cliente no Cockpit Atelier, com posterior agendamento.`,
      stage: 'Aprovação',
      task_type: 'setup',
      status: 'pending',
      priority_score: 600,
      deadline: calcDeadline(18),
      estimated_minutes: 45,
      is_blocked: false,
      ig_is_piece: false,
      urgency: false,
    });

    // 6. Mandatória: Relatório de Desempenho & Inteligência
    tasksToCreate.push({
      title: `Relatório de Desempenho & Inteligência • Ciclo #${cycleNumber}`,
      description: `Consolidação das métricas do ciclo, levantamento de aprendizados e recomendações estratégicas para o próximo mês.`,
      stage: 'Relatório',
      task_type: 'management',
      status: 'pending',
      priority_score: 550,
      deadline: periodEnd.toISOString(),
      estimated_minutes: 60,
      is_blocked: false,
      ig_is_piece: false,
      urgency: false,
    });

    // Inserir todas as demandas vinculadas ao novo ciclo com atribuição inteligente
    for (const t of tasksToCreate) {
      const assignedTo = rulesMap[t.task_type] || (t.task_type === 'copy' || t.task_type === 'management' || t.task_type === 'reuniao' ? adminId : null);

      await db`
        INSERT INTO tasks (
          project_id, client_id, cycle_id, title, description, stage, type, task_type,
          status, priority_score, assigned_to, deadline, estimated_minutes, is_blocked,
          ig_is_piece, ig_format, ig_publish_status, urgency, created_at, updated_at
        ) VALUES (
          ${projectId}, ${proj.client_id || null}, ${cycle.id}, ${t.title}, ${t.description || null},
          ${t.stage}, ${t.task_type}, ${t.task_type},
          ${t.status}, ${t.priority_score}, ${assignedTo}, ${t.deadline}, ${t.estimated_minutes}, ${t.is_blocked},
          ${t.ig_is_piece || false}, ${t.ig_format || null}, ${t.ig_publish_status || null}, ${t.urgency || false}, NOW(), NOW()
        )
      `;
    }
  }

  // ==========================================================================
  // 10. SINCRONIZAR TODOS OS CICLOS ATIVOS
  // ==========================================================================
  /**
   * Sincroniza ciclos e renovações para todos os projetos ativos de Instagram.
   * Auto-renova ciclos expirados, arquiva tarefas finalizadas e gera demandas.
   */
  static async syncAllCycles() {
    const db = sql();
    await ensurePresencaSchema(db);

    const activeIgProjects = await db`
      SELECT id FROM projects
      WHERE (
        service_type ILIKE '%instagram%'
        OR service_type ILIKE '%gestão%'
        OR type ILIKE '%instagram%'
        OR (service_type IS NULL AND type ILIKE 'Pacote%')
      )
      AND status NOT IN ('archived', 'paused', 'cancelled')
    `;

    const synched = [];
    for (const p of activeIgProjects) {
      try {
        const cycle = await this.ensureCurrentCycle(p.id);
        synched.push({ projectId: p.id, cycleId: cycle.id, cycleNumber: cycle.cycle_number });
      } catch (err: any) {
        console.error(`[CycleEngine.syncAllCycles] Erro no projeto ${p.id}:`, err?.message || err);
      }
    }
    return synched;
  }
}
