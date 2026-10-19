// src/lib/tessera/stateMachine.ts
import { WorkItemStatus } from './types';

export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
  requiredAction?: 'require_checklist' | 'require_reviewer' | 'require_attachment' | 'require_justification';
}

const ALLOWED_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  inbox: ['ready', 'canceled'],
  ready: ['in_progress', 'inbox', 'canceled'],
  in_progress: ['internal_review', 'ready', 'done', 'canceled'],
  internal_review: ['in_progress', 'client_approval', 'scheduled', 'done', 'canceled'],
  client_approval: ['in_progress', 'scheduled', 'done', 'canceled'],
  scheduled: ['done', 'in_progress', 'canceled'],
  done: ['in_progress', 'internal_review'], // Reabertura controlada
  canceled: ['inbox', 'ready'] // Reativação
};

export function validateTransition(
  currentStatus: WorkItemStatus,
  targetStatus: WorkItemStatus,
  context: {
    hasChecklistPending?: boolean;
    hasDeliverable?: boolean;
    hasOwner?: boolean;
    isClientProduct?: boolean;
  } = {}
): TransitionValidation {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const validTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Transição inválida de '${currentStatus}' para '${targetStatus}'.`
    };
  }

  // Regra: Transição para Ready exige responsável atribuído
  if (targetStatus === 'ready' && !context.hasOwner) {
    return {
      allowed: false,
      reason: 'Para mover para Pronto (Ready), é obrigatório atribuir um responsável.',
      requiredAction: 'require_reviewer'
    };
  }

  // Regra: Transição para Internal Review exige entregável/anexo presente se for entrega criativa
  if (targetStatus === 'internal_review' && context.hasDeliverable === false) {
    return {
      allowed: false,
      reason: 'Para enviar para Revisão Interna, é necessário anexar a prévia ou link da entrega.',
      requiredAction: 'require_attachment'
    };
  }

  // Regra: Transição para Done exige checklists concluídos
  if (targetStatus === 'done' && context.hasChecklistPending) {
    return {
      allowed: false,
      reason: 'Existem itens obrigatórios de checklist não concluídos.',
      requiredAction: 'require_checklist'
    };
  }

  return { allowed: true };
}

export function getStatusLabel(status: WorkItemStatus): string {
  switch (status) {
    case 'inbox': return 'Inbox';
    case 'ready': return 'Pronto';
    case 'in_progress': return 'Em Execução';
    case 'internal_review': return 'Em Revisão QA';
    case 'client_approval': return 'Aguardando Cliente';
    case 'scheduled': return 'Agendado';
    case 'done': return 'Concluído';
    case 'canceled': return 'Cancelado';
    default: return status;
  }
}

export function getStatusTone(status: WorkItemStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'inbox':
      return { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300', dot: 'bg-stone-400' };
    case 'ready':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'in_progress':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'internal_review':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
    case 'client_approval':
      return { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' };
    case 'scheduled':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    case 'done':
      return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'canceled':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-400' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', dot: 'bg-gray-400' };
  }
}

export const CANONICAL_STATUSES: Record<
  WorkItemStatus,
  { label: string; allowedNext: WorkItemStatus[] }
> = {
  inbox: { label: getStatusLabel('inbox'), allowedNext: ALLOWED_TRANSITIONS.inbox },
  ready: { label: getStatusLabel('ready'), allowedNext: ALLOWED_TRANSITIONS.ready },
  in_progress: { label: getStatusLabel('in_progress'), allowedNext: ALLOWED_TRANSITIONS.in_progress },
  internal_review: { label: getStatusLabel('internal_review'), allowedNext: ALLOWED_TRANSITIONS.internal_review },
  client_approval: { label: getStatusLabel('client_approval'), allowedNext: ALLOWED_TRANSITIONS.client_approval },
  scheduled: { label: getStatusLabel('scheduled'), allowedNext: ALLOWED_TRANSITIONS.scheduled },
  done: { label: getStatusLabel('done'), allowedNext: ALLOWED_TRANSITIONS.done },
  canceled: { label: getStatusLabel('canceled'), allowedNext: ALLOWED_TRANSITIONS.canceled },
};

