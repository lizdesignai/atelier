"use server";

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getClientActiveProjectAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const data = await sql`
      SELECT * FROM projects
      WHERE client_id = ${user.id}
      AND status IN ('active', 'delivered', 'completed')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return data[0] || null;
  } catch (error) {
    console.error('[actions/clientProject] Erro:', error);
    throw new Error('Falha ao buscar projeto ativo');
  }
}
