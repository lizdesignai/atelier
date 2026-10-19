require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  const projs = await sql.query(`
    SELECT pr.id, pr.status, pr.type, p.nome
    FROM projects pr
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE pr.id IN (
      'dd581c84-fb59-41b2-a222-8d4c90f0dec4',
      '67e04d92-bb65-4ee7-a5b2-ee30e1d5acec',
      '5d4b1b63-835e-4b4f-a76c-fe073fd599f6',
      '3df725da-440c-4cc9-98c0-b04be1497d63'
    )
  `);
  console.table(projs);
})();
