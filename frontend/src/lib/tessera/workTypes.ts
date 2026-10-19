// src/lib/tessera/workTypes.ts
// Tipos das Ondas 2/3 (detalhe de item, sessões, Focus, Inbox de revisão).
import type { TesseraWorkItem, TesseraChecklistItem } from './types';
import type { PlanEntry } from './focusPlanner';

export interface Deliverable { label: string; url: string }

export interface TesseraComment {
  id: string;
  work_item_id: string;
  author_id: string | null;
  author_name?: string | null;
  body: string;
  created_at: string;
}

export interface TesseraHistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_name?: string | null;
  reason: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface TesseraReviewRow {
  id: string;
  round_number: number;
  decision: string;
  reason_category: string | null;
  feedback_comment: string | null;
  reviewer_name?: string | null;
  created_at: string;
}

export interface TesseraSession {
  id: string;
  work_item_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  capped: boolean;
  /** Segundos decorridos segundo o relógio do SERVIDOR (só para sessão aberta). */
  elapsed_seconds?: number;
  item_title?: string;
}

export interface WorkItemDetail {
  item: TesseraWorkItem;
  checklist: TesseraChecklistItem[];
  comments: TesseraComment[];
  history: TesseraHistoryRow[];
  reviews: TesseraReviewRow[];
  sessions: { total_minutes: number; open: TesseraSession | null };
  /** O que o usuário atual pode fazer (a UI só esconde botões; o servidor revalida tudo). */
  permissions: { canEdit: boolean; canEditAll: boolean; canTransition: boolean; canReview: boolean };
}

export interface BoardResponse {
  items: TesseraWorkItem[];
  wip_limits: Record<string, number>;
}

export interface FocusBoardResponse {
  date: string;
  capacity_minutes: number;
  planned_minutes: number;
  worked_today_minutes: number;
  overload_minutes: number;
  today: PlanEntry<TesseraWorkItem>[];
  upcoming: PlanEntry<TesseraWorkItem>[];
  blocked: TesseraWorkItem[];
  waiting: TesseraWorkItem[]; // em revisão / aguardando cliente (fora do controle do dono)
  active_session: TesseraSession | null;
}

export interface ReviewEligibility { eligible: boolean; reasons: string[] }

export interface ReviewInboxItem extends TesseraWorkItem {
  waiting_since: string | null;
  waiting_hours: number;
  revision_rounds: number;
  deliverable_count: number;
  deliverables: Deliverable[];
  eligibility: ReviewEligibility;
}

export type ReviewReason = 'info' | 'text' | 'visual' | 'offer' | 'other';
