-- =============================================
-- FASE 1 — MAPA 4D: Schema de Jornada Semanal
-- Executar no Neon PostgreSQL
-- =============================================

-- 1. Adicionar colunas de progressão à tabela mapas existente
ALTER TABLE mapas ADD COLUMN IF NOT EXISTS etapa_atual INTEGER DEFAULT 0;
ALTER TABLE mapas ADD COLUMN IF NOT EXISTS progresso_etapas JSONB DEFAULT '{}'::jsonb;
-- progresso_etapas schema:
-- {
--   "0": { "concluida": true },
--   "1": { "aula_vista": false, "pdf_aberto": false, "checkpoint_score": 0, "tarefas": {}, "evidencia_enviada": false, "concluida": false },
--   "2": { ... },
--   "3": { ... },
--   "4": { ... },
--   "5": { "concluida": false }
-- }

-- 2. Tabela de evidências enviadas pelo cliente em cada etapa
CREATE TABLE IF NOT EXISTS mapa_evidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapa_id UUID REFERENCES mapas(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    etapa INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'texto', -- 'screenshot', 'texto', 'link'
    conteudo TEXT,
    arquivo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_mapas_client_id ON mapas(client_id);
CREATE INDEX IF NOT EXISTS idx_mapa_evidencias_mapa_id ON mapa_evidencias(mapa_id);
CREATE INDEX IF NOT EXISTS idx_mapa_evidencias_client_id ON mapa_evidencias(client_id);
