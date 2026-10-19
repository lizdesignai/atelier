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
  // Tokens --tess-* definidos em globals.css (derivados da paleta Studio Veronna
  // e adaptados aos temas Light | Dark | Veronna).
  switch (status) {
    case 'inbox':
      return { bg: 'bg-[var(--color-atelier-grafite)]/[0.07]', text: 'text-[var(--color-atelier-grafite)]/75', border: 'border-[var(--color-atelier-grafite)]/20', dot: 'bg-[var(--color-atelier-grafite)]/45' };
    case 'ready':
      return { bg: 'bg-[var(--tess-info)]/12', text: 'text-[var(--tess-info)]', border: 'border-[var(--tess-info)]/30', dot: 'bg-[var(--tess-info)]' };
    case 'in_progress':
      return { bg: 'bg-[var(--tess-accent)]/12', text: 'text-[var(--tess-accent-text)]', border: 'border-[var(--tess-accent)]/30', dot: 'bg-[var(--tess-accent)]' };
    case 'internal_review':
      return { bg: 'bg-[var(--tess-review)]/12', text: 'text-[var(--tess-review)]', border: 'border-[var(--tess-review)]/30', dot: 'bg-[var(--tess-review)]' };
    case 'client_approval':
      return { bg: 'bg-[var(--tess-bordo)]/12', text: 'text-[var(--tess-bordo)]', border: 'border-[var(--tess-bordo)]/30', dot: 'bg-[var(--tess-bordo)]' };
    case 'scheduled':
      return { bg: 'bg-[var(--tess-warn)]/12', text: 'text-[var(--tess-warn)]', border: 'border-[var(--tess-warn)]/30', dot: 'bg-[var(--tess-warn)]' };
    case 'done':
      return { bg: 'bg-[var(--tess-success)]/12', text: 'text-[var(--tess-success)]', border: 'border-[var(--tess-success)]/30', dot: 'bg-[var(--tess-success)]' };
    case 'canceled':
      return { bg: 'bg-[var(--tess-danger)]/12', text: 'text-[var(--tess-danger)]', border: 'border-[var(--tess-danger)]/30', dot: 'bg-[var(--tess-danger)]' };
    default:
      return { bg: 'bg-[var(--color-atelier-grafite)]/[0.07]', text: 'text-[var(--color-atelier-grafite)]/75', border: 'border-[var(--color-atelier-grafite)]/20', dot: 'bg-[var(--color-atelier-grafite)]/45' };
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

