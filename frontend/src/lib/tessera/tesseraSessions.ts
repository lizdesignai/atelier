// src/lib/tessera/tesseraSessions.ts
// Sessões de trabalho (cronômetro AUTORITATIVO no servidor) e o quadro "Meu Focus".
//
// Garantias:
//  - No máximo UMA sessão aberta por usuário (índice único parcial no banco).
//  - Tempo medido pelo relógio do servidor (NOW()), nunca pelo navegador.
//  - actual_minutes é DERIVADO (soma das sessões fechadas): refazer o cálculo é idempotente.
//  - Sessão esquecida aberta é limitada a 8h (flag `capped`) para não contaminar métricas.
import { badRequest, conflict, forbidden, unprocessable } from './errors';
import {
  type Actor, fetchItem, getOrgSettings, ITEM_SELECT, sqlClient,
} from './itemQueries';
import { planFocus, type PlannerItem } from './focusPlanner';
import type { TesseraWorkItem } from './types';
import type { FocusBoardResponse, TesseraSession } from './workTypes';

const MAX_SESSION_MINUTES = 480;

const CLOSE_SESSIONS_SQL = (where: string) => `
  UPDATE public.tessera_work_sessions
     SET ended_at = NOW(),
         minutes  = LEAST(ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60)::int, ${MAX_SESSION_MINUTES}),
         capped   = (EXTRACT(EPOCH FROM (NOW() - started_at)) / 60) > ${MAX_SESSION_MINUTES}
   WHERE ended_at IS NULL AND ${where}
   RETURNING *`;

// Dentro de uma transação NOW() é constante, então `ended_at = NOW()` identifica
// exatamente as sessões fechadas nesta transação.
const RECOMPUTE_ACTUAL_SQL = `
  UPDATE public.tessera_work_items w
     SET actual_minutes = COALESCE((
           SELECT SUM(s.minutes) FROM public.tessera_work_sessions s
            WHERE s.work_item_id = w.id AND s.ended_at IS NOT NULL), 0)::int
   WHERE w.id IN (SELECT work_item_id FROM public.tessera_work_sessions WHERE ended_at = NOW())`;

export async function getActiveSession(orgId: string, userId: string): Promise<TesseraSession | null> {
  const rows = await sqlClient().query(
    `SELECT s.*, EXTRACT(EPOCH FROM (NOW() - s.started_at))::int AS elapsed_seconds, w.title AS item_title
       FROM public.tessera_work_sessions s
       JOIN public.tessera_work_items w ON w.id = s.work_item_id
      WHERE s.user_id = $1::uuid AND s.ended_at IS NULL AND w.organization_id = $2::uuid
      LIMIT 1;`,
    [userId, orgId],
  );
  if (rows[0]) return rows[0] as TesseraSession;

  // Fallback: se o colaborador iniciou a sessão via Focus nativo (/admin/jtbd)
  const wsRows = await sqlClient().query(
    `SELECT ws.id, ws.user_id, ws.task_id AS work_item_id, ws.start_time AS started_at,
            EXTRACT(EPOCH FROM (NOW() - ws.start_time))::int AS elapsed_seconds,
            COALESCE(t.title, 'Tarefa em Foco') AS item_title
       FROM public.work_sessions ws
       LEFT JOIN public.tasks t ON t.id = ws.task_id
      WHERE ws.user_id = $1::uuid AND ws.end_time IS NULL
      LIMIT 1;`,
    [userId],
  );
  if (wsRows[0]) {
    const ws = wsRows[0] as any;
    return {
      id: ws.id,
      user_id: ws.user_id,
      work_item_id: ws.work_item_id,
      started_at: ws.started_at,
      ended_at: null,
      minutes: null,
      capped: false,
      source: 'focus_timer',
      elapsed_seconds: ws.elapsed_seconds,
      item_title: ws.item_title,
    } as TesseraSession;
  }

  return null;
}

