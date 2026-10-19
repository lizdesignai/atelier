// src/lib/tessera/tesseraDb.ts
import { getDb } from '@/lib/db';
import { 
  TesseraOrganization, 
  TesseraMembership, 
  TesseraWorkItem, 
  TesseraWorkflowTemplate,
  CommandCenterSummary,
  WorkItemStatus
} from './types';
import { validateTransition } from './stateMachine';

export async function getDefaultOrganization(): Promise<TesseraOrganization> {
  const sql = getDb();
  const rows = await sql.query(`
    SELECT * FROM public.tessera_organizations 
    WHERE slug = 'studio-veronna' 
    LIMIT 1;
  `);

  if (!rows.length) {
    throw new Error('Organização padrão do Tessera não encontrada.');
  }

  return rows[0] as TesseraOrganization;
}

export async function getCommandCenterData(orgId: string): Promise<CommandCenterSummary> {
  const sql = getDb();

  // 1. Organização
  const orgRows = await sql.query(`SELECT * FROM public.tessera_organizations WHERE id = $1;`, [orgId]);
  const organization = (orgRows[0] || {}) as TesseraOrganization;

  // 2. Contadores agregados
  const statsRows = await sql.query(`
    SELECT 
      (SELECT COUNT(*) FROM public.projects WHERE status NOT IN ('delivered', 'archived', 'canceled')) AS active_projects,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND status_id = 'in_progress') AS work_items_in_progress,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND status_id NOT IN ('done', 'canceled') AND internal_due_at < NOW()) AS work_items_at_risk,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND blocked_at IS NOT NULL AND status_id NOT IN ('done', 'canceled')) AS work_items_blocked,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND status_id = 'internal_review') AS pending_internal_reviews,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND status_id = 'client_approval') AS pending_client_approvals,
      (SELECT COUNT(*) FROM public.tessera_work_items WHERE organization_id = $1 AND status_id = 'done' AND completed_at >= CURRENT_DATE) AS today_completed;
  `, [orgId]);

  const stats = statsRows[0] || {
    active_projects: 0,
    work_items_in_progress: 0,
    work_items_at_risk: 0,
    work_items_blocked: 0,
    pending_internal_reviews: 0,
    pending_client_approvals: 0,
    today_completed: 0
  };

  // 3. Alertas Críticos Acionáveis
  // Unimos tarefas bloqueadas, tarefas com atraso real e itens sem responsável
  const alertRows = await sql.query(`
    SELECT 
      w.id,
      w.title,
      w.status_id,
      w.blocked_at,
      w.blocked_reason,
      w.internal_due_at,
      w.urgency_override,
      w.estimate_minutes,
      p.nome as responsible_name,
      p.avatar_url as responsible_avatar,
      proj.type as service_type,
      prof_client.nome as client_name
    FROM public.tessera_work_items w
    LEFT JOIN public.profiles p ON p.id = w.owner_id
    LEFT JOIN public.projects proj ON proj.id = w.project_id
    LEFT JOIN public.profiles prof_client ON prof_client.id = proj.client_id
    WHERE w.organization_id = $1 
      AND w.status_id NOT IN ('done', 'canceled')
      AND (
        w.blocked_at IS NOT NULL 
        OR w.internal_due_at < NOW() 
        OR w.owner_id IS NULL
        OR w.status_id = 'internal_review'
      )
    ORDER BY 
      CASE WHEN w.blocked_at IS NOT NULL THEN 1 WHEN w.internal_due_at < NOW() THEN 2 ELSE 3 END,
      w.internal_due_at ASC NULLS LAST
    LIMIT 6;
  `, [orgId]);

  const critical_alerts = alertRows.map((r: any) => {
    let alertType: 'deadline_risk' | 'blocked' | 'unassigned' | 'sla_breach' | 'capacity_overload' = 'deadline_risk';
    let why = 'Prazo interno vencido com risco de impactar a entrega ao cliente.';
    let consequence = 'Gargalo no cronograma global do projeto.';
    let actionType: 'reassign' | 'unblock' | 'remind_client' | 'qa_review' | 'force_today' = 'force_today';

    if (r.blocked_at) {
      alertType = 'blocked';
      why = `Trabalho bloqueado: ${r.blocked_reason || 'Insumo pendente de aprovação ou cliente'}`;
      consequence = 'Colaborador impedido de avançar na esteira.';
      actionType = 'unblock';
    } else if (!r.responsible_name) {
      alertType = 'unassigned';
      why = 'Item na esteira sem responsável primário atribuído.';
      consequence = 'Demanda órfã com risco de esquecimento.';
      actionType = 'reassign';
    } else if (r.status_id === 'internal_review') {
      alertType = 'sla_breach';
      why = 'Item aguardando validação de QA para liberar ao cliente.';
      consequence = 'Tempo de ciclo acumulando em fila de revisão.';
      actionType = 'qa_review';
    }

    return {
      id: r.id,
      type: alertType,
      title: r.title,
      why_it_matters: why,
      responsible_name: r.responsible_name || 'Não Atribuído',
      responsible_avatar: r.responsible_avatar,
      consequence,
      action_type: actionType,
      target_id: r.id,
      due_date: r.internal_due_at
    };
  });

  // 4. Projetos em Risco
  const projectRows = await sql.query(`
    SELECT 
      proj.id,
      COALESCE(prof.empresa, prof.nome, 'Projeto Ativo') as title,
      COALESCE(prof.nome, 'Cliente') as client_name,
      COALESCE(proj.service_type, proj.type, 'idv') as service_type,
      COALESCE(proj.idv_phase, proj.fase, 'Em Produção') as stage_label,
      COALESCE(proj.brand_health_score, 85) as brand_health_score,
      proj.deadline,
      proj.data_limite
    FROM public.projects proj
    LEFT JOIN public.profiles prof ON prof.id = proj.client_id
    WHERE proj.status NOT IN ('delivered', 'archived', 'canceled')
    ORDER BY proj.brand_health_score ASC, proj.deadline ASC NULLS LAST
    LIMIT 5;
  `);

  const projects_at_risk = projectRows.map((p: any) => {
    let health: 'green' | 'yellow' | 'red' = 'green';
    let risk_cause = 'Cronograma dentro da normalidade.';

    if (p.brand_health_score < 70) {
      health = 'red';
      risk_cause = 'Índice de saúde crítico e risco iminente de insatisfação.';
    } else if (p.brand_health_score < 85) {
      health = 'yellow';
      risk_cause = 'Atenção aos prazos de revisão e alinhamento de escopo.';
    }

    return {
      id: p.id,
      title: p.title,
      client_name: p.client_name,
      service_type: p.service_type,
      stage_label: p.stage_label,
      health,
      risk_cause,
      baseline_due_date: p.deadline || p.data_limite,
      forecast_due_date: p.data_limite || p.deadline
    };
  });

  return {
    organization,
    stats: {
      active_projects: Number(stats.active_projects || 0),
      work_items_in_progress: Number(stats.work_items_in_progress || 0),
      work_items_at_risk: Number(stats.work_items_at_risk || 0),
      work_items_blocked: Number(stats.work_items_blocked || 0),
      pending_internal_reviews: Number(stats.pending_internal_reviews || 0),
      pending_client_approvals: Number(stats.pending_client_approvals || 0),
      today_completed: Number(stats.today_completed || 0)
    },
    critical_alerts,
    projects_at_risk
  };
}

