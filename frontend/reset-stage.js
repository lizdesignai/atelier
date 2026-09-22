import { getDb } from './src/lib/db.js';

async function run() {
  const sql = getDb();
  try {
    console.log('Resetting etapa_atual to 0...');
    await sql`UPDATE mapas SET etapa_atual = 0;`;
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
