const path = require('path');
const { neon } = require(path.join(__dirname, '../backend/node_modules/@neondatabase/serverless'));
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function run() {
  const fks = await sql`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'profiles' AND ccu.column_name = 'id'
  `;
  console.log('Foreign keys pointing to profiles.id:', JSON.stringify(fks, null, 2));
}

run().catch(console.error);
