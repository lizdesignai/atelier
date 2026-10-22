const path = require('path');
const { neon } = require(path.join(__dirname, '../backend/node_modules/@neondatabase/serverless'));
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function run() {
  const ids = ['c7d61610-ebbd-44bf-8116-fd24eb7f6045', 'dbeedf1a-e3cb-4951-bba4-35b7d28d19b4'];

  console.log('Unassigning tasks for Elen and Emmanuel...');
  const updatedTasks = await sql`UPDATE tasks SET assigned_to = NULL WHERE assigned_to IN (${ids[0]}, ${ids[1]}) RETURNING id, title`;
  console.log(`Unassigned ${updatedTasks.length} tasks.`);

  console.log('Cleaning up routing_rules, team_performance, collaborator_assignments...');
  await sql`DELETE FROM routing_rules WHERE assignee_id IN (${ids[0]}, ${ids[1]})`.catch(e => console.log('routing_rules:', e.message));
  await sql`DELETE FROM team_performance WHERE user_id IN (${ids[0]}, ${ids[1]})`.catch(e => console.log('team_performance:', e.message));
  await sql`DELETE FROM collaborator_assignments WHERE collaborator_id IN (${ids[0]}, ${ids[1]})`.catch(e => console.log('collaborator_assignments:', e.message));

  console.log('Deleting from profiles...');
  const deletedProfiles = await sql`DELETE FROM profiles WHERE id IN (${ids[0]}, ${ids[1]}) RETURNING id, nome`;
  console.log('Deleted profiles:', deletedProfiles);

  // Check remaining collabs
  const remaining = await sql`SELECT id, nome, email, role, contract_status FROM profiles WHERE role IN ('colaborador', 'gestor', 'admin')`;
  console.log('Remaining team members:', JSON.stringify(remaining, null, 2));
}

run().catch(console.error);
