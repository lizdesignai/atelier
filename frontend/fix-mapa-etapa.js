require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function fixEtapa() {
  const client = await pool.connect();
  try {
    console.log('🔧 Atualizando etapa_atual para 1...');
    const result = await client.query(`
      UPDATE mapas 
      SET etapa_atual = 1
      WHERE etapa_atual = 0
    `);
    console.log(`✅ ${result.rowCount} mapas foram atualizados para a etapa 1.`);
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixEtapa();
