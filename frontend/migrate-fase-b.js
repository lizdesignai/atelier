import { getDb } from './src/lib/db.js';

async function run() {
  const sql = getDb();
  try {
    console.log('Adding mapa_verificado column...');
    await sql`ALTER TABLE mapas ADD COLUMN IF NOT EXISTS mapa_verificado BOOLEAN DEFAULT false;`;
    
    console.log('Adding ipd_label column...');
    await sql`ALTER TABLE mapas ADD COLUMN IF NOT EXISTS ipd_label TEXT DEFAULT 'IPD';`;
    
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
