const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function createTestUser() {
  try {
    const passwordHash = await bcrypt.hash('123456', 12);
    
    let res = await pool.query('SELECT id FROM profiles WHERE email = $1', ['teste@mapa.com']);
    let clientId;

    if (res.rows.length === 0) {
      res = await pool.query(`
        INSERT INTO profiles (id, email, nome, role, empresa, password_hash)
        VALUES (gen_random_uuid(), 'teste@mapa.com', 'Cliente Teste Mapa', 'client', 'Mapa Tester Corp', $1)
        RETURNING id
      `, [passwordHash]);
      clientId = res.rows[0].id;
    } else {
      clientId = res.rows[0].id;
      await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [passwordHash, clientId]);
    }

    // Create Project
    await pool.query(`
      INSERT INTO projects (client_id, service_type, status, created_at)
      SELECT $1, 'O Mapa', 'active', NOW()
      WHERE NOT EXISTS (SELECT 1 FROM projects WHERE client_id = $1 AND service_type = 'O Mapa')
    `, [clientId]);

    console.log("Usuário de teste criado com sucesso!");
    console.log("Login: teste@mapa.com");
    console.log("Senha: 123456");

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

createTestUser();