export async function getWorkItems(orgId: string, filters: {
  status?: string;
  owner_id?: string;
  project_id?: string;
  priority?: string;
  is_blocked?: boolean;
  limit?: number;
} = {}): Promise<TesseraWorkItem[]> {
  const sql = getDb();
  
  let query = `
    SELECT 
      w.*,
      p.nome as owner_name,
      p.avatar_url as owner_avatar,
      COALESCE(prof_client.empresa, prof_client.nome, 'Projeto') as project_title,
      prof_client.nome as client_name,
      (SELECT COUNT(*) FROM public.tessera_checklist_items c WHERE c.work_item_id = w.id) as checklist_total,
      (SELECT COUNT(*) FROM public.tessera_checklist_items c WHERE c.work_item_id = w.id AND c.is_completed = true) as checklist_completed
    FROM public.tessera_work_items w
    LEFT JOIN public.profiles p ON p.id = w.owner_id
    LEFT JOIN public.projects proj ON proj.id = w.project_id
    LEFT JOIN public.profiles prof_client ON prof_client.id = proj.client_id
    WHERE w.organization_id = $1 AND w.archived_at IS NULL
  `;
  const params: any[] = [orgId];
  let paramIdx = 2;

  if (filters.status) {
    query += ` AND w.status_id = $${paramIdx++}`;
    params.push(filters.status);
  }
  if (filters.owner_id) {
    query += ` AND w.owner_id = $${paramIdx++}`;
    params.push(filters.owner_id);
  }
  if (filters.project_id) {
    query += ` AND w.project_id = $${paramIdx++}`;
    params.push(filters.project_id);
  }
  if (filters.priority) {
    query += ` AND w.priority = $${paramIdx++}`;
    params.push(filters.priority);
  }
  if (filters.is_blocked !== undefined) {
    if (filters.is_blocked) {
      query += ` AND w.blocked_at IS NOT NULL`;
    } else {
      query += ` AND w.blocked_at IS NULL`;
    }
  }

  query += ` ORDER BY 
    w.urgency_override DESC,
    CASE WHEN w.blocked_at IS NOT NULL THEN 1 ELSE 2 END,
    w.internal_due_at ASC NULLS LAST,
    w.created_at DESC
  `;

  if (filters.limit) {
    query += ` LIMIT $${paramIdx++}`;
    params.push(filters.limit);
  } else {
    query += ` LIMIT 100`;
  }

  const rows = await sql.query(query, params);
  return rows as TesseraWorkItem[];
}

