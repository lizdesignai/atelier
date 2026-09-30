const { Client } = require('pg'); 
const client = new Client('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'); 
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'briefings_identidade_visual'"))
  .then(res => {
     console.log(res.rows.map(r=>r.column_name)); 
     process.exit(0);
  });
