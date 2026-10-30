// src/lib/tessera/tesseraReviews.ts
// Inbox de QA: fila priorizada por risco, decisão de revisão auditada e aprovação em lote SEGURA
// (só aprova itens elegíveis; os demais voltam com o motivo, e cada aprovação gera seu próprio registro).
import { badRequest, conflict, forbidden, isUuid, unprocessable } from './errors';
import {
  type Actor, deliverablesOf, fetchItem, ITEM_SELECT, sqlClient,
} from './itemQueries';
import { notifyManagementOnServer, notifyUserOnServer } from '@/lib/serverNotifications';
import type { TesseraWorkItem } from './types';
import type { ReviewEligibility, ReviewInboxItem, ReviewReason } from './workTypes';

export const REVIEW_REASONS: ReviewReason[] = ['info', 'text', 'visual', 'offer', 'other'];
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const DEFAULT_MAX_ROUNDS = 2;

export function evaluateEligibility(item: TesseraWorkItem): ReviewEligibility {
  const reasons: string[] = [];
  if (item.status_id !== 'internal_review') reasons.push('Item não está em Revisão QA.');
  if (item.blocked_at) reasons.push('Item bloqueado.');
  const pending = (item.checklist_total ?? 0) - (item.checklist_completed ?? 0);
  if (pending > 0) reasons.push(`${pending} item(ns) de checklist pendente(s).`);
  if (item.type === 'deliverable' && deliverablesOf(item).length === 0) reasons.push('Entregável sem link/arquivo anexado.');
  return { eligible: reasons.length === 0, reasons };
}

export async function getReviewInbox(orgId: string): Promise<ReviewInboxItem[]> {
  const rows = await sqlClient().query(
    `SELECT x.*,
            (SELECT MAX(h.created_at) FROM public.tessera_status_history h
              WHERE h.work_item_id = x.id AND h.to_status = 'internal_review') AS waiting_since,
            (SELECT COUNT(*)::int FROM public.tessera_reviews r
              WHERE r.work_item_id = x.id AND r.decision = 'request_changes') AS revision_rounds
       FROM (${ITEM_SELECT}
              WHERE w.organization_id = $1::uuid AND w.status_id = 'internal_review' AND w.archived_at IS NULL) x;`,
    [orgId],
  );
  const now = Date.now();
  const list = (rows as any[]).map((r): ReviewInboxItem => {
    const delivs = deliverablesOf(r);
    return {
      ...r,
      waiting_hours: r.waiting_since ? Math.max((now - new Date(r.waiting_since).getTime()) / 3_600_000, 0) : 0,
      deliverable_count: delivs.length,
      deliverables: delivs,
      eligibility: evaluateEligibility(r),
    };
  });
  // Risco: atrasados primeiro, depois prioridade, depois quem espera há mais tempo.
  const overdue = (i: ReviewInboxItem) => {
    const due = i.internal_due_at || i.due_at;
    return due ? new Date(due).getTime() < now : false;
  };
  return list.sort((a, b) =>
    (Number(overdue(b)) - Number(overdue(a))) ||
    ((PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0)) ||
    (b.waiting_hours - a.waiting_hours));
}

async function maxRounds(item: TesseraWorkItem): Promise<number> {
  if (!item.template_source_id) return DEFAULT_MAX_ROUNDS;
  const rows = await sqlClient().query(
    `SELECT rules_definition->>'maxRevisionRounds' AS m FROM public.tessera_workflow_templates WHERE id = $1::uuid LIMIT 1;`,
    [item.template_source_id]);
  const n = Number((rows[0] as any)?.m);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_ROUNDS;
}

export interface DecisionInput { decision: unknown; reason_category?: unknown; comment?: unknown }

