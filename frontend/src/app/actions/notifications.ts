'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getUnreadMessageCountAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    // Simula a RPC get_unread_message_count (no banco antigo devia contar algo nas mensagens ou notificações)
    // Exemplo: quantas notificações nâo lidas este usuário tem?
    const result = await sql`
      SELECT count(*) as count
      FROM notifications
      WHERE user_id = ${user.sub} AND is_read = false
    `;
    return result[0]?.count || 0;
  } catch (error) {
    console.error('[actions/notifications] Erro ao buscar count:', error);
    return 0; // Fallback seguro para UI
  }
}

export async function getNotificationsAction(limit = 20) {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const notifications = await sql`
      SELECT *
      FROM notifications
      WHERE user_id = ${user.sub}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return notifications;
  } catch (error) {
    console.error('[actions/notifications] Erro ao buscar notificações:', error);
    return [];
  }
}

export async function markNotificationReadAction(id: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    await sql`
      UPDATE notifications
      SET is_read = true
      WHERE id = ${id} AND user_id = ${user.sub}
    `;
    return true;
  } catch (error) {
    console.error('[actions/notifications] Erro ao atualizar:', error);
    return false;
  }
}