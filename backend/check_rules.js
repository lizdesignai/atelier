const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.POSTGRES_URL);

async function run() {
  const rules = await sql`
    SELECT r.*, p.nome as assignee_name
    FROM routing_rules r
    LEFT JOIN profiles p ON r.assignee_id = p.id
    WHERE r.project_id = '7ef5e662-6540-40f7-94c9-7aee456bebd9'
  `;
  console.log('RULES BELO SORRISO:', JSON.stringify(rules, null, 2));

  const team = await sql`
    SELECT id, nome, role FROM profiles WHERE role IN ('admin', 'gestor', 'colaborador')
  `;
  console.log('TEAM:', JSON.stringify(team, null, 2));
}

run().catch(console.error);
