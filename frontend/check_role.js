const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon("postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
  
  const email = 'emanuelsantana300@gmail.com';
  console.log(`Checking user: ${email}`);
  
  const users = await sql`SELECT id, email, nome, role FROM profiles WHERE email = ${email}`;
  console.log('Current state:', users);
  
  if (users.length > 0) {
    if (users[0].role !== 'colaborador' && users[0].role !== 'admin' && users[0].role !== 'fio' && users[0].role !== 'contador') {
      console.log('Updating role...');
      // Looking at the login logic, it uses: 
      // role === 'client' ? "/" : role === 'contador' ? "/admin/financeiro" : "/admin/fio"
      // If he is a collaborator, the role should probably be 'fio' or 'colaborador'. Let's see all unique roles.
    }
  }
  
  const roles = await sql`SELECT DISTINCT role FROM profiles`;
  console.log('Available roles:', roles);
}

main().catch(console.error);
