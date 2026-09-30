require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateStage() {
  try {
    // 1. Find the user
    const users = await sql`SELECT id FROM auth.users WHERE email = 'testeidv2@atelier.com'`;
    if (users.length === 0) {
      console.log('User not found');
      return;
    }
    const userId = users[0].id;
    console.log('User ID:', userId);

    // 2. Update project
    const projs = await sql`UPDATE projects SET stage = 'descobrir' WHERE client_id = ${userId} AND status IN ('active', 'delivered') RETURNING id`;
    console.log('Updated projects:', projs);
  } catch (err) {
    console.error(err);
  }
}

updateStage();
