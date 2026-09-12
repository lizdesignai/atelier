import { getDb } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function updatePassword() {
  try {
    const sql = getDb();
    const hash = await bcrypt.hash('Atelier2026!', 12);
    
    const result = await sql`
      UPDATE profiles 
      SET password_hash = ${hash} 
      WHERE email ILIKE '%igorc%' OR email ILIKE '%lizsacramentosa%'
      RETURNING email;
    `;
    
    console.log('Senhas atualizadas com sucesso para:', result);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updatePassword();
