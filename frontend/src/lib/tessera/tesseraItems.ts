// src/lib/tessera/tesseraItems.ts
// Serviço de domínio dos work items: listagem, detalhe, criação, edição (com controle
// otimista de versão), transições de estado, bloqueio, checklist e comentários.
// Toda escrita: valida permissão + estado, grava histórico/auditoria na MESMA instrução SQL.
import {
  badRequest, conflict, forbidden, isUuid, notFound, unprocessable,
} from './errors';
import {
  type Actor, deliverablesOf, fetchItem, getOrgSettings, isOrgMember, ITEM_SELECT, sqlClient,
} from './itemQueries';
import { closeOpenSessionsForItem } from './tesseraSessions';
import { validateTransition } from './stateMachine';
import type { TesseraChecklistItem, TesseraWorkItem, WorkItemStatus } from './types';
import type { BoardResponse, TesseraComment, TesseraHistoryRow, TesseraReviewRow, TesseraSession, WorkItemDetail } from './workTypes';

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const ITEM_TYPES = ['task', 'deliverable', 'gate', 'initiative', 'subtask'] as const;
const STATUSES: WorkItemStatus[] = ['inbox', 'ready', 'in_progress', 'internal_review', 'client_approval', 'scheduled', 'done', 'canceled'];

const has = (arr: readonly string[], v: unknown): v is string => typeof v === 'string' && arr.includes(v);

// ---------------------------------------------------------------- listagem

export interface ListFilters {
  status?: string; owner_id?: string; project_id?: string; priority?: string;
  blocked?: boolean; q?: string; include_closed?: boolean; limit?: number;
}

export async function listItems(orgId: string, f: ListFilters = {}): Promise<TesseraWorkItem[]> {
  const where: string[] = ['w.organization_id = $1::uuid', 'w.archived_at IS NULL'];
  const params: unknown[] = [orgId];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };

  if (f.status) {
    if (!has(STATUSES, f.status)) throw badRequest('Status inválido.');
    add('w.status_id = ?', f.status);
  }
  if (f.owner_id) { if (!isUuid(f.owner_id)) throw badRequest('owner_id inválido.'); add('w.owner_id = ?::uuid', f.owner_id); }
  if (f.project_id) { if (!isUuid(f.project_id)) throw badRequest('project_id inválido.'); add('w.project_id = ?::uuid', f.project_id); }
  if (f.priority) { if (!has(PRIORITIES, f.priority)) throw badRequest('Prioridade inválida.'); add('w.priority = ?', f.priority); }
  if (f.blocked === true) where.push('w.blocked_at IS NOT NULL');
  if (f.blocked === false) where.push('w.blocked_at IS NULL');
  if (f.q && f.q.trim()) add(`w.title ILIKE ?`, `%${f.q.trim().slice(0, 100).replace(/[%_\\]/g, m => '\\' + m)}%`);
  // Por padrão esconde concluídos/cancelados antigos (mantém o quadro leve)
  if (!f.include_closed) where.push(`(w.status_id NOT IN ('done','canceled') OR w.updated_at > NOW() - INTERVAL '14 days')`);

  const limit = Math.min(Math.max(f.limit || 300, 1), 500);
  const rows = await sqlClient().query(
    `${ITEM_SELECT}
      WHERE ${where.join(' AND ')}
      ORDER BY (w.urgency_override AND (w.urgency_expires_at IS NULL OR w.urgency_expires_at > NOW())) DESC,
               (w.blocked_at IS NOT NULL) DESC,
               w.internal_due_at ASC NULLS LAST, w.created_at DESC
      LIMIT ${limit};`,
    params,
  );
  return rows as TesseraWorkItem[];
}

export async function getBoard(orgId: string, f: ListFilters = {}): Promise<BoardResponse> {
  const [items, settings] = await Promise.all([listItems(orgId, f), getOrgSettings(orgId)]);
  return { items, wip_limits: settings.wipLimits };
}

// ---------------------------------------------------------------- detalhe

