const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: 'frontend/.env.local' });

async function test() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const q = 'SELECT * FROM profiles LIMIT 1';
    const params = [];
    const result = await sql.query(q, params);
    console.log('Array?', Array.isArray(result));
    console.log('Result keys:', Object.keys(result));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
