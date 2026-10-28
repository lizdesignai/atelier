// src/lib/dbQueryPolicy.ts
// Política central de segurança e autorização para /api/db/query (Fase 0).
// Garante isolamento por role × tabela × operação e sanitização de colunas sensíveis.

export type DbOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

export interface FilterDef {
  type: string;
  column: string;
  value: any;
}

export interface DbQueryPolicyInput {
  role: string;
  userId: string;
  table: string;
  operation: string;
  columns?: string;
  data?: Record<string, any> | Array<Record<string, any>> | null;
  filters?: FilterDef[];
}

export interface DbQueryAuthResult {
  allowed: boolean;
  status: number;
  reason?: string;
}

export const STAFF_ROLES = new Set(['admin', 'gestor', 'colaborador', 'contador']);
export const FINANCE_ROLES = new Set(['admin', 'gestor', 'contador']);
export const MANAGEMENT_ROLES = new Set(['admin', 'gestor']);

// Whitelist completa de tabelas permitidas no proxy /api/db/query
export const ALLOWED_TABLES = new Set([
  // Core & Auth/Profiles
  'profiles', 'projects', 'tasks', 'notifications', 'agencies',
  'agency_subclients', 'project_assets', 'project_quick_links', 'content_planning',
  'briefings', 'attendance_logs', 'social_posts', 'asset_missions',
  'team_performance', 't_nps_scores', 'work_sessions', 'collaborator_assignments', 'routing_rules',
  // Financeiro (Legado + Fase 0/2)
  'financial_outflows', 'financial_closings', 'financial_records',
  // Comunicação & Canais
  'messages', 'channels', 'channel_messages', 'message_reactions', 'channel_reads',
  'mensagens_chat', 'topicos_chat',
  // Branding, IDV & Conteúdo
  'cofre_items', 'brand_identities', 'curadoria_items', 'reference_boards', 'reference_items',
  'brand_assets', 'brand_guidelines', 'brand_snapshots', 'brandbook_laboratory',
  'brand_experience_review', 'territory_evaluations', 'activation_checklists', 'activation_checklist',
  'client_briefings', 'strategic_answers', 'design_directions', 'content_feedback_pins',
  'diary_posts', 'studio_diary', 'feed_bastidores', 'inspiracoes_cliente', 'referencias', 'comentarios_referencia',
  // Instagram & Presença
  'instagram_reports', 'instagram_profiles', 'instagram_feed_posts', 'instagram_snapshots',
  'ig_cycles', 'ig_approval_events', 'instagram_briefings', 'monthly_plannings', 'monthly_reports',
  // Comercial, Leads & Formulários
  'demand_leads', 'prospect_meetings', 'leads', 'applications',
  'consultorias_posicionamento', 'briefings_identidade_visual',
  'orcamentos_gerenciamento_instagram', 'orcamentos_identidade_visual',
  'pesquisa_satisfacao_idv', 'pesquisa_satisfacao_instagram', 'formularios_rascunhos',
  'onboarding_steps', 'onboarding_respostas',
  // Mapa
  'mapas', 'mapa_evidencias', 'raiox_instagram', 'track_record',
  // Comunidade Vêneto
  'community_groups', 'community_posts', 'post_comments', 'post_likes', 'b2b_pitches',
  'veneto_saved_posts', 'veneto_connections', 'veneto_recognitions',
  'veneto_events', 'veneto_event_rsvps', 'veneto_event_messages',
  'veneto_studio_contents', 'veneto_direct_messages', 'veneto_reports', 'veneto_user_blocks',
  // Tessera & Sistema
  'tessera_organizations', 'tessera_memberships', 'tessera_workflow_templates',
  'tessera_work_items', 'tessera_task_dependencies', 'tessera_checklist_items',
  'tessera_reviews', 'tessera_status_history', 'tessera_audit_events', 'tessera_domain_outbox',
  'tessera_work_sessions', 'tessera_comments',
  'storage_objects', 'user_preferences', 'activity_log', 'admin_daily_notes',
  'client_behavior_logs', 'copilot_interactions', 'missions', 'user_missions',
  'schema_migrations',
]);

// Tabelas estritamente financeiras: apenas admin, gestor e contador
export const FINANCE_ONLY_TABLES = new Set([
  'financial_outflows',
  'financial_closings',
  'financial_records',
]);