export async function getDetail(orgId: string, id: string, actor: Actor): Promise<WorkItemDetail> {
  const item = await fetchItem(orgId, id);
  const sql = sqlClient();
  const r = await sql.transaction([
    sql.query(`SELECT * FROM public.tessera_checklist_items WHERE work_item_id = $1::uuid ORDER BY order_index, created_at;`, [id]),
    sql.query(
      `SELECT c.*, p.nome AS author_name FROM public.tessera_comments c
         LEFT JOIN public.profiles p ON p.id = c.author_id
        WHERE c.work_item_id = $1::uuid ORDER BY c.created_at;`, [id]),
    sql.query(
      `SELECT h.*, p.nome AS changed_by_name FROM public.tessera_status_history h
         LEFT JOIN public.profiles p ON p.id = h.changed_by
        WHERE h.work_item_id = $1::uuid ORDER BY h.created_at DESC LIMIT 50;`, [id]),
    sql.query(
      `SELECT r.*, p.nome AS reviewer_name FROM public.tessera_reviews r
         LEFT JOIN public.profiles p ON p.id = r.reviewer_id
        WHERE r.work_item_id = $1::uuid ORDER BY r.created_at DESC;`, [id]),
    sql.query(
      `SELECT COALESCE(SUM(minutes) FILTER (WHERE ended_at IS NOT NULL), 0)::int AS total_minutes FROM public.tessera_work_sessions WHERE work_item_id = $1::uuid;`, [id]),
    sql.query(
      `SELECT s.*, EXTRACT(EPOCH FROM (NOW() - s.started_at))::int AS elapsed_seconds
         FROM public.tessera_work_sessions s WHERE s.work_item_id = $1::uuid AND s.ended_at IS NULL LIMIT 1;`, [id]),
  ]);
  const isOwner = item.owner_id === actor.id;
  return {
    item,
    checklist: r[0] as TesseraChecklistItem[],
    comments: r[1] as TesseraComment[],
    history: r[2] as TesseraHistoryRow[],
    reviews: r[3] as TesseraReviewRow[],
    sessions: { total_minutes: Number((r[4] as any[])[0]?.total_minutes || 0), open: ((r[5] as TesseraSession[])[0]) || null },
    permissions: {
      canEdit: actor.isManager || isOwner,
      canEditAll: actor.isManager,
      canTransition: actor.isManager || isOwner,
      canReview: actor.isManager && item.status_id === 'internal_review',
    },
  };
}

// ---------------------------------------------------------------- criação / edição

function parseDate(v: unknown, field: string): string | null {
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw badRequest(`${field} deve ser uma data ISO válida.`);
  return new Date(v).toISOString();
}

function parseMinutes(v: unknown, field: string, min = 5): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > 2400) throw badRequest(`${field} deve ser um inteiro entre ${min} e 2400 minutos.`);
  return n;
}

function parseDeliverables(v: unknown) {
  if (!Array.isArray(v) || v.length > 20) throw badRequest('deliverables deve ser uma lista de até 20 itens.');
  return v.map((d, i) => {
    const url = typeof d?.url === 'string' ? d.url.trim() : '';
    const label = typeof d?.label === 'string' ? d.label.trim().slice(0, 120) : '';
    if (!/^https?:\/\/\S+$/i.test(url) || url.length > 2000) throw badRequest(`Entregável #${i + 1}: URL http(s) inválida.`);
    return { label: label || url, url };
  });
}

async function assertMember(orgId: string, userId: unknown, field: string) {
  if (userId === null) return;
  if (!isUuid(userId) || !(await isOrgMember(orgId, userId))) throw badRequest(`${field}: usuário não pertence à organização.`);
}

export interface CreateInput {
  title: unknown; description?: unknown; type?: unknown; priority?: unknown; status_id?: unknown;
  owner_id?: unknown; reviewer_id?: unknown; project_id?: unknown; due_at?: unknown; internal_due_at?: unknown;
  estimate_minutes?: unknown; acceptance_criteria?: unknown; client_visible?: unknown; stage_id?: unknown;
}

