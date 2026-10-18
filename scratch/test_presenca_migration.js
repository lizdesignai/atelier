require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  console.log('Testing Presença schema initialization on Neon...');
  
  // 1. Criar tabelas se não existirem
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
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_cycle ON tasks(cycle_id) WHERE cycle_id IS NOT NULL`;

  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS task_id UUID`;
  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS category VARCHAR(30)`;
  await sql`ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS uploaded_by_role VARCHAR(20)`;

  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_cycle_id UUID`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_owner_id UUID`;

  console.log('✅ Schema migration executed successfully!');

  // 2. Verificar se há projetos ativos de Instagram e inicializar seus ciclos
  const igProjects = await sql`
    SELECT id, client_id, billing_date FROM projects 
    WHERE service_type = 'Gestão de Instagram' AND status = 'active'
  `;
  console.log(`Found ${igProjects.length} active Instagram projects.`);

  for (const p of igProjects) {
    const existing = await sql`SELECT id FROM ig_cycles WHERE project_id = ${p.id} LIMIT 1`;
    if (existing.length === 0) {
      const bDate = p.billing_date ? new Date(p.billing_date) : new Date();
      const pStart = bDate.toISOString().split('T')[0];
      const nextMonth = new Date(bDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(nextMonth.getDate() - 1);
      const pEnd = nextMonth.toISOString().split('T')[0];

      const [cycle] = await sql`
        INSERT INTO ig_cycles (
          project_id, client_id, cycle_number, period_start, period_end, status,
          objective, objective_kind, editorial_strategy,
          pillars
        ) VALUES (
          ${p.id}, ${p.client_id}, 1, ${pStart}, ${pEnd}, 'open',
          'Aumentar a procura qualificada e consolidação de autoridade.', 'autoridade',
          'Demonstrar competência, responder dúvidas frequentes, apresentar evidências e criar caminhos claros para contato.',
          '{"descoberta":20,"autoridade":45,"relacionamento":20,"conversao":15}'::jsonb
        ) RETURNING id
      `;

      await sql`UPDATE projects SET current_cycle_id = ${cycle.id} WHERE id = ${p.id}`;

      // Link tasks
      await sql`
        UPDATE tasks SET cycle_id = ${cycle.id}, ig_is_piece = true
        WHERE project_id = ${p.id} AND task_type IN ('design', 'video')
      `;
      console.log(`Created cycle #${1} for project ${p.id}`);
    }
  }

  const cyclesCount = await sql`SELECT count(*) FROM ig_cycles`;
  console.log('Total ig_cycles now:', cyclesCount[0].count);
})().catch(e => console.error('Error:', e));
