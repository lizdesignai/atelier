require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function fixZeros() {
  const client = await pool.connect();
  try {
    console.log('🔧 Atualizando mapas zerados com os dados de mock para testes...');
    const result = await client.query(`
      UPDATE mapas 
      SET 
        score_total = 72,
        score_clareza = 82,
        score_autoridade = 71,
        score_percepcao = 76,
        score_conversao = 48,
        principal_gargalo = 'conversao',
        recomendacao = 'Sua marca apresenta gaps na jornada de conversão. Recomendamos uma Gestão Estratégica.'
      WHERE score_total = 0
    `);
    console.log(`✅ ${result.rowCount} mapas zerados foram atualizados com os scores de teste (72 pontos).`);
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixZeros();