export async function startSession(orgId: string, itemId: string, actor: Actor) {
  const item = await fetchItem(orgId, itemId);
  if (item.owner_id !== actor.id) throw forbidden('Você só pode cronometrar itens atribuídos a você.');
  if (item.blocked_at) throw unprocessable('Item bloqueado: resolva o bloqueio antes de iniciar.', 'blocked');
  if (!['ready', 'in_progress'].includes(item.status_id)) {
    throw unprocessable('Só é possível iniciar itens em "Pronto" ou "Em Execução".', 'invalid_status');
  }

  const current = await getActiveSession(orgId, actor.id);
  if (current && current.work_item_id === itemId) {
    return { session: current, already_running: true }; // idempotente
  }

  const sql = sqlClient();
  try {
    await sql.transaction([
      sql.query(CLOSE_SESSIONS_SQL('user_id = $1::uuid'), [actor.id]),
      sql.query(
        `INSERT INTO public.tessera_work_sessions (work_item_id, user_id) VALUES ($1::uuid, $2::uuid);`,
        [itemId, actor.id],
      ),
      sql.query(
        `WITH moved AS (
           UPDATE public.tessera_work_items
              SET status_id = 'in_progress', start_at = COALESCE(start_at, NOW()),
                  version = version + 1, updated_at = NOW()
            WHERE id = $1::uuid AND organization_id = $2::uuid AND status_id = 'ready'
            RETURNING id, created_at)
         INSERT INTO public.tessera_status_history (work_item_id, from_status, to_status, changed_by, reason, duration_seconds)
         SELECT id, 'ready', 'in_progress', $3::uuid, 'Início de sessão de trabalho',
                EXTRACT(EPOCH FROM (NOW() - COALESCE(
                  (SELECT MAX(h.created_at) FROM public.tessera_status_history h WHERE h.work_item_id = moved.id),
                  moved.created_at)))::int
           FROM moved;`,
        [itemId, orgId, actor.id],
      ),
      sql.query(RECOMPUTE_ACTUAL_SQL),
    ]);
  } catch (err: any) {
    if (err?.code === '23505') throw conflict('Já existe uma sessão aberta para este usuário. Tente novamente.', 'session_race');
    throw err;
  }
  return { session: await getActiveSession(orgId, actor.id), already_running: false };
}

export async function stopSession(orgId: string, actor: Actor) {
  const sql = sqlClient();
  const res = await sql.transaction([
    sql.query(CLOSE_SESSIONS_SQL('user_id = $1::uuid'), [actor.id]),
    sql.query(RECOMPUTE_ACTUAL_SQL),
  ]);
  const closed = (res[0] as TesseraSession[])[0] || null;
  const item = closed ? await fetchItem(orgId, closed.work_item_id) : null;
  return { session: closed, item };
}

/** Fecha sessões abertas de um item (qualquer usuário). Usado quando o item sai de "Em Execução" ou é bloqueado/reatribuído. */
export async function closeOpenSessionsForItem(itemId: string) {
  const sql = sqlClient();
  await sql.transaction([
    sql.query(CLOSE_SESSIONS_SQL('work_item_id = $1::uuid'), [itemId]),
    sql.query(RECOMPUTE_ACTUAL_SQL),
  ]);
}

export async function workedTodayMinutes(userId: string, timezone: string): Promise<number> {
  const rows = await sqlClient().query(
    `SELECT (
       COALESCE((
         SELECT SUM(CASE WHEN ended_at IS NULL
                         THEN ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60)
                         ELSE minutes END)
           FROM public.tessera_work_sessions
          WHERE user_id = $1::uuid
            AND started_at >= (date_trunc('day', NOW() AT TIME ZONE $2) AT TIME ZONE $2)
       ), 0)
       +
       COALESCE((
         SELECT SUM(COALESCE(duration_minutes, ROUND(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60)))
           FROM public.work_sessions
          WHERE user_id = $1::uuid
            AND start_time >= (date_trunc('day', NOW() AT TIME ZONE $2) AT TIME ZONE $2)
            AND id NOT IN (SELECT id FROM public.tessera_work_sessions)
       ), 0)
     )::int AS m;`,
    [userId, timezone],
  );
  return Number((rows[0] as any)?.m || 0);
}

async function loadOwnerItems(orgId: string, ownerId: string): Promise<TesseraWorkItem[]> {
  const rows = await sqlClient().query(
    `${ITEM_SELECT}
      WHERE w.organization_id = $1::uuid AND w.owner_id = $2::uuid AND w.archived_at IS NULL
        AND w.status_id IN ('ready','in_progress','internal_review','client_approval','scheduled');`,
    [orgId, ownerId],
  );
  return rows as TesseraWorkItem[];
}

const PLANNABLE = new Set(['ready', 'in_progress']);