// Tabelas internas da operação/equipe: bloqueadas para clientes
export const STAFF_ONLY_TABLES = new Set([
  'agencies',
  'collaborator_assignments',
  'routing_rules',
  'work_sessions',
  'team_performance',
  'prospect_meetings',
  'leads',
  'demand_leads',
  'admin_daily_notes',
  'consultorias_posicionamento',
  'orcamentos_gerenciamento_instagram',
  'orcamentos_identidade_visual',
  'pesquisa_satisfacao_idv',
  'pesquisa_satisfacao_instagram',
  'schema_migrations',
]);

// Colunas de profiles que NUNCA podem sair nem entrar via /api/db/query
export const NEVER_EXPOSE_PROFILE_COLUMNS = new Set([
  'password_hash',
  'mfa_secret',
  'password_reset_token',
  'password_reset_expires',
]);

// Colunas de autenticação em profiles que nunca podem ser escritas via /api/db/query
export const NEVER_WRITE_PROFILE_AUTH_COLUMNS = new Set([
  'password_hash',
  'mfa_secret',
  'mfa_enabled',
  'mfa_verified',
  'password_reset_token',
  'password_reset_expires',
]);

// Colunas privilegiadas de profiles que só admin ou gestor podem alterar
export const MANAGEMENT_ONLY_PROFILE_WRITE_COLUMNS = new Set([
  'role',
  'base_salary',
  'contract_status',
]);

// Colunas privadas de profiles que um cliente não pode ver de terceiros
export const PRIVATE_PROFILE_PII_COLUMNS = new Set([
  'nif',
  'endereco',
  'telefone',
  'aniversario',
  'anniversary_date',
  'contract_status',
  'mfa_enabled',
  'mfa_verified',
  'base_salary',
]);

// Colunas financeiras/contratuais de projects que só roles financeiras podem alterar
export const PROJECT_FINANCIAL_WRITE_COLUMNS = new Set([
  'financial_value',
  'billing_date',
  'payment_split',
  'payment_recurrence',
  'payment_method',
  'contract_url',
  'contract_start',
  'contract_end',
  'client_id',
]);

export function isFinanceTable(table: string): boolean {
  return FINANCE_ONLY_TABLES.has(table) || table.startsWith('fin_');
}

export function isStaffOnlyTable(table: string): boolean {
  return STAFF_ONLY_TABLES.has(table) || table.startsWith('tessera_');
}

function extractPayloadKeys(
  data: Record<string, any> | Array<Record<string, any>> | null | undefined
): string[] {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : [data];
  const keys = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === 'object') {
      for (const k of Object.keys(row)) keys.add(k);
    }
  }
  return [...keys];
}

