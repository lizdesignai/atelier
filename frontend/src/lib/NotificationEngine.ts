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
   * 🔔 ADIÇÃO TÁTICA: Dispara também um e-mail de aviso aos líderes.
   */
  static async notifyManagement(
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string
  ) {
    try {
      // 1. Encontra quem são os líderes do Atelier (trazemos também o email agora)
      const { data: managers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('role', ['admin', 'gestor']);

      if (fetchError) throw fetchError;
      if (!managers || managers.length === 0) return;

      // 2. Prepara o array (batch insert) de notificações para cada gestor no banco de dados
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

      // 4. NOVO: Disparo de E-mail (Fire and Forget - Não trava a UI se a API demorar)
      const managerEmails = managers.map(m => m.email).filter(email => email); // Garante que só pega emails válidos
      
      if (managerEmails.length > 0) {
        fetch('/api/emails/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: managerEmails,
            subject: title,
            body: message,
            actionUrl: actionUrl // Se não passar o host, o frontend já o monta (ou ajuste conforme necessário)
          })
        }).catch(err => console.log("Aviso silencioso: Falha no disparo de e-mail de notificação de Gestão", err));
      }

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