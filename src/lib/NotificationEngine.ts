// src/lib/NotificationEngine.ts
import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';

export class NotificationEngine {
  
  /**
   * Dispara uma notificação para um utilizador específico (Cliente ou Colaborador)
   */
  static async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string
  ) {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        is_read: false
      });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyUser):', error);
    }
  }

  /**
   * Dispara uma notificação em massa para todos os Admins e Gestores (Avisos de Gestão)
   */
  static async notifyManagement(
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string
  ) {
    try {
      // 1. Encontra quem são os líderes do Atelier
      const { data: managers, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'gestor']);

      if (fetchError) throw fetchError;
      if (!managers || managers.length === 0) return;

      // 2. Prepara o array (batch insert) de notificações para cada gestor
      const notificationsToInsert = managers.map(manager => ({
        user_id: manager.id,
        title,
        message,
        type,
        action_url: actionUrl,
        is_read: false
      }));

      // 3. Dispara tudo de uma vez para otimizar requisições (Performance)
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyManagement):', error);
    }
  }

  /**
   * Marca uma notificação individual como lida
   */
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
    }
  }

  /**
   * Marca TODAS as notificações de um utilizador como lidas (Clean Slate)
   */
  static async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao limpar notificações:', error);
    }
  }
}