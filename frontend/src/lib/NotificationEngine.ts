// src/lib/NotificationEngine.ts
import { supabase } from './supabase';
import { isValidRealEmail as checkValidEmail } from './resend';
import type { StudioEmailTemplateData } from './serverNotifications';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';

export interface NotifyOptions {
  skipEmail?: boolean;
  skipInApp?: boolean;
  emailTemplateType?: string;
  extraData?: StudioEmailTemplateData;
  excludeUserId?: string;
}

export class NotificationEngine {
  /**
   * 🟢 UTILITÁRIO: Validação de Segurança de E-mail
   * Impede o disparo de APIs pagas para domínios de teste/fictícios.
   */
  public static isValidRealEmail(email: string | null | undefined): boolean {
    return checkValidEmail(email);
  }

  /**
   * Dispara uma notificação (In-App + E-mail via Resend) para um utilizador específico (Cliente, Colaborador ou Gestor).
   * Funciona tanto no Client-Side (Browser) quanto no Server-Side (API Routes / Cron).
   */
  static async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string,
    options?: NotifyOptions
  ) {
    if (!userId) return;

    try {
      // Execução no Servidor (API Routes / Server Actions / Cron)
      if (typeof window === 'undefined') {
        const { notifyUserOnServer } = await import('./serverNotifications');
        await notifyUserOnServer({
          userId,
          title,
          message,
          type,
          actionUrl,
          emailTemplateType: options?.emailTemplateType || 'custom',
          extraData: options?.extraData,
          skipEmail: options?.skipEmail ?? false,
          skipInApp: options?.skipInApp ?? false,
        });
        return;
      }

      // Execução no Browser (Client-Side) -> Centralizado via /api/notify (In-App + Resend)
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'user',
          userId,
          title,
          message,
          inAppType: type,
          actionUrl,
          type: options?.emailTemplateType || 'custom',
          skipEmail: options?.skipEmail ?? false,
          skipInApp: options?.skipInApp ?? false,
          ...(options?.extraData || {}),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('❌ Erro retornado por /api/notify (notifyUser):', errBody);
      }
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyUser):', error);
    }
  }

  /**
   * Dispara uma notificação em massa para todos os Admins e Gestores ativos (In-App + E-mail via Resend).
   * Funciona tanto no Client-Side (Browser) quanto no Server-Side (API Routes / Cron).
   */
  static async notifyManagement(
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string,
    options?: NotifyOptions
  ) {
    try {
      // Execução no Servidor (API Routes / Server Actions / Cron)
      if (typeof window === 'undefined') {
        const { notifyManagementOnServer } = await import('./serverNotifications');
        await notifyManagementOnServer({
          title,
          message,
          type,
          actionUrl: actionUrl || '/admin/fio',
          emailTemplateType: options?.emailTemplateType || 'custom',
          extraData: options?.extraData,
          excludeUserId: options?.excludeUserId,
          skipEmail: options?.skipEmail ?? false,
        });
        return;
      }

      // Execução no Browser (Client-Side) -> Centralizado via /api/notify
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'management',
          notifyManagement: true,
          title,
          message,
          inAppType: type,
          actionUrl: actionUrl || '/admin/fio',
          type: options?.emailTemplateType || 'custom',
          excludeUserId: options?.excludeUserId,
          skipEmail: options?.skipEmail ?? false,
          ...(options?.extraData || {}),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('❌ Erro retornado por /api/notify (notifyManagement):', errBody);
      }
    } catch (error) {
      console.error('❌ Erro no NotificationEngine (notifyManagement):', error);
    }
  }

  /**
   * Dispara uma notificação para um Usuário específico com template de e-mail dedicado (In-App + E-mail).
   */
  static async notifyUserWithEmail(
    userId: string,
    title: string,
    message: string,
    emailTemplateType: string,
    extraData: any = {}
  ) {
    if (!userId) return;

    await this.notifyUser(userId, title, message, 'action', extraData?.link, {
      emailTemplateType: emailTemplateType || 'custom',
      extraData,
      skipEmail: false,
    });
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
        extraInfo: snippet,
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
        extraInfo: snippet,
      }
    );
  }

  /**
   * Marca uma notificação individual como lida
   */
  static async markAsRead(notificationId: string) {
    try {
      if (typeof window === 'undefined') {
        const { getDb } = await import('./db');
        const sql = getDb();
        await sql`UPDATE notifications SET is_read = true WHERE id = ${notificationId}`;
        return;
      }

      const { error } = await (supabase.from('notifications') as any)
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
      if (typeof window === 'undefined') {
        const { getDb } = await import('./db');
        const sql = getDb();
        await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId} AND is_read = false`;
        return;
      }

      const { error } = await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao limpar notificações:', error);
    }
  }
}
