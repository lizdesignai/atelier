// src/types/finance.ts
// Tipos TypeScript completos do Sistema de Gestão Financeira v2 do Atelier (Fase 2).

export type FinEntryKind = 'revenue' | 'expense';

export type FinEntrySource = 'contract' | 'agency' | 'adhoc' | 'manual' | 'asaas' | 'tax';

export type FinEntryStatus = 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'refunded';

export type FinInvoiceDirection = 'issued' | 'received';

export type FinInvoiceStatus = 'draft' | 'issued' | 'cancelled' | 'error';

export type FinTaxStatus = 'pending' | 'paid' | 'overdue';

export type FinPeriodStatus = 'open' | 'closed';

export type FinAccountType =
  | 'revenue'
  | 'cogs'
  | 'expense'
  | 'tax'
  | 'asset'
  | 'liability'
  | 'equity';

export type FinStatementGroup =
  | 'dre_gross_revenue'
  | 'dre_tax_deduction'
  | 'dre_cogs'
  | 'dre_opex'
  | 'dre_financial'
  | 'balance_current_asset'
  | 'balance_fixed_asset'
  | 'balance_current_liability'
  | 'balance_equity';

export interface FinAccount {
  id: string;
  code: string;
  name: string;
  type: FinAccountType;
  category: string;
  statement_group: FinStatementGroup;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FinBankAccount {
  id: string;
  name: string;
  bank_name?: string | null;
  account_type: 'checking' | 'investment' | 'cash' | 'gateway';
  initial_balance: number;
  cutoff_date: string;
  current_balance: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface FinSupplier {
  id: string;
  name: string;
  trade_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  pix_key?: string | null;
  default_account_id?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FinClientSummary {
  id: string;
  nome: string;
  email?: string | null;
  empresa?: string | null;
  contract_status?: string | null;
  current_status?: string | null;
  active_project?: {
    id: string;
    service_type: string | null;
    financial_value: number | null;
    billing_date: string | null;
    payment_recurrence: string | null;
    payment_method: string | null;
  } | null;
}

export interface FinEntry {
  id: string;
  kind: FinEntryKind;
  source: FinEntrySource;
  title: string;
  description?: string | null;
  account_id: string;
  bank_account_id?: string | null;
  supplier_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  agency_id?: string | null;
  competence_date: string;
  due_date: string;
  paid_date?: string | null;
  amount: number;
  amount_paid: number;
  status: FinEntryStatus;
  payment_method?: string | null;
  installment_number: number;
  installment_total: number;
  recurrence_id?: string | null;
  invoice_id?: string | null;
  external_ref?: string | null;
  tags: string[];
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields opcionais
  account?: FinAccount | null;
  bank_account?: FinBankAccount | null;
  client?: { id: string; nome: string; email: string; avatar_url?: string | null } | null;
  project?: { id: string; service_type: string; status: string } | null;
  agency?: { id: string; name: string } | null;
  supplier?: FinSupplier | null;
  settlements?: FinSettlement[];
}

export interface FinSettlement {
  id: string;
  entry_id: string;
  bank_account_id?: string | null;
  payment_date: string;
  amount: number;
  fee_amount: number;
  interest_amount: number;
  discount_amount: number;
  payment_method?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FinInvoice {
  id: string;
  direction: FinInvoiceDirection;
  number?: string | null;
  series?: string | null;
  access_key?: string | null;
  issuer_name?: string | null;
  issuer_doc?: string | null;
  recipient_name?: string | null;
  recipient_doc?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  supplier_id?: string | null;
  issue_date?: string | null;
  total_amount: number;
  iss_amount: number;
  iss_retained: boolean;
  irrf_amount: number;
  pis_cofins_csll: number;
  status: FinInvoiceStatus;
  xml_url?: string | null;
  pdf_url?: string | null;
  entry_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FinTaxObligation {
  id: string;
  tax_type: string;
  competence: string; // YYYY-MM
  due_date: string;
  amount: number;
  status: FinTaxStatus;
  guide_url?: string | null;
  receipt_url?: string | null;
  entry_id?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface FinPeriod {
  id: string;
  closing_month: string; // YYYY-MM
  status: FinPeriodStatus;
  closed_at: string;
  closed_by?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  total_revenue: number;
  total_expenses: number;
  net_result: number;
  ebitda: number;
  ebitda_margin: number;
  snapshot_data: Record<string, any>;
  notes?: string | null;
}

export interface FinAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'insert' | 'update' | 'delete' | 'close' | 'reopen';
  before_state?: Record<string, any> | null;
  after_state?: Record<string, any> | null;
  reason?: string | null;
  user_id?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface FinCostRate {
  id: string;
  user_id?: string | null;
  role_name?: string | null;
  hourly_rate: number;
  monthly_base_salary?: number | null;
  overhead_multiplier: number;
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
}

export interface FinValuationScenario {
  id: string;
  name: string;
  scenario_type: 'conservative' | 'base' | 'optimistic';
  ebitda_multiple: number;
  mrr_multiple: number;
  discount_rate: number;
  annual_growth_rate: number;
  calculated_valuation: number;
  methodology: string;
  parameters: Record<string, any>;
  created_by?: string | null;
  created_at: string;
}
