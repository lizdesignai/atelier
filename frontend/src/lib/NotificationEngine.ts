// src/lib/NotificationEngine.ts
import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';

export class NotificationEngine {
  
  /**
   * 🟢 UTILITÁRIO: Base URL para Chamadas de API e E-mails
   */
  private static getBaseUrl(): string {
    if (typeof window !== 'undefined') return '';
    return process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://atelier.lizdesign.com.br';
  }

  /**
   * 🟢 UTILITÁRIO: Validação de Segurança de E-mail
   * Impede o disparo de APIs pagas para domínios de teste/fictícios.
   */
  public static isValidRealEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || !trimmed.includes('.')) return false;
    
    // Lista de domínios fictícios que estamos usando em ambiente de homologação
    const fakeDomains = ['teste.com', 'example.com', 'atelier.local'];
    const domain = trimmed.split('@')[1];
    
    // Retorna true apenas se o e-mail for válido e não pertencer à lista de fakes
    return Boolean(domain && !fakeDomains.includes(domain));
  }

  /**
   * Dispara uma notificação in-app para um utilizador específico (Cliente ou Colaborador)
   */
  static async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string
  ) {
    try {
      const { error } = await (supabase.from('notifications') as any).insert({
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
      const { data: managers, error: fetchError } = await (supabase
        .from('profiles') as any)
        .select('id, email, nome')
        .in('role', ['admin', 'gestor']);

      if (fetchError) throw fetchError;
      if (!managers || managers.length === 0) return;

      // 2. Prepara o array (batch insert) de notificações no banco (In-App)
      const notificationsToInsert = managers.map((manager: any) => ({
        user_id: manager.id,
        title,
        message,
        type,
        action_url: actionUrl || '/admin/fio',
        is_read: false
      }));

      // 3. Dispara no banco (In-App)
      const { error: insertError } = await (supabase
        .from('notifications') as any)
        .insert(notificationsToInsert);

      if (insertError) throw insertError;

      // 4. DISPARO DE E-MAIL (Blindado contra e-mails fictícios)
      const validManagerEmails = managers
        .map((m: any) => m.email)
        .filter(this.isValidRealEmail); 
      
      if (validManagerEmails.length > 0) {
        const baseUrl = this.getBaseUrl();
        const res = await fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: validManagerEmails,
            type: 'custom',
            subject: title,
            body: message,
            link: actionUrl || '/admin/fio'
          })
        }).catch(err => {
          console.error("❌ Falha na requisição /api/notify para Gestão:", err);
          return null;
        });

        if (res && !res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error("❌ Erro retornado por /api/notify (Gestão):", errBody);
        }
      } else {
        console.warn("⚠️ NotificationEngine: Nenhum gestor possui um e-mail válido configurado.");
      }

    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyManagement):', error);
    }
  }

  /**
   * Dispara uma notificação para um Usuário específico (In-App e E-mail)
   */
  static async notifyUserWithEmail(
    userId: string,
    title: string,
    message: string,
    emailTemplateType: string,
    extraData: any = {}
  ) {
    try {
      // 1. Envia notificação in-app
      const { error } = await (supabase.from('notifications') as any).insert({
        user_id: userId,
        title,
        message,
        type: 'action',
        action_url: extraData.link || '/canais',
        is_read: false
      });

      if (error) throw error;

      // 2. Busca e-mail do destinatário
      const { data: targetUser } = await (supabase
        .from('profiles') as any)
        .select('email, role, nome')
        .eq('id', userId)
        .single();

      if (targetUser && this.isValidRealEmail(targetUser.email)) {
        const baseUrl = this.getBaseUrl();
        const res = await fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetUser.email,
            type: emailTemplateType, 
            subject: title,
            body: message,
            link: extraData.link || (targetUser.role === 'client' || targetUser.role === 'cliente' ? '/cockpit' : '/admin/fio'),
            clientName: extraData.clientName,
            taskName: extraData.taskName,
            projectName: extraData.projectName,
            extraInfo: extraData.extraInfo
          })
        }).catch(err => {
          console.error("❌ Falha na requisição /api/notify para usuário:", err);
          return null;
        });

        if (res && !res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error("❌ Erro retornado por /api/notify (Usuário):", errBody);
        }
      }
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyUserWithEmail):', error);
    }
  }

  /**
   * Notificação de Menção na Sintonia
   */
  static async notifySintoniaMention(
    targetUserId: string,
    senderName: string,
    channelName: string,
    snippet: string,
    channelId: string,
    isClient: boolean = false
  ) {
    const link = isClient ? '/cockpit' : `/admin/fio?channel=${channelId}`;
    await this.notifyUserWithEmail(
      targetUserId,
      `[Sintonia] ${senderName} mencionou você`,
      `Você foi mencionado por <strong>${senderName}</strong> no canal <strong>#${channelName}</strong>.`,
      'sintonia_mention',
      {
        link,
        clientName: senderName,
        projectName: channelName,
        extraInfo: snippet
      }
    );
  }

  /**
   * Notificação de Mensagem Direta (DM) na Sintonia
   */
  static async notifySintoniaDM(
    targetUserId: string,
    senderName: string,
    snippet: string,
    channelId: string
  ) {
    await this.notifyUserWithEmail(
      targetUserId,
      `[Sintonia] Nova mensagem de ${senderName}`,
      `<strong>${senderName}</strong> enviou uma mensagem direta na Sintonia: <em>"${snippet}"</em>`,
      'sintonia_dm',
      {
        link: `/admin/fio?channel=${channelId}`,
        clientName: senderName,
        extraInfo: snippet
      }
    );
  }

  /**
   * Marca uma notificação individual como lida
   */
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await (supabase
        .from('notifications') as any)
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
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao limpar notificações:', error);
    }
  }
}
