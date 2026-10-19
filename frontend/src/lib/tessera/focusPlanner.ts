// src/lib/tessera/focusPlanner.ts
// Planejador do "Meu Focus": distribui o trabalho em dias úteis conforme a
// CAPACIDADE REAL em minutos (substitui a regra fixa de "5 tarefas/dia" do Atelier v2).
// Função pura: sem acesso a banco, sem relógio global (recebe `now`). Fácil de testar.

import type { WorkItemPriority, WorkItemStatus } from './types';

export interface PlannerItem {
  id: string;
  title: string;
  status_id: WorkItemStatus;
  priority: WorkItemPriority;
  due_at?: string | null;
  internal_due_at?: string | null;
  estimate_minutes: number;
  actual_minutes: number;
  remaining_estimate_minutes?: number | null;
  blocked_at?: string | null;
  urgency_override?: boolean;
  urgency_reason?: string | null;
  urgency_expires_at?: string | null;
}

export interface PlannerConfig {
  now: Date;
  timezone: string;
  /** Minutos úteis por dia (ex.: 360 = 6h). */
  workdayMinutes: number;
  /** 0 = domingo ... 6 = sábado. Padrão: [1,2,3,4,5]. */
  workDays: number[];
  /** Minutos já trabalhados hoje (inclui sessão aberta). Reduz a capacidade de hoje. */
  workedTodayMinutes: number;
}

export interface PlanEntry<T extends PlannerItem = PlannerItem> {
  item: T;
  remainingMinutes: number;
  score: number;
  forced: boolean;
  plannedDate: string; // YYYY-MM-DD no fuso da organização
  /** true quando o item sozinho excede a capacidade de um dia. */
  spansDays: boolean;
}

export interface PlanResult<T extends PlannerItem = PlannerItem> {
  today: PlanEntry<T>[];
  upcoming: PlanEntry<T>[];
  blocked: T[];
  todayDate: string;
  todayCapacityMinutes: number;
  todayPlannedMinutes: number;
  /** Minutos de trabalho forçado/planejado acima da capacidade de hoje. */
  overloadMinutes: number;
}

const PRIORITY_WEIGHT: Record<WorkItemPriority, number> = { urgent: 8, high: 5, medium: 3, low: 1 };
const MIN_REMAINING = 15;

export function remainingMinutes(item: PlannerItem): number {
  if (typeof item.remaining_estimate_minutes === 'number' && item.remaining_estimate_minutes >= 0) {
    return Math.max(item.remaining_estimate_minutes, 0) || MIN_REMAINING;
  }
  return Math.max((item.estimate_minutes || 60) - (item.actual_minutes || 0), MIN_REMAINING);
}

export function isForced(item: PlannerItem, now: Date): boolean {
  if (!item.urgency_override) return false;
  if (!item.urgency_expires_at) return true;
  return new Date(item.urgency_expires_at).getTime() > now.getTime();
}

export function ymdInTz(date: Date, timezone: string): string {
  // 'en-CA' formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function weekdayInTz(date: Date, timezone: string): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
}

/** Dias corridos até o prazo (negativo = atrasado), em relação ao dia local de `now`. */
function daysUntil(dueIso: string, now: Date, timezone: string): number {
  const toDay = (d: Date) => Date.parse(ymdInTz(d, timezone) + 'T00:00:00Z');
  return Math.round((toDay(new Date(dueIso)) - toDay(now)) / 86_400_000);
}

function dueUrgency(item: PlannerItem, now: Date, tz: string): number {
  const due = item.internal_due_at || item.due_at;
  if (!due) return 1;
  const d = daysUntil(due, now, tz);
  if (d < 0) return 10;
  if (d <= 1) return 8;
  if (d <= 2) return 5;
  if (d <= 5) return 3;
  return 1;
}

/**
 * Score (maior = mais cedo): (peso da prioridade + urgência do prazo [+ bônus de continuidade])
 * dividido pelo esforço restante em horas (+0,5 para suavizar). Tarefas curtas e urgentes sobem;
 * a urgência de prazo impede que tarefas longas fiquem eternamente para depois.
 */
export function scoreItem(item: PlannerItem, now: Date, tz: string): number {
  const continuity = item.status_id === 'in_progress' ? 2 : 0; // reduz troca de contexto
  const value = PRIORITY_WEIGHT[item.priority] + dueUrgency(item, now, tz) + continuity;
  return value / (remainingMinutes(item) / 60 + 0.5);
}

