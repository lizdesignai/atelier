// src/lib/tessera/types.ts
// Tipos canônicos de domínio do Tessera v1.0

export type WorkItemType = 'task' | 'deliverable' | 'gate' | 'initiative' | 'subtask';

export type WorkItemStatus = 
  | 'inbox' 
  | 'ready' 
  | 'in_progress' 
  | 'internal_review' 
  | 'client_approval' 
  | 'scheduled' 
  | 'done' 
  | 'canceled';

export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TesseraOrganization {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  settings: {
    workday_hours: number;
    work_days: number[];
    brand_name: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface TesseraMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'gestor' | 'colaborador' | 'revisor' | 'parceiro' | 'cliente';
  weekly_capacity_hours: number;
  skills: string[];
  settings: Record<string, any>;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface TesseraStageDef {
  id: string;
  label: string;
  order?: number;
  hint?: string;
  externalMovement?: string;
}

export interface TesseraGateDef {
  id: string;
  stage: string;
  title: string;
  required: boolean;
  approver: 'client' | 'gestor' | 'owner';
  slaHours?: number;
  slaBusinessDays?: number;
}

export interface TesseraTaskDef {
  title: string;
  type: string;
  stage: string;
  dayOffset?: number;
  estimateMinutes: number;
  isGate?: boolean;
}

export interface TesseraWorkflowTemplate {
  id: string;
  organization_id: string;
  slug: string;
  version: string;
  name: string;
  service_type: 'idv' | 'instagram' | 'mapa' | 'internal' | 'custom';
  description: string;
  stages_definition: TesseraStageDef[];
  gates_definition: TesseraGateDef[];
  tasks_definition: TesseraTaskDef[];
  rules_definition: Record<string, any>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TesseraWorkItem {
  id: string;
  organization_id: string;
  project_id?: string | null;
  parent_id?: string | null;
  type: WorkItemType;
  title: string;
  description?: string | null;
  status_id: WorkItemStatus;
  priority: WorkItemPriority;
  owner_id?: string | null;
  reviewer_id?: string | null;
  created_by?: string | null;
  start_at?: string | null;
  due_at?: string | null;
  internal_due_at?: string | null;
  completed_at?: string | null;
  estimate_minutes: number;
  actual_minutes: number;
  remaining_estimate_minutes?: number | null;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  blocker_owner_id?: string | null;
  next_review_at?: string | null;
  urgency_override: boolean;
  urgency_reason?: string | null;
  urgency_set_by?: string | null;
  urgency_expires_at?: string | null;
  acceptance_criteria?: string | null;
  client_visible: boolean;
  template_source_id?: string | null;
  stage_id?: string | null;
  metadata: Record<string, any>;
  version: number;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;

  // Campos agregados para visualização
  owner_name?: string | null;
  owner_avatar?: string | null;
  project_title?: string | null;
  client_name?: string | null;
  checklist_total?: number;
  checklist_completed?: number;
}

export interface TesseraChecklistItem {
  id: string;
  work_item_id: string;
  title: string;
  is_completed: boolean;
  completed_by?: string | null;
  completed_at?: string | null;
  order_index: number;
  created_at: string;
}

export interface TesseraReview {
  id: string;
  work_item_id: string;
  reviewer_id?: string | null;
  round_number: number;
  decision: 'approved' | 'request_changes' | 'escalated';
  reason_category?: 'info' | 'text' | 'visual' | 'offer' | 'other' | null;
  feedback_comment?: string | null;
  attachments: any[];
  created_at: string;
}

export interface TesseraAuditEvent {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string | null;
  changes: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}

export interface CommandCenterSummary {
  organization: TesseraOrganization;
  stats: {
    active_projects: number;
    work_items_in_progress: number;
    work_items_at_risk: number;
    work_items_blocked: number;
    pending_internal_reviews: number;
    pending_client_approvals: number;
    today_completed: number;
  };
  critical_alerts: Array<{
    id: string;
    type: 'deadline_risk' | 'blocked' | 'unassigned' | 'sla_breach' | 'capacity_overload';
    title: string;
    why_it_matters: string;
    responsible_name: string;
    responsible_avatar?: string;
    consequence: string;
    action_type: 'reassign' | 'unblock' | 'remind_client' | 'qa_review' | 'force_today';
    target_id: string;
    due_date?: string;
  }>;
  projects_at_risk: Array<{
    id: string;
    title: string;
    client_name: string;
    service_type: string;
    stage_label: string;
    health: 'green' | 'yellow' | 'red';
    risk_cause: string;
    baseline_due_date?: string;
    forecast_due_date?: string;
  }>;
}
