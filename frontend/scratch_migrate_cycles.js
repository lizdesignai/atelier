require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

async function test() {
  try {
    const cycles = await sql`
      SELECT c.*, p.service_type, p.billing_date, p.contract_start, pr.nome as client_name
      FROM ig_cycles c
      JOIN projects p ON c.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      ORDER BY c.cycle_number ASC, pr.nome ASC
    `;
    console.log(`Total ig_cycles: ${cycles.length}`);
    cycles.forEach(c => {
      console.log(`- Cycle #${c.cycle_number} [${c.id.slice(0, 8)}] | Client: "${c.client_name}" | status: ${c.status} | Period: ${c.period_start} to ${c.period_end}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