export function authorizeDbQuery(input: DbQueryPolicyInput): DbQueryAuthResult {
  const { role, userId, table, operation, data, filters = [] } = input;

  if (!role || !userId) {
    return { allowed: false, status: 401, reason: 'Sessão inválida.' };
  }

  const isAllowedTable = ALLOWED_TABLES.has(table) || table.startsWith('fin_');
  if (!isAllowedTable) {
    return { allowed: false, status: 403, reason: `Tabela não permitida: ${table}` };
  }

  // 1. Tabelas financeiras: exclusivas para admin, gestor, contador
  if (isFinanceTable(table) && !FINANCE_ROLES.has(role)) {
    return {
      allowed: false,
      status: 403,
      reason: 'Acesso negado: tabela exclusiva do módulo financeiro.',
    };
  }

  // 2. Tabelas internas da equipe: bloqueadas para clientes
  if (isStaffOnlyTable(table) && !STAFF_ROLES.has(role)) {
    return {
      allowed: false,
      status: 403,
      reason: 'Acesso negado: tabela restrita à equipe interna.',
    };
  }

  // 3. schema_migrations é somente leitura via /api/db/query
  if (table === 'schema_migrations' && operation !== 'select') {
    return {
      allowed: false,
      status: 403,
      reason: 'A tabela schema_migrations só pode ser alterada pelo runner de migrações.',
    };
  }

  const isWrite = operation === 'insert' || operation === 'update' || operation === 'upsert' || operation === 'delete';

  // 4. Regras específicas para `profiles`
  if (table === 'profiles' && isWrite) {
    if (operation === 'delete' && role !== 'admin') {
      return { allowed: false, status: 403, reason: 'Apenas administradores podem remover perfis.' };
    }

    if (operation === 'insert' && !MANAGEMENT_ROLES.has(role)) {
      return { allowed: false, status: 403, reason: 'Apenas gestores ou administradores podem inserir perfis.' };
    }

    const keys = extractPayloadKeys(data);
    for (const key of keys) {
      if (NEVER_WRITE_PROFILE_AUTH_COLUMNS.has(key)) {
        return {
          allowed: false,
          status: 403,
          reason: `Coluna de segurança protegida não pode ser alterada por esta rota: ${key}`,
        };
      }
      if (MANAGEMENT_ONLY_PROFILE_WRITE_COLUMNS.has(key) && !MANAGEMENT_ROLES.has(role)) {
        return {
          allowed: false,
          status: 403,
          reason: `Apenas gestores ou administradores podem alterar a coluna: ${key}`,
        };
      }
    }

    // Usuários que não são admin/gestor só podem editar o próprio perfil
    if (!MANAGEMENT_ROLES.has(role) && (operation === 'update' || operation === 'upsert')) {
      if (operation === 'update') {
        const idFilter = filters.find((f) => f.type === 'eq' && f.column === 'id');
        if (!idFilter || String(idFilter.value) !== String(userId)) {
          return {
            allowed: false,
            status: 403,
            reason: 'Você só pode atualizar o seu próprio perfil.',
          };
        }
      } else if (operation === 'upsert') {
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        const allSelf = rows.length > 0 && rows.every((r) => String(r?.id) === String(userId));
        if (!allSelf) {
          return {
            allowed: false,
            status: 403,
            reason: 'Você só pode atualizar o seu próprio perfil.',
          };
        }
      }
    }
  }

  // 5. Regras específicas para `projects`
  if (table === 'projects' && isWrite) {
    if ((operation === 'insert' || operation === 'delete') && !STAFF_ROLES.has(role)) {
      return {
        allowed: false,
        status: 403,
        reason: 'Clientes não podem criar ou remover projetos diretamente.',
      };
    }

    const keys = extractPayloadKeys(data);
    for (const key of keys) {
      if (PROJECT_FINANCIAL_WRITE_COLUMNS.has(key) && !FINANCE_ROLES.has(role)) {
        return {
          allowed: false,
          status: 403,
          reason: `Apenas o financeiro/gestão pode alterar dados contratuais (${key}).`,
        };
      }
    }
  }

  return { allowed: true, status: 200 };
}

function sanitizeProfileObject(
  row: Record<string, any>,
  role: string,
  userId: string
): Record<string, any> {
  const clone: Record<string, any> = { ...row };

  for (const col of NEVER_EXPOSE_PROFILE_COLUMNS) {
    delete clone[col];
  }

  if (!FINANCE_ROLES.has(role)) {
    delete clone.base_salary;
  }

  const isStaff = STAFF_ROLES.has(role);
  const isOwnProfile = clone.id && String(clone.id) === String(userId);
  if (!isStaff && !isOwnProfile) {
    for (const col of PRIVATE_PROFILE_PII_COLUMNS) {
      delete clone[col];
    }
  }

  return clone;
}

/**
 * Sanitiza linhas retornadas por /api/db/query antes de enviá-las ao cliente.
 * - Remove segredos de autenticação de `profiles` em qualquer cenário.
 * - Oculta `base_salary` para quem não pertence a `FINANCE_ROLES`.
 * - Para `role === 'client'` em `projects`, mantém apenas projetos do próprio cliente.
 */
export function sanitizeQueryResult<T = any>(
  table: string,
  result: T,
  role: string,
  userId: string
): T {
  if (!result) return result;

  const sanitizeRow = (row: any): any => {
    if (!row || typeof row !== 'object') return row;
    let out = row;
    if (table === 'profiles') {
      out = sanitizeProfileObject(row, role, userId);
    } else if (row.profiles && typeof row.profiles === 'object') {
      out = { ...row, profiles: sanitizeProfileObject(row.profiles, role, userId) };
    }
    return out;
  };

  if (Array.isArray(result)) {
    let rows: any[] = result;
    if (table === 'projects' && !STAFF_ROLES.has(role)) {
      rows = rows.filter((r) => !r?.client_id || String(r.client_id) === String(userId));
    }
    return rows.map(sanitizeRow) as unknown as T;
  }

  if (typeof result === 'object') {
    if (table === 'projects' && !STAFF_ROLES.has(role)) {
      const r = result as Record<string, any>;
      if (r.client_id && String(r.client_id) !== String(userId)) {
        return null as unknown as T;
      }
    }
    return sanitizeRow(result) as T;
  }

  return result;
}
