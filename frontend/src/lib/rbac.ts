// src/lib/rbac.ts
// Módulo central de RBAC (Role-Based Access Control) do Atelier.
// Define papéis, capacidades financeiras e matriz de autorização (Fase 1).

export type UserRole = 'client' | 'colaborador' | 'gestor' | 'admin' | 'contador';

export const ALL_ROLES: UserRole[] = ['client', 'colaborador', 'gestor', 'admin', 'contador'];

export const FINANCE_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'gestor', 'contador']);
export const MANAGEMENT_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'gestor']);
export const STAFF_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'gestor', 'colaborador', 'contador']);
export const CLIENT_ROLES: ReadonlySet<UserRole> = new Set(['client']);

export type FinanceCapability =
  | 'view_financial'
  | 'edit_payment_date_value'
  | 'create_outflow'
  | 'create_adhoc_service'
  | 'manage_invoices'
  | 'manage_taxes'
  | 'close_period'
  | 'reopen_period'
  | 'delete_entry'
  | 'view_individual_salaries'
  | 'manage_valuation_parameters';

const CAPABILITY_MATRIX: Record<FinanceCapability, ReadonlySet<UserRole>> = {
  // Visualizar painel financeiro, fluxo de caixa, relatórios
  view_financial: FINANCE_ROLES,

  // Liberdade para editar data e valor de pagamento (requisito central do cliente)
  edit_payment_date_value: FINANCE_ROLES,

  // Subir novos gastos/despesas
  create_outflow: FINANCE_ROLES,

  // Lançar serviços e recebimentos avulsos
  create_adhoc_service: FINANCE_ROLES,

  // Gerir notas fiscais e anexos
  manage_invoices: FINANCE_ROLES,

  // Gerir impostos a pagar (DAS/ISS/SN) e anexar guias
  manage_taxes: FINANCE_ROLES,

  // Fechar período mensal
  close_period: FINANCE_ROLES,

  // Reabrir período já fechado (apenas admin para garantir imutabilidade)
  reopen_period: new Set(['admin']),

  // Exclusão definitiva de lançamento financeiro (apenas admin; contador faz estorno/edição)
  delete_entry: new Set(['admin']),

  // Ver salários base individuais da equipe (apenas admin; contador e gestor veem totais na DRE)
  view_individual_salaries: new Set(['admin']),

  // Editar premissas e cenários de valuation
  manage_valuation_parameters: MANAGEMENT_ROLES,
};

/**
 * Verifica se um papel de usuário possui uma determinada capacidade.
 */
export function can(role: string | null | undefined, capability: FinanceCapability): boolean {
  if (!role) return false;
  const allowed = CAPABILITY_MATRIX[capability];
  if (!allowed) return false;
  return allowed.has(role as UserRole);
}

export function isFinanceRole(role: string | null | undefined): boolean {
  return Boolean(role && FINANCE_ROLES.has(role as UserRole));
}

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.has(role as UserRole));
}

export function isManagementRole(role: string | null | undefined): boolean {
  return Boolean(role && MANAGEMENT_ROLES.has(role as UserRole));
}

/**
 * Valida se uma rota é permitida para o perfil 'contador'.
 * O contador tem acesso a:
 * - /admin/financeiro (e qualquer subrota)
 * - /admin/fio (e qualquer subrota de mensagens internas)
 * - /comunidade (e subrotas do Vêneto)
 * - /configuracoes (perfil pessoal e MFA)
 * - rotas de API pública/autenticada permitidas
 */
export function isContadorRouteAllowed(pathname: string): boolean {
  if (
    pathname === '/admin/financeiro' ||
    pathname.startsWith('/admin/financeiro/') ||
    pathname === '/admin/fio' ||
    pathname.startsWith('/admin/fio/') ||
    pathname === '/comunidade' ||
    pathname.startsWith('/comunidade/') ||
    pathname === '/configuracoes' ||
    pathname.startsWith('/configuracoes/') ||
    pathname.startsWith('/api/')
  ) {
    return true;
  }
  return false;
}
