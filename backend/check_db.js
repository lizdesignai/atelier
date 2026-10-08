require('dotenv').config({path: '../frontend/.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT title, status FROM tasks LIMIT 50")
  .then(r => {
    console.log(r.rows);
  })
  .catch(console.error)
  .finally(() => pool.end());