export async function createItem(orgId: string, input: CreateInput, actor: Actor): Promise<TesseraWorkItem> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 3 || title.length > 200) throw badRequest('O título deve ter de 3 a 200 caracteres.');
  const type = input.type ?? 'task';
  const priority = input.priority ?? 'medium';
  if (!has(ITEM_TYPES, type)) throw badRequest('Tipo inválido.');
  if (!has(PRIORITIES, priority)) throw badRequest('Prioridade inválida.');

  let ownerId = input.owner_id === undefined || input.owner_id === '' ? null : input.owner_id;
  if (!actor.isManager) {
    // Colaborador cria para si ou sem dono; não define prioridade urgente nem atribui a terceiros.
    if (ownerId && ownerId !== actor.id) throw forbidden('Apenas gestores atribuem itens a outras pessoas.');
    if (priority === 'urgent') throw forbidden('Apenas gestores definem prioridade urgente.');
  }
  await assertMember(orgId, ownerId, 'owner_id');
  const reviewerId = input.reviewer_id === undefined || input.reviewer_id === '' ? null : input.reviewer_id;
  await assertMember(orgId, reviewerId, 'reviewer_id');

  let projectId: string | null = null;
  if (input.project_id) {
    if (!isUuid(input.project_id)) throw badRequest('project_id inválido.');
    const p = await sqlClient().query(`SELECT 1 FROM public.projects WHERE id = $1::uuid LIMIT 1;`, [input.project_id]);
    if (!p.length) throw badRequest('Projeto não encontrado.');
    projectId = input.project_id;
  }

  const due = parseDate(input.due_at ?? null, 'due_at');
  const internalDue = parseDate(input.internal_due_at ?? null, 'internal_due_at') ?? due;
  const estimate = input.estimate_minutes === undefined ? 60 : parseMinutes(input.estimate_minutes, 'estimate_minutes');
  const status = ownerId ? 'ready' : 'inbox'; // regra: com responsável nasce "Pronto"; sem, vai para Inbox
  if (input.status_id !== undefined && input.status_id !== status) {
    throw badRequest('O status inicial é definido automaticamente (Inbox sem responsável, Pronto com responsável).');
  }

  const rows = await sqlClient().query(
    `WITH ins AS (
       INSERT INTO public.tessera_work_items
         (organization_id, project_id, type, title, description, status_id, priority, owner_id, reviewer_id, created_by,
          due_at, internal_due_at, estimate_minutes, acceptance_criteria, client_visible, stage_id)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, $10::uuid, $11::timestamptz, $12::timestamptz, $13::int, $14, $15::boolean, $16)
       RETURNING *),
     hist AS (
       INSERT INTO public.tessera_status_history (work_item_id, from_status, to_status, changed_by, reason, duration_seconds)
       SELECT id, NULL, status_id, $10::uuid, 'Criação', 0 FROM ins),
     aud AS (
       INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
       SELECT organization_id, 'work_item', id, 'create', $10::uuid, to_jsonb(ins) FROM ins)
     SELECT id FROM ins;`,
    [
      orgId, projectId, type, title,
      typeof input.description === 'string' ? input.description.slice(0, 8000) : null,
      status, priority, ownerId, reviewerId, actor.id, due, internalDue, estimate,
      typeof input.acceptance_criteria === 'string' ? input.acceptance_criteria.slice(0, 4000) : null,
      input.client_visible === true,
      typeof input.stage_id === 'string' ? input.stage_id.slice(0, 100) : null,
    ],
  );
  return fetchItem(orgId, (rows[0] as { id: string }).id);
}

const MANAGER_FIELDS = new Set(['title', 'type', 'priority', 'owner_id', 'reviewer_id', 'due_at', 'internal_due_at', 'estimate_minutes', 'acceptance_criteria', 'client_visible', 'stage_id']);
const OWNER_FIELDS = new Set(['description', 'remaining_estimate_minutes', 'metadata']);

