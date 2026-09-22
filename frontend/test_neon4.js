require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
sql`SELECT id, title, created_at, status FROM tasks ORDER BY created_at DESC LIMIT 5`
  .then(r => console.log('Latest Neon tasks:', r))
  .catch(console.error);
