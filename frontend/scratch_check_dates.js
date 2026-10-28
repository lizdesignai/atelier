require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

async function test() {
  try {
    const projects = await sql`
      SELECT p.id, pr.nome as client_name, p.billing_date, p.created_at, p.contract_start, p.contract_end,
             p.payment_recurrence, p.financial_value, p.type,
             c.cycle_number, c.period_start, c.period_end, c.status as cycle_status
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      LEFT JOIN ig_cycles c ON c.project_id = p.id
      WHERE p.service_type = 'Gestão de Instagram'
         OR p.service_type ILIKE '%Instagram%'
         OR p.type ILIKE '%Instagram%'
         OR (p.service_type IS NULL AND p.type ILIKE 'Pacote%')
      ORDER BY p.created_at ASC
    `;

    console.log(`=== DATES FOR ${projects.length} PROJECTS ===`);
    projects.forEach(p => {
      console.log(`\nClient: "${p.client_name}" | Project: ${p.id}`);
      console.log(`  created_at:     ${p.created_at}`);
      console.log(`  contract_start: ${p.contract_start}`);
      console.log(`  billing_date:   ${p.billing_date}`);
      console.log(`  contract_end:   ${p.contract_end}`);
      console.log(`  cycle in DB:    Cycle #${p.cycle_number} (${p.period_start} to ${p.period_end})`);
    });

    const financial = await sql`SELECT * FROM financial_records LIMIT 5`;
    console.log('\nFinancial records count:', financial.length);

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
