// src/lib/AtelierAutomationEngine.ts
import { supabase } from "./supabase";

export class AtelierAutomationEngine {
  
  /**
   * 📅 Utilitário: Subtrai dias úteis de uma data (Ignora Sábados e Domingos)
   */
  private static subtractWorkingDays(date: Date, daysToSubtract: number): Date {
    let result = new Date(date);
    let added = 0;
    while (added < daysToSubtract) {
      result.setDate(result.getDate() - 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        added++;
      }
    }
    return result;
  }

  /**
   * 🚀 1. SINCRONIZAR PLANEJAMENTO COM JTBD
   * Transforma posts aprovados/planejados em missões acionáveis no Kanban.
   * * @param projectId ID do Projeto do Cliente
   * @param creatorId ID de quem está a criar o planeamento
   * @param posts Array de posts { hook, briefing, date, type (design/video) }
   * @param daysBefore Prazo de entrega (quantos dias antes da postagem o design deve estar pronto? Padrão: 3)
   */
  static async syncPlanningToTasks(
    projectId: string, 
    creatorId: string, 
    posts: { hook: string; briefing: string; date: string; type: string }[], 
    daysBefore: number = 3
  ) {
    try {
      const tasksToInsert = posts.map(post => {
        const postDate = new Date(post.date);
        const deadline = this.subtractWorkingDays(postDate, daysBefore);

        return {
          project_id: projectId,
          creator_id: creatorId,
          title: `Hook: ${post.hook}`,
          description: `Briefing de Produção:\n${post.briefing}\n\nData de Publicação Alvo: ${postDate.toLocaleDateString('pt-BR')}`,
          task_type: post.type === 'video' ? 'video' : 'design',
          stage: 'Produção Ativa',
          status: 'pending',
          estimated_time: post.type === 'video' ? 120 : 60, // 2h para vídeo, 1h para estático
          deadline: deadline.toISOString(),
          urgency: false
        };
      });

      if (tasksToInsert.length > 0) {
        const { error } = await supabase.from('tasks').insert(tasksToInsert);
        if (error) throw error;
        console.log(`[AutoEngine] ${tasksToInsert.length} missões injetadas no JTBD com sucesso.`);
      }
    } catch (error) {
      console.error("[AutoEngine] Erro ao sincronizar planeamento:", error);
      throw error;
    }
  }

  /**
   * 🎯 2. AUTO-COMPLETE POR HOOK (Envio para Aprovação)
   * Disparado quando o gestor/designer envia o post para o cliente aprovar.
   * * @param projectId ID do Projeto
   * @param hook Título/Hook do post enviado
   * @param userId ID do utilizador que enviou (ganha a EXP e a autoria)
   */
  static async triggerPostApproval(projectId: string, hook: string, userId: string) {
    try {
      // 1. Localiza a tarefa pendente ou em progresso cujo título contenha o Hook
      const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', projectId)
        .ilike('title', `%${hook}%`) // ilike é case-insensitive no Supabase
        .in('status', ['pending', 'in_progress', 'review']);

      if (fetchError) throw fetchError;

      if (tasks && tasks.length > 0) {
        // Encontrou a tarefa correspondente. Vamos finalizá-la.
        const taskToComplete = tasks[0];
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            assigned_to: userId // Garante que a vitória vai para quem executou a ação
          })
          .eq('id', taskToComplete.id);

        if (updateError) throw updateError;
        
        console.log(`[AutoEngine] Tarefa do Hook "${hook}" auto-completada por ${userId}.`);
        
        // Dispara evento global para a UI atualizar (se o utilizador estiver no JTBD)
        window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
        window.dispatchEvent(new CustomEvent("showToast", { detail: "✨ Missão auto-completada pelo sistema!" }));
      }
    } catch (error) {
      console.error("[AutoEngine] Erro ao processar aprovação automática:", error);
    }
  }

  /**
   * 🤖 3. AUTO-COMPLETE GENÉRICO (Diário, Moderação, Planeamento)
   * Liquida tarefas previsíveis com base numa ação do sistema.
   * * @param projectId ID do Projeto
   * @param taskType Tipo da tarefa ('community', 'planning', 'copy')
   * @param userId ID do utilizador que executou a ação
   */
  static async triggerSystemAction(
    projectId: string, 
    taskType: 'community' | 'planning' | 'copy' | 'setup', 
    userId: string
  ) {
    try {
      // Procura a tarefa pendente mais antiga deste tipo neste projeto
      const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('task_type', taskType)
        .in('status', ['pending', 'in_progress'])
        .order('deadline', { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;

      if (tasks && tasks.length > 0) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            assigned_to: userId
          })
          .eq('id', tasks[0].id);

        if (updateError) throw updateError;
        
        console.log(`[AutoEngine] Ação de sistema (${taskType}) auto-completada por ${userId}.`);
        window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      }
    } catch (error) {
      console.error(`[AutoEngine] Erro na ação automática de ${taskType}:`, error);
    }
  }
}