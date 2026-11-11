// src/services/ReminderSchedulerService.ts
import { neon } from '@neondatabase/serverless';
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
      const sql = neon(process.env.POSTGRES_URL || '');

      // Busca tarefas ativas com responsável atribuído
      const tasks = await sql`
        SELECT 
          t.id, 
          t.title, 
          t.deadline, 
          t.assigned_to, 
          t.task_type, 
          t.sent_reminders,
          CASE 
            WHEN p.id IS NOT NULL THEN 
              json_build_object(
                'type', p.type, 
                'profiles', CASE 
                  WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) 
                  ELSE null 
                END
              ) 
            ELSE null 
          END as projects,
          CASE 
            WHEN a.id IS NOT NULL THEN json_build_object('name', a.name) 
            ELSE null 
          END as agency_subclients
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN profiles pr ON p.client_id = pr.id
        LEFT JOIN agency_subclients a ON t.subclient_id = a.id
        WHERE t.status != 'completed' 
          AND t.deadline IS NOT NULL 
          AND t.assigned_to IS NOT NULL
      `;

      if (!tasks) return;

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

        const sentReminders: string[] = Array.isArray(task.sent_reminders) ? task.sent_reminders : (task.sent_reminders ? JSON.parse(task.sent_reminders as any) : []);
        let reminderToTrigger: { key: string; label: string; isExact: boolean; notificationType?: string } | null = null;

        // Regras de disparo gerais: 24h e 12h para QUALQUER tarefa
        if (diffMinutes <= 1440 && diffMinutes > 720 && !sentReminders.includes('24h')) {
          reminderToTrigger = { key: '24h', label: 'em 24 horas', isExact: false, notificationType: 'deadline_24h' };
        } else if (diffMinutes <= 720 && diffMinutes > 120 && !sentReminders.includes('12h')) {
          reminderToTrigger = { key: '12h', label: 'em 12 horas', isExact: false, notificationType: 'deadline_12h' };
        } else if (isCaptacao || isReuniao) {
          // Regras de disparo específicas para reuniões e captações (curto prazo)
          if (diffMinutes <= 120 && diffMinutes > 60 && !sentReminders.includes('2h')) {
            reminderToTrigger = { key: '2h', label: 'em 2 horas', isExact: false, notificationType: isCaptacao ? 'captacao_reminder' : 'reuniao_reminder' };
          } else if (diffMinutes <= 60 && diffMinutes > 30 && !sentReminders.includes('1h')) {
            reminderToTrigger = { key: '1h', label: 'em 1 hora', isExact: false, notificationType: isCaptacao ? 'captacao_reminder' : 'reuniao_reminder' };
          } else if (diffMinutes <= 30 && diffMinutes > 0 && !sentReminders.includes('30m')) {
            reminderToTrigger = { key: '30m', label: 'em 30 minutos', isExact: false, notificationType: isCaptacao ? 'captacao_reminder' : 'reuniao_reminder' };
          } else if (diffMinutes <= 0 && diffMinutes >= -30 && !sentReminders.includes('0m')) {
            reminderToTrigger = { key: '0m', label: 'agora', isExact: true, notificationType: isCaptacao ? 'captacao_reminder' : 'reuniao_reminder' };
          }
        }

        if (!reminderToTrigger) continue;

        // Buscar e-mail do colaborador
        const collabData = await sql`SELECT email, nome FROM profiles WHERE id = ${task.assigned_to}`;
        const collab = collabData[0];
        if (!collab) continue;

        const rawTask: any = task;
        const subclientName = Array.isArray(rawTask.agency_subclients) ? rawTask.agency_subclients[0]?.name : rawTask.agency_subclients?.name;
        const projProfiles = Array.isArray(rawTask.projects) ? rawTask.projects[0]?.profiles : rawTask.projects?.profiles;
        const projName = Array.isArray(projProfiles) ? projProfiles[0]?.nome : projProfiles?.nome;
        const entityName = subclientName || projName || 'Atelier';
        
        let notificationTitle = `Lembrete: ${task.title}`;
        let notificationMessage = `A tarefa "${task.title}" (${entityName}) está prevista para ${reminderToTrigger.label}.`;

        if (reminderToTrigger.key === '24h') {
          notificationTitle = `⏳ [24h] Prazo de entrega: ${task.title}`;
          notificationMessage = `Faltam 24h para o prazo de entrega de "${task.title}" (${entityName}).`;
        } else if (reminderToTrigger.key === '12h') {
          notificationTitle = `🚨 [12h] Prazo crítico: ${task.title}`;
          notificationMessage = `Faltam 12h para o prazo de entrega de "${task.title}" (${entityName}).`;
        } else if (reminderToTrigger.isExact) {
          if (isCaptacao) {
            notificationTitle = `📸 Captação agora: ${task.title}`;
            notificationMessage = `Horário de captação de conteúdo para ${entityName}: "${task.title}".`;
          } else if (isReuniao) {
            notificationTitle = `🤝 Reunião agora: ${task.title}`;
            notificationMessage = `Horário de reunião para ${entityName}: "${task.title}".`;
          }
        }

        // 1. Notificação In-App
        await sql`
          INSERT INTO notifications (user_id, title, message, type, action_url, is_read)
          VALUES (${task.assigned_to}, ${notificationTitle}, ${notificationMessage}, ${reminderToTrigger.key === '12h' ? 'warning' : 'action'}, '/admin/jtbd', false)
        `;

        // 2. Notificação por E-mail (via NotificationService)
        if (collab.email) {
          await NotificationService.sendNotification({
            to: collab.email,
            type: reminderToTrigger.notificationType || 'custom',
            taskName: task.title,
            projectName: entityName,
            extraInfo: notificationMessage,
            link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/jtbd`
          });
        }

        // 3. Atualizar marcadores salvos
        const updatedReminders = [...sentReminders, reminderToTrigger.key];
        await sql`UPDATE tasks SET sent_reminders = ${JSON.stringify(updatedReminders)}::jsonb WHERE id = ${task.id}`;
        console.log(`[ReminderScheduler] Enviado lembrete (${reminderToTrigger.key}) para ${collab.email} - ${task.title}`);
      }
    } catch (err: any) {
      console.error('[ReminderScheduler Error]:', err.message || err);
    }
  }
}
