// src/lib/presenca/schema.ts
// Migração idempotente e aditiva do módulo "Presença" (Gestão de Instagram 2.0).
// Segue o padrão do projeto (ALTER ... IF NOT EXISTS) e é executada uma única vez por instância
// de servidor, sob demanda, antes da primeira consulta do módulo. Nada é removido ou renomeado.

import type { NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

let schemaReady: Promise<void> | null = null;

export function ensurePresencaSchema(sql: Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = runMigration(sql).catch((err) => {
      schemaReady = null; // permite nova tentativa na próxima requisição
      throw err;
    });
  }
  return schemaReady;
}

async function runMigration(sql: Sql) {
  // 1. Ciclo mensal de presença (um por projeto e por janela de faturamento)
  await sql`
    CREATE TABLE IF NOT EXISTS ig_cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      client_id UUID,
      cycle_number INTEGER NOT NULL DEFAULT 1,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      objective TEXT,
      objective_kind VARCHAR(30),
      editorial_strategy TEXT,
      pillars JSONB NOT NULL DEFAULT '{"descoberta":25,"autoridade":25,"relacionamento":25,"conversao":25}',
      key_metrics JSONB NOT NULL DEFAULT '[]',
      baseline JSONB NOT NULL DEFAULT '{}',
      results JSONB NOT NULL DEFAULT '[]',
      learnings TEXT,
      next_decision TEXT,
      pulse_answers JSONB NOT NULL DEFAULT '{}',
      pulse_answered_at TIMESTAMPTZ,
      direction_confirmed_at TIMESTAMPTZ,
      auto_closed BOOLEAN NOT NULL DEFAULT FALSE,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ux_ig_cycles_project_start ON ig_cycles(project_id, period_start)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ig_cycles_project ON ig_cycles(project_id, period_start DESC)`;

  // 2. Histórico rastreável de aprovações (substitui "conversa perdida no WhatsApp")
  await sql`
    CREATE TABLE IF NOT EXISTS ig_approval_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      project_id UUID,
      cycle_id UUID,
      actor_id UUID,
      actor_role VARCHAR(20),
      actor_name TEXT,
      action VARCHAR(30) NOT NULL,
      adjust_type VARCHAR(30),
      comment TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ig_approval_events_task ON ig_approval_events(task_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ig_approval_events_project ON ig_approval_events(project_id, created_at DESC)`;

  // 3. Metadados editoriais diretamente na peça (task) -> Focus e Analytics enxergam sem JOIN extra
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cycle_id UUID`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_is_piece BOOLEAN`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_format VARCHAR(30)`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_pillar VARCHAR(30)`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_objective TEXT`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_cta TEXT`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_hypothesis TEXT`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_publish_status VARCHAR(30)`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_scheduled_for TIMESTAMPTZ`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_published_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_revision_round INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_sent_for_approval_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ig_approved_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type VARCHAR(50)`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 100`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 60`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgency BOOLEAN DEFAULT false`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_cycle ON tasks(cycle_id) WHERE cycle_id IS NOT NULL`;

  // 4. Biblioteca de materiais: arquivo vinculável à peça que o utiliza
  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS task_id UUID`;
  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS category VARCHAR(30)`;
  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS uploaded_by_role VARCHAR(20)`;

  // 5. Projeto aponta para o ciclo vigente (leitura rápida em Analytics / Clientes)
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_cycle_id UUID`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_owner_id UUID`;
}
