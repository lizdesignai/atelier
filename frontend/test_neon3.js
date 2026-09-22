require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
sql`SELECT count(*) FROM tasks`
  .then(r => console.log('Tasks in Neon:', r))
  .catch(console.error);
