const path = require('path');
const { neon } = require(path.join(__dirname, '../backend/node_modules/@neondatabase/serverless'));
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function run() {
  const ids = ['c7d61610-ebbd-44bf-8116-fd24eb7f6045', 'dbeedf1a-e3cb-4951-bba4-35b7d28d19b4'];
  for (const id of ids) {
    const tasks = await sql`SELECT count(*) FROM tasks WHERE assigned_to = ${id}`;
    const comments = await sql`SELECT count(*) FROM task_comments WHERE user_id = ${id}`.catch(() => [{ count: 0 }]);
    const timeEntries = await sql`SELECT count(*) FROM time_entries WHERE user_id = ${id}`.catch(() => [{ count: 0 }]);
    const focusSessions = await sql`SELECT count(*) FROM focus_sessions WHERE user_id = ${id}`.catch(() => [{ count: 0 }]);
    console.log(`User ${id}: tasks=${tasks[0].count}, comments=${comments[0].count}, timeEntries=${timeEntries[0].count}, focusSessions=${focusSessions[0].count}`);
  }
}

run().catch(console.error);
