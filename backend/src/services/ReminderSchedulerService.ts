// src/services/ReminderSchedulerService.ts
import { supabase } from '../config/supabase';
import { NotificationService } from './NotificationService';

export class ReminderSchedulerService {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 60000) {
    if (this.intervalId) return;
    console.log('[ReminderScheduler] Serviço de lembretes automáticos iniciado (intervalo: 1 min)');
    
    // Executa a primeira checagem após 5 segundos da inicialização
    setTimeout(() => {
      this.checkAndSendReminders();
    }, 5000);

    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, intervalMs);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static async checkAndSendReminders() {
    try {
      const now = new Date();

      // Busca tarefas ativas com responsável atribuído
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, deadline, assigned_to, task_type, sent_reminders, projects(type, profiles(nome)), agency_subclients(name)')
        .neq('status', 'completed')
        .not('deadline', 'is', null)
        .not('assigned_to', 'is', null);

      if (error || !tasks) return;

      for (const task of tasks) {
        if (!task.deadline || !task.assigned_to) continue;

        const titleLower = (task.title || '').toLowerCase();
        const typeLower = (task.task_type || '').toLowerCase();
        const isCaptacao = typeLower === 'captacao' || titleLower.includes('captação') || titleLower.includes('captacao');
        const isReuniao = typeLower === 'reuniao' || titleLower.includes('reunião') || titleLower.includes('reuniao');

        if (!isCaptacao && !isReuniao) continue;

        const deadlineDate = new Date(task.deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        const sentReminders: string[] = Array.isArray(task.sent_reminders) ? task.sent_reminders : [];
        let reminderToTrigger: { key: string; label: string; isExact: boolean } | null = null;

        // Regras de disparo: 2h (-120m), 1h (-60m), 30m (-30m) e Na Hora (0m)
        if (diffMinutes <= 120 && diffMinutes > 60 && !sentReminders.includes('2h')) {
          reminderToTrigger = { key: '2h', label: 'em 2 horas', isExact: false };
        } else if (diffMinutes <= 60 && diffMinutes > 30 && !sentReminders.includes('1h')) {
          reminderToTrigger = { key: '1h', label: 'em 1 hora', isExact: false };
        } else if (diffMinutes <= 30 && diffMinutes > 0 && !sentReminders.includes('30m')) {
          reminderToTrigger = { key: '30m', label: 'em 30 minutos', isExact: false };
        } else if (diffMinutes <= 0 && diffMinutes >= -30 && !sentReminders.includes('0m')) {
          reminderToTrigger = { key: '0m', label: 'agora', isExact: true };
        }

        if (!reminderToTrigger) continue;

        // Buscar e-mail do colaborador
        const { data: collab } = await supabase.from('profiles').select('email, nome').eq('id', task.assigned_to).single();
        if (!collab) continue;

        const rawTask: any = task;
        const subclientName = Array.isArray(rawTask.agency_subclients) ? rawTask.agency_subclients[0]?.name : rawTask.agency_subclients?.name;
        const projProfiles = Array.isArray(rawTask.projects) ? rawTask.projects[0]?.profiles : rawTask.projects?.profiles;
        const projName = Array.isArray(projProfiles) ? projProfiles[0]?.nome : projProfiles?.nome;
        const entityName = subclientName || projName || 'Atelier';
        const eventType = isCaptacao ? 'Captação' : 'Reunião';
        
        let notificationTitle = `[LEMBRETE] ${eventType}: ${task.title}`;
        let notificationMessage = `Olá ${collab.nome || 'colaborador'}, a sua ${eventType.toLowerCase()} "${task.title}" (${entityName}) está agendada para ${reminderToTrigger.label}.`;

        if (reminderToTrigger.isExact) {
          if (isCaptacao) {
            notificationTitle = `📸 BOA CAPTAÇÃO! ${task.title}`;
            notificationMessage = `Chegou a hora! Boa captação para o cliente ${entityName}. Que a sessão seja um excelente sucesso! 📸✨`;
          } else {
            notificationTitle = `🤝 BOA REUNIÃO! ${task.title}`;
            notificationMessage = `Chegou a hora! Boa reunião para o projeto ${entityName}. Excelente alinhamento para todos! 🤝✨`;
          }
        }

        // 1. Notificação In-App
        await supabase.from('notifications').insert({
          user_id: task.assigned_to,
          title: notificationTitle,
          message: notificationMessage,
          type: reminderToTrigger.isExact ? 'success' : 'warning',
          action_url: '/admin/jtbd',
          is_read: false
        });

        // 2. Notificação por E-mail (via NotificationService)
        if (collab.email) {
          await NotificationService.sendNotification({
            to: collab.email,
            type: isCaptacao ? 'captacao_reminder' : 'reuniao_reminder',
            taskName: task.title,
            projectName: entityName,
            extraInfo: notificationMessage,
            link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/jtbd`
          });
        }

        // 3. Atualizar marcadores salvos
        const updatedReminders = [...sentReminders, reminderToTrigger.key];
        await supabase.from('tasks').update({ sent_reminders: updatedReminders }).eq('id', task.id);
        console.log(`[ReminderScheduler] Enviado lembrete (${reminderToTrigger.key}) para ${collab.email} - ${task.title}`);
      }
    } catch (err: any) {
      console.error('[ReminderScheduler Error]:', err.message || err);
    }
  }
}
