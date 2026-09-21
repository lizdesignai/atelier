const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function backfill() {
  try {
    const bIdv = await pool.query(`SELECT * FROM briefings_identidade_visual`);
    for (const row of bIdv.rows) {
      const email = row.Email || (row.dados_completos && row.dados_completos.Email);
      const nome = row.Nome_Cliente || (row.dados_completos && row.dados_completos.Nome_Cliente) || 'Cliente IDV';
      const empresa = row.Nome_Logotipo || (row.dados_completos && row.dados_completos.Nome_Logotipo) || '';
      
      if (!email) continue;

      let p = await pool.query(`SELECT id FROM profiles WHERE email = $1`, [email]);
      let clientId = p.rows.length > 0 ? p.rows[0].id : null;

      if (!clientId) {
        const res = await pool.query(`
          INSERT INTO profiles (id, email, nome, role, empresa)
          VALUES (gen_random_uuid(), $1, $2, 'client', $3)
          RETURNING id
        `, [email, nome, empresa]);
        clientId = res.rows[0].id;
      }

      await pool.query(`
        INSERT INTO projects (client_id, service_type, status, created_at)
        SELECT $1, 'Identidade Visual', 'active', NOW()
        WHERE NOT EXISTS (SELECT 1 FROM projects WHERE client_id = $1 AND service_type = 'Identidade Visual')
      `, [clientId]);

      await pool.query(`DELETE FROM leads WHERE email = $1`, [email]);
    }
    console.log("Backfill Briefings IDV done.");

    const bInsta = await pool.query(`SELECT * FROM onboarding_respostas`);
    for (const row of bInsta.rows) {
      const email = row.email || (row.dados_completos && row.dados_completos.Email);
      const nome = row.nome_cliente || (row.dados_completos && row.dados_completos.Nome_Cliente) || 'Cliente Insta';
      const empresa = row.instagram || (row.dados_completos && row.dados_completos.Instagram) || '';
      
      if (!email) continue;

      let p = await pool.query(`SELECT id FROM profiles WHERE email = $1`, [email]);
      let clientId = p.rows.length > 0 ? p.rows[0].id : null;

      if (!clientId) {
        const res = await pool.query(`
          INSERT INTO profiles (id, email, nome, role, empresa)
          VALUES (gen_random_uuid(), $1, $2, 'client', $3)
          RETURNING id
        `, [email, nome, empresa]);
        clientId = res.rows[0].id;
      }

      await pool.query(`
        INSERT INTO projects (client_id, service_type, status, created_at)
        SELECT $1, 'Gestão de Instagram', 'active', NOW()
        WHERE NOT EXISTS (SELECT 1 FROM projects WHERE client_id = $1 AND service_type = 'Gestão de Instagram')
      `, [clientId]);

      await pool.query(`DELETE FROM leads WHERE email = $1`, [email]);
    }
    console.log("Backfill Briefings Insta done.");

  } catch(e) {
    console.error('Error in backfill', e);
  } finally {
    pool.end();
  }
}

backfill();
