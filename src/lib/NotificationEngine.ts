// src/lib/NotificationEngine.ts
import { supabase } from "./supabase";

export type NotificationType = 'info' | 'success' | 'warning' | 'action';

export class NotificationEngine {
  
  /**
   * 1. NOTIFICAÇÃO DIRECIONADA (1 para 1)
   * Útil para: "O seu post foi aprovado", "A sua fatura está disponível"
   */
  static async notifyUser(userId: string, title: string, message: string, type: NotificationType = 'info', link?: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        link
      });
    } catch (error) {
      console.error("Erro no NotificationEngine (User):", error);
    }
  }

  /**
   * 2. NOTIFICAÇÃO DE GESTÃO (Radar do Atelier)
   * Dispara para todos os Admins e Gestores simultaneamente.
   * Útil para: "Cliente aprovou o plano", "Cliente devolveu o briefing", "Novo T-NPS recebido"
   */
  static async notifyManagement(title: string, message: string, type: NotificationType = 'info', link?: string) {
    try {
      // Procura quem são os membros da liderança do estúdio
      const { data: team } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'gestor']);

      if (!team || team.length === 0) return;

      // Cria um lote (batch) de notificações
      const notifications = team.map(member => ({
        user_id: member.id,
        title,
        message,
        type,
        link
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error("Erro no NotificationEngine (Management):", error);
    }
  }

  /**
   * 3. NOTIFICAÇÃO GLOBAL (Broadcast)
   * Dispara para TODOS os clientes. O verdadeiro Mega-Fone do Admin.
   * Útil para: "Nova feature na plataforma", "Recesso de Natal", "Atualização de Termos"
   */
  static async broadcastToClients(title: string, message: string, type: NotificationType = 'info', link?: string) {
    try {
      const { data: clients } = await supabase
        .from('profiles')
        .select('id')
        .not('role', 'in', '("admin","gestor","colaborador")'); // Tudo o que não for equipa é cliente

      if (!clients || clients.length === 0) return;

      const notifications = clients.map(client => ({
        user_id: client.id,
        title,
        message,
        type,
        link
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error("Erro no NotificationEngine (Broadcast):", error);
    }
  }
}