export async function createWorkItem(data: {
  organization_id: string;
  project_id?: string;
  type?: string;
  title: string;
  description?: string;
  status_id?: WorkItemStatus;
  priority?: string;
  owner_id?: string;
  reviewer_id?: string;
  created_by?: string;
  due_at?: string;
  internal_due_at?: string;
  estimate_minutes?: number;
  acceptance_criteria?: string;
  stage_id?: string;
  metadata?: Record<string, any>;
}): Promise<TesseraWorkItem> {
  const sql = getDb();
  
  const status_id = data.status_id || 'inbox';
  const estimate_minutes = data.estimate_minutes || 60;
  const metadata = data.metadata || {};

  const rows = await sql.query(`
    INSERT INTO public.tessera_work_items (
      organization_id, project_id, type, title, description,
      status_id, priority, owner_id, reviewer_id, created_by,
      due_at, internal_due_at, estimate_minutes, acceptance_criteria,
      stage_id, metadata
    ) VALUES (
      $1, $2, COALESCE($3, 'task'), $4, $5,
      $6, COALESCE($7, 'medium'), $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16
    )
    RETURNING *;
  `, [
    data.organization_id,
    data.project_id || null,
    data.type || 'task',
    data.title,
    data.description || null,
    status_id,
    data.priority || 'medium',
    data.owner_id || null,
    data.reviewer_id || null,
    data.created_by || null,
    data.due_at || null,
    data.internal_due_at || data.due_at || null,
    estimate_minutes,
    data.acceptance_criteria || null,
    data.stage_id || null,
    JSON.stringify(metadata)
  ]);

  const newItem = rows[0] as TesseraWorkItem;

  // Registrar auditoria
  await sql.query(`
    INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
    VALUES ($1, 'work_item', $2, 'create', $3, $4);
  `, [data.organization_id, newItem.id, data.created_by || null, JSON.stringify(newItem)]);

  return newItem;
}

export async function transitionWorkItem(
  id: string,
  toStatus: WorkItemStatus,
  actorId?: string,
  reason?: string
): Promise<{ success: boolean; item?: TesseraWorkItem; error?: string }> {
  const sql = getDb();

  const currentRows = await sql.query(`SELECT * FROM public.tessera_work_items WHERE id = $1;`, [id]);
  if (!currentRows.length) {
    return { success: false, error: 'Item não encontrado.' };
  }

  const item = currentRows[0] as TesseraWorkItem;
  const validation = validateTransition(item.status_id, toStatus, {
    hasOwner: Boolean(item.owner_id)
  });

  if (!validation.allowed) {
    return { success: false, error: validation.reason };
  }

  const completedAt = toStatus === 'done' ? 'NOW()' : 'NULL';

  const updateRows = await sql.query(`
    UPDATE public.tessera_work_items
    SET 
      status_id = $2,
      completed_at = CASE WHEN $2 = 'done' THEN NOW() ELSE completed_at END,
      version = version + 1,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [id, toStatus]);

  const updatedItem = updateRows[0] as TesseraWorkItem;

  // Registrar no histórico de status
  await sql.query(`
    INSERT INTO public.tessera_status_history (work_item_id, from_status, to_status, changed_by, reason)
    VALUES ($1, $2, $3, $4, $5);
  `, [id, item.status_id, toStatus, actorId || null, reason || null]);

  // Outbox de evento de domínio
  await sql.query(`
    INSERT INTO public.tessera_domain_outbox (event_name, payload)
    VALUES ('WorkItemStatusChanged', $1);
  `, [JSON.stringify({ work_item_id: id, from_status: item.status_id, to_status: toStatus, actor_id: actorId })]);

  return { success: true, item: updatedItem };
}

export async function toggleBlockWorkItem(
  id: string,
  isBlocked: boolean,
  reason?: string,
  blockerOwnerId?: string,
  actorId?: string
): Promise<TesseraWorkItem> {
  const sql = getDb();

  const rows = await sql.query(`
    UPDATE public.tessera_work_items
    SET 
      blocked_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
      blocked_reason = CASE WHEN $2 THEN $3 ELSE NULL END,
      blocker_owner_id = CASE WHEN $2 THEN $4 ELSE NULL END,
      version = version + 1,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [id, isBlocked, reason || null, blockerOwnerId || null]);

  const updated = rows[0] as TesseraWorkItem;

  await sql.query(`
    INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
    VALUES ($1, 'work_item', $2, $3, $4, $5);
  `, [
    updated.organization_id,
    id,
    isBlocked ? 'block' : 'unblock',
    actorId || null,
    JSON.stringify({ blocked: isBlocked, reason, blockerOwnerId })
  ]);

  return updated;
}

export async function getWorkflowTemplates(orgId: string): Promise<TesseraWorkflowTemplate[]> {
  const sql = getDb();
  const rows = await sql.query(`
    SELECT * FROM public.tessera_workflow_templates
    WHERE organization_id = $1 AND is_published = true
    ORDER BY created_at ASC;
  `, [orgId]);
  return rows as TesseraWorkflowTemplate[];
}
