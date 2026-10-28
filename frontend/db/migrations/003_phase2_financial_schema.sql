-- 003_phase2_financial_schema.sql
-- Modelo de Dados Financeiro Completo e Robusto do Atelier (Fase 2)

-- 1. Plano de Contas Hierárquico
CREATE TABLE IF NOT EXISTS fin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(30) NOT NULL, -- 'revenue', 'cogs', 'expense', 'tax', 'asset', 'liability', 'equity'
  category VARCHAR(60) NOT NULL,
  statement_group VARCHAR(40) NOT NULL, -- 'dre_gross_revenue', 'dre_tax_deduction', 'dre_cogs', 'dre_opex', 'dre_financial', 'balance_current_asset', 'balance_fixed_asset', 'balance_current_liability', 'balance_equity'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_accounts_type ON fin_accounts (type);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_category ON fin_accounts (category);

-- 2. Contas Bancárias / Caixas
CREATE TABLE IF NOT EXISTS fin_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(60),
  account_type VARCHAR(30) DEFAULT 'checking', -- 'checking', 'investment', 'cash', 'gateway'
  initial_balance NUMERIC(14,2) DEFAULT 0.00,
  cutoff_date DATE DEFAULT CURRENT_DATE,
  current_balance NUMERIC(14,2) DEFAULT 0.00,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fornecedores e Parceiros
