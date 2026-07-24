// src/lib/NotificationEngine.ts
import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';

export class NotificationEngine {
  
  /**
   * 🟢 UTILITÁRIO: Validação de Segurança de E-mail
   * Impede o disparo de APIs pagas para domínios de teste/fictícios.
   */
  private static isValidRealEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    
    // Lista de domínios fictícios que estamos usando em ambiente de homologação
    const fakeDomains = ['gestor.com', 'admin.com', 'teste.com', 'example.com', 'atelier.local'];
    const domain = email.split('@')[1];
    
    // Retorna true apenas se o e-mail for válido e não pertencer à lista de fakes
    return email.includes('@') && !fakeDomains.includes(domain);
  }

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
        .select('id, email')
        .in('role', ['admin', 'gestor']);

      if (fetchError) throw fetchError;
      if (!managers || managers.length === 0) return;

      // 2. Prepara o array (batch insert) de notificações no banco (In-App)
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

      // 4. DISPARO DE E-MAIL (Blindado contra e-mails fictícios e com Rota Corrigida)
      // O filtro garante que só tentaremos enviar para e-mails reais (ex: @gmail.com, domínio da agência)
      const validManagerEmails = managers
        .map(m => m.email)
        .filter(this.isValidRealEmail); 
      
      if (validManagerEmails.length > 0) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: validManagerEmails,
            type: 'custom', // 🟢 Informa ao Orquestrador que é uma mensagem dinâmica
            subject: title,
            body: message,
            link: actionUrl
          })
        }).catch(err => console.log("Aviso silencioso: Falha no disparo de e-mail de notificação de Gestão", err));
      } else {
        console.warn("⚠️ NotificationEngine: Disparo de e-mail cancelado. Nenhum gestor possui um e-mail válido/real configurado.");
      }

    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyManagement):', error);
    }
  }

  /**
   * Dispara uma notificação para um Colaborador específico (In-App e E-mail)
   */
  static async notifyCollaboratorWithEmail(
    userId: string,
    title: string,
    message: string,
    emailTemplateType: string,
    extraData: any = {}
  ) {
    try {
      // 1. Envia notificação in-app
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type: 'action',
        action_url: extraData.link || '/admin/jtbd',
        is_read: false
      });

      if (error) throw error;

      // 2. Busca e-mail real do colaborador
      const { data: collab } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (collab && this.isValidRealEmail(collab.email)) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: collab.email,
            type: emailTemplateType, 
            subject: title,
            body: message,
            link: extraData.link || '/admin/jtbd',
            taskName: extraData.taskName,
            projectName: extraData.projectName,
            extraInfo: extraData.extraInfo
          })
        }).catch(err => console.log("Aviso silencioso: Falha no disparo de e-mail para colaborador", err));
      }
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyCollaboratorWithEmail):', error);
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