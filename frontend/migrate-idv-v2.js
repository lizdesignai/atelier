const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const POSTGRES_URL = process.env.POSTGRES_URL;
  if (!POSTGRES_URL) {
    console.error('Missing POSTGRES_URL');
    process.exit(1);
  }

  const sql = neon(POSTGRES_URL);

  try {
    console.log('Adding columns to projects...');
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_phase TEXT DEFAULT 'descobrir';`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_gates JSONB DEFAULT '{}'::jsonb;`;

    console.log('Creating brand_snapshots table...');
    await sql`
      CREATE TABLE IF NOT EXISTS brand_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        essencia TEXT,
        publico TEXT,
        problema TEXT,
        promessa TEXT,
        personalidade JSONB,
        diferenciais TEXT,
        ambiente_competitivo TEXT,
        anti_patterns TEXT,
        ai_raw JSONB,
        status TEXT DEFAULT 'draft',
        client_feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ
      );
    `;

    console.log('Creating territory_evaluations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS territory_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        territory_id TEXT NOT NULL,
        score_posicionamento INTEGER,
        score_diferenciacao INTEGER,
        score_publico INTEGER,
        score_sustentabilidade INTEGER,
        score_autenticidade INTEGER,
        feedback_aberto TEXT,
        chosen BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('Creating activation_checklists table...');
    await sql`
      CREATE TABLE IF NOT EXISTS activation_checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        items JSONB DEFAULT '[]'::jsonb,
        completed_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed', err);
  }
}

migrate();
