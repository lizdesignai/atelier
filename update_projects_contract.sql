-- Execute este script no SQL Editor do seu Dashboard Supabase.

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_start DATE,
ADD COLUMN IF NOT EXISTS contract_end DATE,
ADD COLUMN IF NOT EXISTS posts_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS videos_quantity INTEGER DEFAULT 0;

-- Optional: Atualiza projetos antigos para 0 caso estejam null
UPDATE public.projects SET posts_quantity = 0 WHERE posts_quantity IS NULL;
UPDATE public.projects SET videos_quantity = 0 WHERE videos_quantity IS NULL;
