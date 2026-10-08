import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function testUpdate() {
  const sql = neon(process.env.POSTGRES_URL!);
  const id = '54dc04e4-cc50-4e9d-8bdb-2bf7ab37bad9';
  const title = "New Title";
  try {
    const res = await sql`UPDATE tasks SET title = ${title} WHERE id = ${id} RETURNING *`;
    console.log(res);
  } catch(e) {
    console.error(e);
  }
}
testUpdate();
