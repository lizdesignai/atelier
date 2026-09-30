import { neon } from '@neondatabase/serverless';

async function migrate() {
  const connStr = 'postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const sql = neon(connStr);

  console.log('Iniciando migração de schema da Fase 1...');

  try {
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_product VARCHAR(20);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_complexity VARCHAR(5);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_capacity_weight NUMERIC DEFAULT 1.5;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_start_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS presentation_target_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_target_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_wait_hours INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ready_checklist JSONB DEFAULT '{}';`;
    
    // Opcional: atualizar os projetos atuais de IDV que não têm product para 'IDV-CORE'
    await sql`
      UPDATE projects 
      SET idv_product = 'IDV-CORE', idv_complexity = 'C2', ready_checklist = '{"contract": true, "payment": true, "briefing": true, "assets": true, "meeting_scheduled": true}'::jsonb
      WHERE service_type = 'Identidade Visual' AND idv_product IS NULL;
    `;

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro na migração:', error);
  }
}

migrate();
