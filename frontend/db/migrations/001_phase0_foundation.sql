-- 001_phase0_foundation.sql
-- Fundação e blindagem estrutural da Fase 0 (Idempotente)

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(120) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by VARCHAR(120),
  execution_ms INTEGER
);

-- Garante que as colunas IDV da migração legada existam de forma versionada
ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_product VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_complexity VARCHAR(5);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_capacity_weight NUMERIC DEFAULT 1.5;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS presentation_target_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_target_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_wait_hours INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ready_checklist JSONB DEFAULT '{}';

-- Corrige ausência de UNIQUE em financial_closings.closing_month (impede duplo fechamento do mesmo mês)
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_closings_closing_month_uniq
  ON financial_closings (closing_month);