CREATE TABLE IF NOT EXISTS fin_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  trade_name VARCHAR(150),
  document VARCHAR(30), -- CPF ou CNPJ
  email VARCHAR(120),
  phone VARCHAR(30),
  pix_key VARCHAR(120),
  default_account_id UUID REFERENCES fin_accounts(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_suppliers_doc ON fin_suppliers (document);

-- 4. Lançamentos Financeiros (Ledger Principal)
CREATE TABLE IF NOT EXISTS fin_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL, -- 'revenue', 'expense'
  source VARCHAR(30) NOT NULL DEFAULT 'manual', -- 'contract', 'agency', 'adhoc', 'manual', 'asaas', 'tax'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  account_id UUID NOT NULL REFERENCES fin_accounts(id),
  bank_account_id UUID REFERENCES fin_bank_accounts(id),
  supplier_id UUID REFERENCES fin_suppliers(id),
  client_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  agency_id UUID REFERENCES agencies(id),
  competence_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'partially_paid', 'paid', 'cancelled', 'refunded'
  payment_method VARCHAR(50),
  installment_number INT DEFAULT 1,
  installment_total INT DEFAULT 1,
  recurrence_id UUID,
  invoice_id UUID,
  external_ref VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_entries_kind ON fin_entries (kind);
CREATE INDEX IF NOT EXISTS idx_fin_entries_status ON fin_entries (status);
CREATE INDEX IF NOT EXISTS idx_fin_entries_competence ON fin_entries (competence_date);
CREATE INDEX IF NOT EXISTS idx_fin_entries_due_date ON fin_entries (due_date);
CREATE INDEX IF NOT EXISTS idx_fin_entries_paid_date ON fin_entries (paid_date);
CREATE INDEX IF NOT EXISTS idx_fin_entries_project ON fin_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_client ON fin_entries (client_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_agency ON fin_entries (agency_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_entries_ext_ref ON fin_entries (external_ref) WHERE external_ref IS NOT NULL;

-- 5. Baixas e Liquidações Financeiras (Settlements)
CREATE TABLE IF NOT EXISTS fin_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES fin_entries(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES fin_bank_accounts(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  fee_amount NUMERIC(14,2) DEFAULT 0.00,
  interest_amount NUMERIC(14,2) DEFAULT 0.00,
  discount_amount NUMERIC(14,2) DEFAULT 0.00,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_settlements_entry ON fin_settlements (entry_id);
CREATE INDEX IF NOT EXISTS idx_fin_settlements_date ON fin_settlements (payment_date);

-- 6. Notas Fiscais
CREATE TABLE IF NOT EXISTS fin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction VARCHAR(20) NOT NULL, -- 'issued', 'received'
  number VARCHAR(50),
  series VARCHAR(20),
  access_key VARCHAR(100),
  issuer_name VARCHAR(255),
  issuer_doc VARCHAR(30),
  recipient_name VARCHAR(255),
  recipient_doc VARCHAR(30),
  client_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  supplier_id UUID REFERENCES fin_suppliers(id),
  issue_date DATE,
  total_amount NUMERIC(14,2) NOT NULL,
  iss_amount NUMERIC(14,2) DEFAULT 0.00,
  iss_retained BOOLEAN DEFAULT FALSE,
  irrf_amount NUMERIC(14,2) DEFAULT 0.00,
  pis_cofins_csll NUMERIC(14,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'issued', -- 'draft', 'issued', 'cancelled', 'error'
  xml_url TEXT,
  pdf_url TEXT,
  entry_id UUID REFERENCES fin_entries(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_invoices_direction ON fin_invoices (direction);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_number ON fin_invoices (number);

-- 7. Obrigações Tributárias / Impostos
CREATE TABLE IF NOT EXISTS fin_tax_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type VARCHAR(50) NOT NULL, -- 'DAS Simples Nacional', 'ISSQN', 'INSS Pró-labore', 'IRRF'
  competence VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  guide_url TEXT,
  receipt_url TEXT,
  entry_id UUID REFERENCES fin_entries(id),
  paid_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_tax_competence ON fin_tax_obligations (competence);
CREATE INDEX IF NOT EXISTS idx_fin_tax_status ON fin_tax_obligations (status);

-- 8. Fechamentos Mensais Consolidados
CREATE TABLE IF NOT EXISTS fin_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_month VARCHAR(7) UNIQUE NOT NULL, -- 'YYYY-MM'
  status VARCHAR(20) NOT NULL DEFAULT 'closed', -- 'open', 'closed'
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by UUID REFERENCES profiles(id),
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES profiles(id),
  total_revenue NUMERIC(14,2) DEFAULT 0.00,
  total_expenses NUMERIC(14,2) DEFAULT 0.00,
  net_result NUMERIC(14,2) DEFAULT 0.00,
  ebitda NUMERIC(14,2) DEFAULT 0.00,
  ebitda_margin NUMERIC(6,2) DEFAULT 0.00,
  snapshot_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_fin_periods_status ON fin_periods (status);

-- 9. Trilha de Auditoria Contábil
CREATE TABLE IF NOT EXISTS fin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete', 'close', 'reopen'
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  user_id UUID REFERENCES profiles(id),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_audit_entity ON fin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_user ON fin_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_created ON fin_audit_log (created_at DESC);

-- 10. Custos Horários Reais da Equipe
CREATE TABLE IF NOT EXISTS fin_cost_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  role_name VARCHAR(50),
  hourly_rate NUMERIC(10,2) NOT NULL,
  monthly_base_salary NUMERIC(14,2),
  overhead_multiplier NUMERIC(4,2) DEFAULT 1.30,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Cenários e Premissas de Valuation
CREATE TABLE IF NOT EXISTS fin_valuation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  scenario_type VARCHAR(30) DEFAULT 'base', -- 'conservative', 'base', 'optimistic'
  ebitda_multiple NUMERIC(5,2) DEFAULT 4.0,
  mrr_multiple NUMERIC(5,2) DEFAULT 1.5,
  discount_rate NUMERIC(5,2) DEFAULT 15.0,
  annual_growth_rate NUMERIC(5,2) DEFAULT 20.0,
  calculated_valuation NUMERIC(16,2) NOT NULL,
  methodology VARCHAR(50) DEFAULT 'multiple_ebitda',
  parameters JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED: Plano de Contas Padrão do Atelier
INSERT INTO fin_accounts (code, name, type, category, statement_group, description)
VALUES
  -- 1. RECEITAS
  ('1.1.01', 'Receita Recorrente (Gestão de Instagram)', 'revenue', 'Receita Recorrente', 'dre_gross_revenue', 'Contratos mensais de gestão e presença contínua'),
  ('1.1.02', 'Receita Recorrente (Agências Parceiras B2B)', 'revenue', 'Receita Recorrente', 'dre_gross_revenue', 'Contratos mensais B2B de agências parceiras'),
  ('1.2.01', 'Receita de Identidade Visual & Rebranding', 'revenue', 'Receita Avulsa', 'dre_gross_revenue', 'Projetos pontuais de IDV e marcas'),
  ('1.2.02', 'Receita O Mapa (Diagnóstico Estratégico)', 'revenue', 'Receita Avulsa', 'dre_gross_revenue', 'Serviço pontual O Mapa'),
  ('1.2.03', 'Serviços Avulsos & Demandas Extras', 'revenue', 'Receita Avulsa', 'dre_gross_revenue', 'Prazos extras, criativos avulsos, motion avulso'),
  ('1.3.01', 'Rendimentos Financeiros de Caixa', 'revenue', 'Receita Financeira', 'dre_financial', 'Rendimentos de aplicações e juros'),

  -- 2. DEDUÇÕES DE RECEITA / TRIBUTOS SOBRE VENDAS
  ('2.1.01', 'Simples Nacional (DAS)', 'tax', 'Impostos & Tributos', 'dre_tax_deduction', 'Imposto unificado Simples Nacional sobre faturamento'),
  ('2.1.02', 'ISSQN Retido na Fonte', 'tax', 'Impostos & Tributos', 'dre_tax_deduction', 'Imposto sobre serviços municipal retido pelo tomador'),
  ('2.1.03', 'Taxas de Gateway & Emissão (Asaas)', 'expense', 'Taxas Bancárias', 'dre_tax_deduction', 'Tarifas de cobrança bancária e boletos'),

  -- 3. CUSTOS DOS SERVIÇOS PRESTADOS (COGS)
  ('3.1.01', 'Remuneração da Equipe de Produção', 'cogs', 'Salários & Produção', 'dre_cogs', 'Custos diretos de colaboradores alocados em entregas'),
  ('3.1.02', 'Prestadores de Serviço / Terceirizados', 'cogs', 'Fornecedores & Produção', 'dre_cogs', 'Motion designers, redatores ou videomakers freelancers'),

  -- 4. DESPESAS OPERACIONAIS (OPEX)
  ('4.1.01', 'Softwares & Ferramentas (Adobe, Figma, CapCut)', 'expense', 'Software & Infra', 'dre_opex', 'Assinaturas de ferramentas de criação e produtividade'),
  ('4.1.02', 'Servidores, IA & Infraestrutura Cloud', 'expense', 'Software & Infra', 'dre_opex', 'Neon, Supabase, Apify, APIs de IA Gemini/OpenAI'),
  ('4.1.03', 'Honorários Contábeis & Jurídicos', 'expense', 'Serviços Profissionais', 'dre_opex', 'Assessoria contábil mensal e registros'),
  ('4.1.04', 'Marketing, Tráfego & Aquisição (Ads)', 'expense', 'Marketing & Tráfego', 'dre_opex', 'Meta Ads, Google Ads e prospecção'),
  ('4.1.05', 'Custos Fixos de Escritório & Internet', 'expense', 'Custos Fixos', 'dre_opex', 'Energia, internet, telefonia e infra física'),
  ('4.1.06', 'Pró-Labore dos Sócios / Gestão', 'expense', 'Salários & Fornecedores', 'dre_opex', 'Retirada mensal pró-labore da liderança'),
  ('4.1.07', 'Despesas Administrativas & Diversas', 'expense', 'Despesas Gerais', 'dre_opex', 'Outras despesas gerais de funcionamento')
ON CONFLICT (code) DO NOTHING;

-- SEED: Conta Bancária Padrão do Atelier
INSERT INTO fin_bank_accounts (name, bank_name, account_type, initial_balance, current_balance, is_default)
VALUES ('Conta Principal Atelier', 'Banco Principal', 'checking', 0.00, 0.00, TRUE)
ON CONFLICT DO NOTHING;