export async function getFocusBoard(orgId: string, userId: string, now = new Date()): Promise<FocusBoardResponse> {
  const settings = await getOrgSettings(orgId);
  const [items, worked, active] = await Promise.all([
    loadOwnerItems(orgId, userId),
    workedTodayMinutes(userId, settings.timezone),
    getActiveSession(orgId, userId),
  ]);

  const plan = planFocus(items.filter(i => PLANNABLE.has(i.status_id)) as (TesseraWorkItem & PlannerItem)[], {
    now, timezone: settings.timezone, workdayMinutes: settings.workdayMinutes,
    workDays: settings.workDays, workedTodayMinutes: worked,
  });

  return {
    date: plan.todayDate,
    capacity_minutes: plan.todayCapacityMinutes,
    planned_minutes: plan.todayPlannedMinutes,
    worked_today_minutes: worked,
    overload_minutes: plan.overloadMinutes,
    today: plan.today,
    upcoming: plan.upcoming,
    blocked: plan.blocked,
    waiting: items.filter(i => !PLANNABLE.has(i.status_id)),
    active_session: active,
  };
}

const END_OF_TODAY_SQL = `((date_trunc('day', NOW() AT TIME ZONE $4::text) + interval '1 day') AT TIME ZONE $4::text)`;

/** Gestor fixa um item no "hoje" do responsável. Exige justificativa e informa o que será deslocado. */
export async function forceToday(orgId: string, itemId: string, reason: string, actor: Actor) {
  if (!actor.isManager) throw forbidden('Apenas gestores podem forçar um item para hoje.');
  const why = (reason || '').trim();
  if (why.length < 5 || why.length > 300) throw badRequest('Informe uma justificativa de 5 a 300 caracteres.');

  const item = await fetchItem(orgId, itemId);
  if (!item.owner_id) throw unprocessable('Atribua um responsável antes de forçar para hoje.', 'no_owner');
  if (item.blocked_at) throw unprocessable('Item bloqueado não pode ser forçado para hoje.', 'blocked');
  if (!PLANNABLE.has(item.status_id)) throw unprocessable('Só itens Prontos ou Em Execução podem ser forçados.', 'invalid_status');

  const settings = await getOrgSettings(orgId);
  const now = new Date();
  const [owned, worked] = await Promise.all([
    loadOwnerItems(orgId, item.owner_id), workedTodayMinutes(item.owner_id, settings.timezone),
  ]);
  const cfg = {
    now, timezone: settings.timezone, workdayMinutes: settings.workdayMinutes,
    workDays: settings.workDays, workedTodayMinutes: worked,
  };
  const plannable = owned.filter(i => PLANNABLE.has(i.status_id)) as (TesseraWorkItem & PlannerItem)[];
  const before = planFocus(plannable, cfg);
  const hypothetical = plannable.map(i => i.id === itemId
    ? { ...i, urgency_override: true, urgency_expires_at: null } : i);
  const after = planFocus(hypothetical, cfg);

  const afterToday = new Set(after.today.map(e => e.item.id));
  const displaced = before.today
    .filter(e => e.item.id !== itemId && !afterToday.has(e.item.id))
    .map(e => ({ id: e.item.id, title: e.item.title }));

  const rows = await sqlClient().query(
    `WITH upd AS (
       UPDATE public.tessera_work_items
          SET urgency_override = TRUE, urgency_reason = $5::text, urgency_set_by = $3::uuid,
              urgency_expires_at = ${END_OF_TODAY_SQL}, version = version + 1, updated_at = NOW()
        WHERE id = $1::uuid AND organization_id = $2::uuid
        RETURNING *),
     aud AS (
       INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
       SELECT organization_id, 'work_item', id, 'force_today', $3::uuid, $6::jsonb FROM upd),
     obx AS (
       INSERT INTO public.tessera_domain_outbox (event_name, payload)
       SELECT 'WorkItemForcedToday', jsonb_build_object('work_item_id', id, 'owner_id', owner_id, 'reason', $5::text) FROM upd)
     SELECT id FROM upd;`,
    [itemId, orgId, actor.id, settings.timezone, why, JSON.stringify({ reason: why, displaced })],
  );
  if (!rows.length) throw conflict('Item mudou durante a operação.');

  return {
    item: await fetchItem(orgId, itemId),
    displaced,
    overload_minutes: after.overloadMinutes,
  };
}

export async function clearForce(orgId: string, itemId: string, actor: Actor) {
  if (!actor.isManager) throw forbidden('Apenas gestores podem remover o destaque de hoje.');
  await fetchItem(orgId, itemId);
  await sqlClient().query(
    `UPDATE public.tessera_work_items
        SET urgency_override = FALSE, urgency_reason = NULL, urgency_set_by = NULL,
            urgency_expires_at = NULL, version = version + 1, updated_at = NOW()
      WHERE id = $1::uuid AND organization_id = $2::uuid;`,
    [itemId, orgId],
  );
  return fetchItem(orgId, itemId);
}
