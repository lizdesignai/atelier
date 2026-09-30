require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function test() {
  const res = await sql.query('SELECT count(*) FROM projects');
  console.log(res);
}

test().catch(console.error);