export async function updateItem(orgId: string, id: string, patch: Record<string, any>, expectedVersion: unknown, actor: Actor): Promise<TesseraWorkItem> {
  if (!Number.isInteger(expectedVersion)) throw badRequest('Informe a versão atual do item (version) para evitar sobrescrever edições de outras pessoas.');
  const item = await fetchItem(orgId, id);
  const isOwner = item.owner_id === actor.id;

  const keys = Object.keys(patch).filter(k => k !== 'version');
  if (!keys.length) throw badRequest('Nenhum campo para atualizar.');
  for (const k of keys) {
    if (!MANAGER_FIELDS.has(k) && !OWNER_FIELDS.has(k)) throw badRequest(`Campo não editável: ${k}`);
    const allowed = actor.isManager || (isOwner && OWNER_FIELDS.has(k));
    if (!allowed) throw forbidden(`Você não pode editar "${k}" neste item.`);
  }

  const sets: string[] = [];
  const params: unknown[] = [id, orgId, expectedVersion];
  const changes: Record<string, [unknown, unknown]> = {};
  const set = (col: string, cast: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}${cast}`);
    changes[col] = [(item as any)[col], value];
  };

  for (const k of keys) {
    const v = patch[k];
    switch (k) {
      case 'title': {
        const t = typeof v === 'string' ? v.trim() : '';
        if (t.length < 3 || t.length > 200) throw badRequest('O título deve ter de 3 a 200 caracteres.');
        set('title', '', t); break;
      }
      case 'type': if (!has(ITEM_TYPES, v)) throw badRequest('Tipo inválido.'); set('type', '', v); break;
      case 'priority': if (!has(PRIORITIES, v)) throw badRequest('Prioridade inválida.'); set('priority', '', v); break;
      case 'description': set('description', '', v === null ? null : String(v).slice(0, 8000)); break;
      case 'acceptance_criteria': set('acceptance_criteria', '', v === null ? null : String(v).slice(0, 4000)); break;
      case 'stage_id': set('stage_id', '', v === null ? null : String(v).slice(0, 100)); break;
      case 'client_visible': if (typeof v !== 'boolean') throw badRequest('client_visible deve ser booleano.'); set('client_visible', '::boolean', v); break;
      case 'owner_id': await assertMember(orgId, v === '' ? null : v, 'owner_id'); set('owner_id', '::uuid', v === '' ? null : v); break;
      case 'reviewer_id': await assertMember(orgId, v === '' ? null : v, 'reviewer_id'); set('reviewer_id', '::uuid', v === '' ? null : v); break;
      case 'due_at': set('due_at', '::timestamptz', parseDate(v, 'due_at')); break;
      case 'internal_due_at': set('internal_due_at', '::timestamptz', parseDate(v, 'internal_due_at')); break;
      case 'estimate_minutes': set('estimate_minutes', '::int', parseMinutes(v, 'estimate_minutes')); break;
      case 'remaining_estimate_minutes': set('remaining_estimate_minutes', '::int', v === null ? null : parseMinutes(v, 'remaining_estimate_minutes', 0)); break;
      case 'metadata': {
        if (v === null || typeof v !== 'object' || Array.isArray(v)) throw badRequest('metadata deve ser um objeto.');
        const m: Record<string, unknown> = { ...v };
        if ('deliverables' in m) m.deliverables = parseDeliverables(m.deliverables);
        params.push(JSON.stringify(m));
        sets.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${params.length}::jsonb`);
        changes.metadata = [(item as any).metadata, m];
        break;
      }
    }
  }

  params.push(JSON.stringify(changes), actor.id);
  const changesIdx = params.length - 1, actorIdx = params.length;
  const rows = await sqlClient().query(
    `WITH upd AS (
       UPDATE public.tessera_work_items
          SET ${sets.join(', ')}, version = version + 1, updated_at = NOW()
        WHERE id = $1::uuid AND organization_id = $2::uuid AND version = $3::int
        RETURNING *),
     aud AS (
       INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
       SELECT organization_id, 'work_item', id, 'update', $${actorIdx}::uuid, $${changesIdx}::jsonb FROM upd)
     SELECT id FROM upd;`,
    params,
  );
  if (!rows.length) {
    throw conflict('Este item foi alterado por outra pessoa. Recarregue para ver a versão mais recente.', 'version_conflict');
  }
  // Mudou de responsável: o cronômetro do antigo dono não pode continuar correndo.
  if ('owner_id' in patch && patch.owner_id !== item.owner_id) await closeOpenSessionsForItem(id);
  return fetchItem(orgId, id);
}

// ---------------------------------------------------------------- transições

// O que um colaborador (dono do item) pode fazer sozinho. Gestores podem qualquer transição válida,
// exceto avançar a partir de "Revisão QA", que exige uma decisão de revisão registrada.
const OWNER_TRANSITIONS = new Set([
  'inbox>ready', 'ready>in_progress', 'in_progress>ready', 'in_progress>internal_review', 'internal_review>in_progress',
]);
const FORWARD_FROM_REVIEW = new Set<WorkItemStatus>(['client_approval', 'scheduled', 'done']);
const NEEDS_UNBLOCKED = new Set<WorkItemStatus>(['in_progress', 'internal_review', 'client_approval', 'scheduled', 'done']);

