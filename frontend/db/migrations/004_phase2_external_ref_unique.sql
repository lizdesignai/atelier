-- 004_phase2_external_ref_unique.sql
-- Adiciona constraint UNIQUE em fin_entries(external_ref) para suportar ON CONFLICT padrão

ALTER TABLE fin_entries
  ADD CONSTRAINT uq_fin_entries_external_ref UNIQUE (external_ref);
