const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.POSTGRES_URL);

async function check() {
  const projs = await sql`
    SELECT p.id, p.client_id, p.service_type, p.type, p.status, p.billing_date, p.contract_start, p.posts_quantity, p.videos_quantity,
           pr.nome, pr.empresa
    FROM projects p
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE pr.nome ILIKE '%sorriso%' OR pr.empresa ILIKE '%sorriso%'
  `;
  console.log('PROJETOS BELO SORRISO:', JSON.stringify(projs, null, 2));
}

check().catch(console.error);