export function planFocus<T extends PlannerItem>(items: T[], cfg: PlannerConfig): PlanResult<T> {
  const { now, timezone } = cfg;
  // Configuração inválida nunca pode travar o planejamento (laço de dias úteis).
  const workdayMinutes = cfg.workdayMinutes > 0 ? cfg.workdayMinutes : 360;
  const workDays = cfg.workDays && cfg.workDays.length > 0 ? cfg.workDays : [1, 2, 3, 4, 5];
  const workable = items.filter(i => !['done', 'canceled', 'inbox'].includes(i.status_id));
  const blocked = workable.filter(i => i.blocked_at);
  const active = workable.filter(i => !i.blocked_at);

  // Ordem: 1) forçados pelo gestor; 2) faixa "urgente ou atrasado"; 3) score dentro de cada faixa.
  // A faixa existe para que o esforço (denominador do score) nunca empurre uma entrega
  // urgente/atrasada para trás de tarefas curtas e menos importantes.
  const isHot = (i: PlannerItem) => {
    const due = i.internal_due_at || i.due_at;
    return i.priority === 'urgent' || (!!due && daysUntil(due, now, timezone) < 0);
  };
  const entries = active.map(item => ({
    item,
    remaining: remainingMinutes(item),
    score: scoreItem(item, now, timezone),
    forced: isForced(item, now),
    hot: isHot(item),
  }));
  entries.sort((a, b) =>
    (Number(b.forced) - Number(a.forced)) ||
    (Number(b.hot) - Number(a.hot)) ||
    (b.score - a.score));

  // Calendário de dias úteis a partir de hoje
  const dayCache: { date: string; capacity: number }[] = [];
  const dayAt = (idx: number) => {
    while (dayCache.length <= idx) {
      const n = dayCache.length;
      // avança n dias corridos a partir de hoje; dias não úteis têm capacidade 0
      const d = new Date(now.getTime() + n * 86_400_000);
      const isWork = workDays.includes(weekdayInTz(d, timezone));
      let capacity = isWork ? workdayMinutes : 0;
      if (n === 0) capacity = isWork ? Math.max(workdayMinutes - cfg.workedTodayMinutes, 0) : 0;
      dayCache.push({ date: ymdInTz(d, timezone), capacity });
    }
    return dayCache[idx];
  };

  const today: PlanEntry<T>[] = [];
  const upcoming: PlanEntry<T>[] = [];
  const todayDate = dayAt(0).date;
  const todayCapacity = dayAt(0).capacity;

  const make = (e: typeof entries[number], date: string): PlanEntry<T> => ({
    item: e.item, remainingMinutes: e.remaining, score: e.score, forced: e.forced,
    plannedDate: date, spansDays: e.remaining > workdayMinutes,
  });

  // 1) Itens forçados pelo gestor: sempre hoje, mesmo que estourem a capacidade.
  const forced = entries.filter(e => e.forced);
  const regular = entries.filter(e => !e.forced);
  let forcedMinutes = 0;
  for (const e of forced) {
    today.push(make(e, todayDate));
    forcedMinutes += e.remaining;
  }
  const overloadMinutes = Math.max(forcedMinutes - todayCapacity, 0);

  // 2) Demais itens, por score, preenchendo a capacidade dia a dia.
  //    Estado: dayIdx = dia corrente; capLeft = capacidade que sobra nele;
  //    dayUsed = se já há algo alocado nesse dia.
  let dayIdx = 0;
  let capLeft = Math.max(todayCapacity - forcedMinutes, 0);
  let dayUsed = forced.length > 0;
  const advance = () => { dayIdx++; capLeft = dayAt(dayIdx).capacity; dayUsed = false; };

  for (const e of regular) {
    // Encontra o dia em que o item COMEÇA.
    for (;;) {
      if (capLeft <= 0) { advance(); continue; }
      if (e.remaining <= capLeft) break;   // cabe inteiro neste dia
      if (!dayUsed) break;                 // dia ainda vazio: começa aqui e transborda
      advance();                           // não cabe e o dia já tem trabalho: próximo dia
    }
    const startIdx = dayIdx;
    const startDate = dayAt(startIdx).date;

    if (e.remaining <= capLeft) {
      capLeft -= e.remaining;
      dayUsed = true;
    } else {
      // Item maior que a capacidade do dia: consome o resto deste dia e os seguintes.
      let toBurn = e.remaining - capLeft;
      capLeft = 0;
      dayUsed = true;
      while (toBurn > 0) {
        advance();
        const burn = Math.min(capLeft, toBurn);
        toBurn -= burn;
        capLeft -= burn;
        dayUsed = burn > 0;
      }
    }
    (startIdx === 0 ? today : upcoming).push(make(e, startDate));
  }

  return {
    today, upcoming, blocked,
    todayDate,
    todayCapacityMinutes: todayCapacity,
    todayPlannedMinutes: today.reduce((s, e) => s + e.remainingMinutes, 0),
    overloadMinutes,
  };
}
