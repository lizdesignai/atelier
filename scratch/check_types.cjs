const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local' });
const sql = neon(process.env.POSTGRES_URL);

async function test() {
  const types = await sql`
    SELECT DISTINCT type, service_type, count(*) as count
    FROM projects
    GROUP BY type, service_type
    ORDER BY count DESC
  `;
  console.log(JSON.stringify(types, null, 2));
}
test();