export async function transitionItem(orgId: string, id: string, to: unknown, actor: Actor, reason?: unknown): Promise<TesseraWorkItem> {
  if (!has(STATUSES, to)) throw badRequest('Status de destino inválido.');
  const target = to as WorkItemStatus;
  const item = await fetchItem(orgId, id);
  const from = item.status_id;
  if (from === target) return item;

  if (!actor.isManager) {
    if (item.owner_id !== actor.id) throw forbidden('Você só pode movimentar itens atribuídos a você.');
    if (!OWNER_TRANSITIONS.has(`${from}>${target}`)) throw forbidden('Esta transição exige um gestor.');
  }
  if (from === 'internal_review' && FORWARD_FROM_REVIEW.has(target)) {
    throw unprocessable('Para avançar a partir da Revisão QA, registre uma decisão de revisão (aprovar ou pedir ajustes).', 'use_review');
  }
  if (item.blocked_at && NEEDS_UNBLOCKED.has(target)) {
    throw unprocessable('Item bloqueado: resolva o bloqueio antes de avançar.', 'blocked');
  }

  const sql = sqlClient();
  const pending = await sql.query(
    `SELECT COUNT(*)::int AS n FROM public.tessera_checklist_items WHERE work_item_id = $1::uuid AND NOT is_completed;`, [id]);
  const v = validateTransition(from, target, {
    hasOwner: Boolean(item.owner_id),
    hasChecklistPending: Number((pending[0] as any).n) > 0,
    hasDeliverable: item.type === 'deliverable' ? deliverablesOf(item).length > 0 : undefined,
  });
  if (!v.allowed) throw unprocessable(v.reason || 'Transição não permitida.', 'invalid_transition');

  const why = typeof reason === 'string' ? reason.trim().slice(0, 500) || null : null;
  const rows = await sql.query(
    `WITH upd AS (
       UPDATE public.tessera_work_items
          SET status_id = $4::text,
              start_at = CASE WHEN $4::text = 'in_progress' THEN COALESCE(start_at, NOW()) ELSE start_at END,
              completed_at = CASE WHEN $4::text = 'done' THEN NOW() WHEN $4::text <> 'done' THEN NULL END,
              version = version + 1, updated_at = NOW()
        WHERE id = $1::uuid AND organization_id = $2::uuid AND status_id = $3::text
        RETURNING *),
     hist AS (
       INSERT INTO public.tessera_status_history (work_item_id, from_status, to_status, changed_by, reason, duration_seconds)
       SELECT id, $3::text, $4::text, $5::uuid, $6::text,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(
                (SELECT MAX(h.created_at) FROM public.tessera_status_history h WHERE h.work_item_id = upd.id), upd.created_at)))::int
         FROM upd),
     aud AS (
       INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
       SELECT organization_id, 'work_item', id, 'transition', $5::uuid, jsonb_build_object('from', $3::text, 'to', $4::text, 'reason', $6::text) FROM upd),
     obx AS (
       INSERT INTO public.tessera_domain_outbox (event_name, payload)
       SELECT 'WorkItemStatusChanged', jsonb_build_object('work_item_id', id, 'from', $3::text, 'to', $4::text, 'actor_id', ($5::uuid)::text) FROM upd)
     SELECT id FROM upd;`,
    [id, orgId, from, target, actor.id, why],
  );
  if (!rows.length) throw conflict('O status do item mudou durante a operação. Recarregue e tente de novo.', 'status_conflict');

  if (from === 'in_progress') await closeOpenSessionsForItem(id);
  return fetchItem(orgId, id);
}

// ---------------------------------------------------------------- bloqueio

export async function setBlocked(orgId: string, id: string, blocked: boolean, reason: unknown, blockerOwnerId: unknown, actor: Actor): Promise<TesseraWorkItem> {
  const item = await fetchItem(orgId, id);
  if (!actor.isManager && item.owner_id !== actor.id) throw forbidden('Você só pode bloquear/desbloquear itens atribuídos a você.');
  if (['done', 'canceled'].includes(item.status_id)) throw unprocessable('Itens concluídos ou cancelados não podem ser bloqueados.');
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (blocked && why.length < 3) throw badRequest('Informe o motivo do bloqueio.');
  if (blocked && blockerOwnerId) await assertMember(orgId, blockerOwnerId, 'blocker_owner_id');

  await sqlClient().query(
    `WITH upd AS (
       UPDATE public.tessera_work_items
          SET blocked_at = CASE WHEN $3::boolean THEN COALESCE(blocked_at, NOW()) ELSE NULL END,
              blocked_reason = CASE WHEN $3::boolean THEN $4::text ELSE NULL END,
              blocker_owner_id = CASE WHEN $3::boolean THEN $5::uuid ELSE NULL END,
              version = version + 1, updated_at = NOW()
        WHERE id = $1::uuid AND organization_id = $2::uuid RETURNING *)
     INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
     SELECT organization_id, 'work_item', id, CASE WHEN $3::boolean THEN 'block' ELSE 'unblock' END, $6::uuid,
            jsonb_build_object('reason', $4::text) FROM upd;`,
    [id, orgId, blocked, blocked ? why : null, blocked && blockerOwnerId ? blockerOwnerId : null, actor.id],
  );
  if (blocked) await closeOpenSessionsForItem(id);
  return fetchItem(orgId, id);
}