export async function decideReview(orgId: string, itemId: string, input: DecisionInput, actor: Actor) {
  if (!actor.isManager) throw forbidden('Apenas gestores registram decisões de revisão.');
  if (input.decision !== 'approved' && input.decision !== 'request_changes') {
    throw badRequest('decision deve ser "approved" ou "request_changes".');
  }
  const item = await fetchItem(orgId, itemId);
  if (item.status_id !== 'internal_review') {
    throw unprocessable('O item não está mais em Revisão QA (outra pessoa pode já ter decidido).', 'not_in_review');
  }

  let category: string | null = null;
  let comment: string | null = typeof input.comment === 'string' ? input.comment.trim().slice(0, 2000) || null : null;
  let next: string;

  if (input.decision === 'approved') {
    const el = evaluateEligibility(item);
    if (!el.eligible) throw unprocessable('Item não elegível para aprovação.', 'not_eligible', el.reasons);
    next = item.client_visible ? 'client_approval' : 'done';
  } else {
    if (!REVIEW_REASONS.includes(input.reason_category as ReviewReason)) {
      throw badRequest('Informe o motivo do ajuste (info, text, visual, offer ou other).');
    }
    if (!comment || comment.length < 3) throw badRequest('Descreva o ajuste solicitado.');
    category = input.reason_category as string;
    next = 'in_progress';
  }

  const rows = await sqlClient().query(
    `WITH upd AS (
       UPDATE public.tessera_work_items
          SET status_id = $4::text,
              completed_at = CASE WHEN $4::text = 'done' THEN NOW() ELSE NULL END,
              reviewer_id = COALESCE(reviewer_id, $5::uuid),
              version = version + 1, updated_at = NOW()
        WHERE id = $1::uuid AND organization_id = $2::uuid AND status_id = $3::text
        RETURNING *),
     rev AS (
       INSERT INTO public.tessera_reviews (work_item_id, reviewer_id, round_number, decision, reason_category, feedback_comment)
       SELECT id, $5::uuid,
              (SELECT COUNT(*)::int FROM public.tessera_reviews r WHERE r.work_item_id = upd.id AND r.decision = 'request_changes') + 1,
              $6::text, $7::text, $8::text
         FROM upd),
     hist AS (
       INSERT INTO public.tessera_status_history (work_item_id, from_status, to_status, changed_by, reason, duration_seconds)
       SELECT id, $3::text, $4::text, $5::uuid, $8::text,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(
                (SELECT MAX(h.created_at) FROM public.tessera_status_history h WHERE h.work_item_id = upd.id), upd.created_at)))::int
         FROM upd),
     aud AS (
       INSERT INTO public.tessera_audit_events (organization_id, entity_type, entity_id, action, actor_id, changes)
       SELECT organization_id, 'work_item', id, 'review_decision', $5::uuid,
              jsonb_build_object('decision', $6::text, 'reason_category', $7::text, 'to', $4::text) FROM upd),
     obx AS (
       INSERT INTO public.tessera_domain_outbox (event_name, payload)
       SELECT CASE WHEN $6::text = 'approved' THEN 'ReviewApproved' ELSE 'ReviewChangesRequested' END,
              jsonb_build_object('work_item_id', id, 'owner_id', owner_id, 'to', $4::text) FROM upd)
     SELECT id FROM upd;`,
    [itemId, orgId, 'internal_review', next, actor.id, input.decision, category, comment],
  );
  if (!rows.length) throw conflict('O item foi alterado durante a decisão. Recarregue a fila.', 'status_conflict');

  const updated = await fetchItem(orgId, itemId);
  let exceeded = false;
  if (input.decision === 'request_changes') {
    const n = (await sqlClient().query(
      `SELECT COUNT(*)::int AS n FROM public.tessera_reviews WHERE work_item_id = $1::uuid AND decision = 'request_changes';`,
      [itemId]))[0] as any;
    exceeded = Number(n.n) > (await maxRounds(item));
  }

  try {
    const projectName = updated.project_title || updated.client_name || 'Studio Veronna';
    const collabName = updated.owner_name || 'Colaborador';
    const reasonLabels: Record<string, string> = {
      info: 'Informação / Escopo',
      text: 'Texto / Copy',
      visual: 'Direção Visual / Design',
      offer: 'Oferta / Estratégia',
      other: 'Geral',
    };

    if (input.decision === 'approved') {
      if (updated.owner_id) {
        await notifyUserOnServer({
          userId: updated.owner_id,
          title: `✅ Entrega Aprovada no QA: ${updated.title}`,
          message: `Parabéns! Sua entrega "${updated.title}" (${projectName}) foi aprovada pela liderança.`,
          type: 'success',
          actionUrl: '/tessera/focus',
          emailTemplateType: 'review_approved',
          extraData: {
            taskName: updated.title,
            projectName,
            collaboratorName: collabName,
            extraInfo: comment || undefined,
            link: '/tessera/focus',
          },
        });
      }
    } else if (input.decision === 'request_changes') {
      const catLabel = category ? reasonLabels[category] || category : 'Ajuste';
      if (updated.owner_id) {
        await notifyUserOnServer({
          userId: updated.owner_id,
          title: `🛠️ Ajustes Solicitados (${catLabel}): ${updated.title}`,
          message: `A liderança solicitou ajustes na entrega "${updated.title}" (${projectName}).`,
          type: 'action',
          actionUrl: '/tessera/focus',
          emailTemplateType: 'review_changes_requested',
          extraData: {
            taskName: updated.title,
            projectName,
            collaboratorName: collabName,
            extraInfo: `[${catLabel}] ${comment || ''}`,
            link: '/tessera/focus',
          },
        });
      }
      if (exceeded) {
        await notifyManagementOnServer({
          title: `⚠️ Limite de Revisões Excedido: ${updated.title}`,
          message: `O item "${updated.title}" (${projectName}) ultrapassou o limite padrão de rodadas de revisão QA.`,
          type: 'warning',
          actionUrl: '/tessera/reviews',
          emailTemplateType: 'fever_chart_alert',
          extraData: {
            taskName: updated.title,
            projectName,
            extraInfo: `Excedeu o limite de rodadas de revisão QA. Responsável: ${collabName}.`,
            link: '/tessera/reviews',
          },
        });
      }
    }
  } catch (notifyErr) {
    console.warn('[Tessera:decideReview] Falha ao notificar:', notifyErr);
  }

  return { item: updated, next_status: next, exceeded_revision_limit: exceeded };
}

