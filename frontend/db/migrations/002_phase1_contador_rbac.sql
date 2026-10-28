-- 002_phase1_contador_rbac.sql
-- Validação estrita da role 'contador' e índices de autorização em profiles

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass AND conname = 'chk_profiles_valid_role'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT chk_profiles_valid_role;
  END IF;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_valid_role
  CHECK (role IN ('client', 'colaborador', 'gestor', 'admin', 'contador'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