// ---------------------------------------------------------------- checklist & comentários

function assertCanTouch(item: TesseraWorkItem, actor: Actor) {
  if (!actor.isManager && item.owner_id !== actor.id) throw forbidden('Apenas o responsável ou um gestor pode alterar este item.');
}

export async function addChecklistItem(orgId: string, itemId: string, title: unknown, actor: Actor): Promise<TesseraChecklistItem> {
  const item = await fetchItem(orgId, itemId);
  assertCanTouch(item, actor);
  const t = typeof title === 'string' ? title.trim() : '';
  if (t.length < 1 || t.length > 255) throw badRequest('O item de checklist deve ter de 1 a 255 caracteres.');
  const rows = await sqlClient().query(
    `INSERT INTO public.tessera_checklist_items (work_item_id, title, order_index)
     VALUES ($1::uuid, $2, COALESCE((SELECT MAX(order_index) + 1 FROM public.tessera_checklist_items WHERE work_item_id = $1::uuid), 0))
     RETURNING *;`, [itemId, t]);
  return rows[0] as TesseraChecklistItem;
}

async function loadChecklist(orgId: string, checklistId: string) {
  if (!isUuid(checklistId)) throw badRequest('id inválido.');
  const rows = await sqlClient().query(
    `SELECT c.id, c.work_item_id FROM public.tessera_checklist_items c
       JOIN public.tessera_work_items w ON w.id = c.work_item_id
      WHERE c.id = $1::uuid AND w.organization_id = $2::uuid LIMIT 1;`, [checklistId, orgId]);
  if (!rows.length) throw notFound('Item de checklist não encontrado.');
  return rows[0] as { id: string; work_item_id: string };
}

export async function toggleChecklistItem(orgId: string, checklistId: string, completed: unknown, actor: Actor): Promise<TesseraChecklistItem> {
  if (typeof completed !== 'boolean') throw badRequest('completed deve ser booleano.');
  const row = await loadChecklist(orgId, checklistId);
  assertCanTouch(await fetchItem(orgId, row.work_item_id), actor);
  const rows = await sqlClient().query(
    `UPDATE public.tessera_checklist_items
        SET is_completed = $2::boolean,
            completed_by = CASE WHEN $2::boolean THEN $3::uuid ELSE NULL END,
            completed_at = CASE WHEN $2::boolean THEN NOW() ELSE NULL END
      WHERE id = $1::uuid RETURNING *;`, [checklistId, completed, actor.id]);
  return rows[0] as TesseraChecklistItem;
}

export async function deleteChecklistItem(orgId: string, checklistId: string, actor: Actor) {
  const row = await loadChecklist(orgId, checklistId);
  assertCanTouch(await fetchItem(orgId, row.work_item_id), actor);
  await sqlClient().query(`DELETE FROM public.tessera_checklist_items WHERE id = $1::uuid;`, [checklistId]);
}

export async function addComment(orgId: string, itemId: string, body: unknown, actor: Actor): Promise<TesseraComment> {
  await fetchItem(orgId, itemId);
  const b = typeof body === 'string' ? body.trim() : '';
  if (b.length < 1 || b.length > 4000) throw badRequest('O comentário deve ter de 1 a 4000 caracteres.');
  const rows = await sqlClient().query(
    `WITH ins AS (INSERT INTO public.tessera_comments (work_item_id, author_id, body) VALUES ($1::uuid, $2::uuid, $3) RETURNING *)
     SELECT ins.*, p.nome AS author_name FROM ins LEFT JOIN public.profiles p ON p.id = ins.author_id;`,
    [itemId, actor.id, b]);
  return rows[0] as TesseraComment;
}