export interface BulkResult {
  approved: { id: string; title: string; next_status: string }[];
  skipped: { id: string; title: string | null; reasons: string[] }[];
}

export async function bulkApprove(orgId: string, ids: unknown, actor: Actor): Promise<BulkResult> {
  if (!actor.isManager) throw forbidden('Apenas gestores aprovam em lote.');
  if (!Array.isArray(ids) || !ids.length) throw badRequest('Informe ao menos um item.');
  const unique = [...new Set(ids)];
  if (unique.length > 50) throw badRequest('Máximo de 50 itens por lote.');
  if (!unique.every(isUuid)) throw badRequest('Há IDs inválidos na lista.');

  const result: BulkResult = { approved: [], skipped: [] };
  for (const id of unique as string[]) {
    let item: TesseraWorkItem;
    try {
      item = await fetchItem(orgId, id);
    } catch {
      result.skipped.push({ id, title: null, reasons: ['Item não encontrado.'] });
      continue;
    }
    const el = evaluateEligibility(item);
    if (!el.eligible) { result.skipped.push({ id, title: item.title, reasons: el.reasons }); continue; }
    try {
      const r = await decideReview(orgId, id, { decision: 'approved' }, actor);
      result.approved.push({ id, title: item.title, next_status: r.next_status });
    } catch (e: any) {
      result.skipped.push({ id, title: item.title, reasons: [e?.message || 'Falha ao aprovar.'] });
    }
  }
  return result;
}
