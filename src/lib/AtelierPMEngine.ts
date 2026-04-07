// src/lib/AtelierPMEngine.ts
import { supabase } from './supabase';
import { 
  addBusinessDays, 
  differenceInBusinessDays, 
  differenceInHours,
  endOfDay,
  addDays
} from 'date-fns';

// ============================================================================
// UTILITÁRIO DE BLINDAGEM TYPE-SAFE (Resolve o conflito de Arrays do Supabase)
// ============================================================================
function extractNode<T>(node: any): T | null {
  if (!node) return null;
  return (Array.isArray(node) ? node[0] : node) as T;
}

export class AtelierPMEngine {
  // Parâmetros de Risco e Capacidade (Lean Six Sigma / Wall Street PM)
  private static MAX_DAILY_CAPACITY_MINUTES = 480; // 8 horas
  private static BURNOUT_THRESHOLD_MINUTES = 900;  // 15 horas
  private static CONTEXT_SWITCH_BONUS = 60;        // Bónus de 1h se já estiver no projeto

  /**
   * ============================================================================
   * 1. LOAD BALANCING (Otimização de Capacidade e Foco)
   * ============================================================================
   */
  static async getOptimalAssignee(taskType: string, projectId: string, defaultAssigneeId: string | null, estimatedMinutes: number = 60): Promise<string | null> {
    try {
      const { data: team } = await supabase.from('profiles').select('id, skills').in('role', ['admin', 'gestor', 'colaborador']);
      if (!team || team.length === 0) return defaultAssigneeId;

      const skilledMembers = team.filter(m => m.skills && m.skills.includes(taskType));
      const candidates = skilledMembers.length > 0 ? skilledMembers : team;

      let bestCandidateId = defaultAssigneeId;
      let lowestEffectiveLoad = Number.MAX_VALUE;

      for (const candidate of candidates) {
        const { data: pendingTasks } = await supabase
          .from('tasks')
          .select('project_id, estimated_time')
          .eq('assigned_to', candidate.id)
          .in('status', ['pending', 'in_progress']);

        let rawLoad = 0;
        let hasContext = false;

        pendingTasks?.forEach(t => {
          rawLoad += (t.estimated_time || 60);
          if (t.project_id === projectId) hasContext = true;
        });

        const effectiveLoad = hasContext ? Math.max(0, rawLoad - this.CONTEXT_SWITCH_BONUS) : rawLoad;

        if (effectiveLoad < lowestEffectiveLoad) {
          lowestEffectiveLoad = effectiveLoad;
          bestCandidateId = candidate.id;
        }
      }

      if (defaultAssigneeId && bestCandidateId !== defaultAssigneeId) {
        const defaultTasks = await supabase.from('tasks').select('estimated_time').eq('assigned_to', defaultAssigneeId).in('status', ['pending', 'in_progress']);
        const defaultLoad = defaultTasks.data?.reduce((acc, t) => acc + (t.estimated_time || 60), 0) || 0;
        
        if (defaultLoad + estimatedMinutes > this.BURNOUT_THRESHOLD_MINUTES) {
          console.warn(`[PM Engine] Bypass Preventivo: ${defaultAssigneeId} próximo do Burnout. Redirecionado para ${bestCandidateId}.`);
          return bestCandidateId;
        }
      }

      return defaultAssigneeId || bestCandidateId;
    } catch (error) {
      console.error("[PM Engine] Erro no Load Balancing:", error);
      return defaultAssigneeId;
    }
  }

  /**
   * ============================================================================
   * 2. SMART SCHEDULING (Critical Chain Method - CCPM)
   * ============================================================================
   */
  static generateSmartSchedule(tasks: any[], startDate: Date, endDate: Date): any[] {
    const totalBusinessDays = differenceInBusinessDays(endDate, startDate);
    
    const executionDays = Math.max(1, Math.floor(totalBusinessDays * 0.8)); 
    const step = Math.max(1, Math.floor(executionDays / tasks.length));

    let currentDate = startDate;
    
    return tasks.map((task, index) => {
      currentDate = addBusinessDays(currentDate, step);
      return {
        ...task,
        deadline: currentDate.toISOString(),
        temp_dependency_index: index > 0 ? index - 1 : null,
        is_blocked: index > 0 
      };
    });
  }

  static async unlockDependencies(completedTaskId: string) {
    try {
      const { error } = await supabase.from('tasks').update({ is_blocked: false }).eq('depends_on', completedTaskId);
      if (error) throw error;
    } catch (error) {
      console.error("[PM Engine] Erro ao libertar fluxo:", error);
    }
  }

  /**
   * ============================================================================
   * 3. RISK MITIGATION (Schedule Performance Index - SPI Tracker)
   * ============================================================================
   */
  static async runDailyRiskMitigation(adminId: string) {
    try {
      const now = new Date();
      const next48h = addDays(now, 2);

      const { data: urgentTasks } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, estimated_time, deadline, profiles!assigned_to(nome)')
        .neq('status', 'completed')
        .lte('deadline', next48h.toISOString())
        .not('assigned_to', 'is', null);

      if (!urgentTasks) return;

      const dangerMap: Record<string, { name: string, totalMinutes: number, tasks: number }> = {};
      
      urgentTasks.forEach((t: any) => {
        const profileObj = extractNode<{ nome: string }>(t.profiles);
        const name = profileObj?.nome || "Membro Desconhecido";

        if (!dangerMap[t.assigned_to]) dangerMap[t.assigned_to] = { name, totalMinutes: 0, tasks: 0 };
        dangerMap[t.assigned_to].totalMinutes += (t.estimated_time || 60);
        dangerMap[t.assigned_to].tasks += 1;
      });

      for (const [assigneeId, data] of Object.entries(dangerMap)) {
        if (data.totalMinutes > this.MAX_DAILY_CAPACITY_MINUTES) {
          await supabase.from('tasks').insert({
            project_id: null, 
            assigned_to: adminId,
            title: `🚨 Gargalo Eminente (SPI < 1): ${data.name}`,
            description: `Alerta Vermelho: ${data.name} acumula ${(data.totalMinutes / 60).toFixed(1)}h de esforço crítico a vencer nas próximas 48h. Intervenção exigida para evitar rutura da cadeia de entrega.`,
            urgency: true,
            status: 'pending',
            stage: 'Mitigação de Risco',
            task_type: 'setup',
            deadline: endOfDay(now).toISOString()
          });
        }
      }
    } catch (error) {
      console.error("[PM Engine] Falha no radar de mitigação:", error);
    }
  }

  /**
   * ============================================================================
   * 4. DAILY TRIAGE (WSJF - Weighted Shortest Job First)
   * ============================================================================
   */
  static async prioritizeDailyTriage(collaboratorId: string) {
    try {
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('id, urgency, deadline, estimated_time, is_blocked, projects(financial_value)')
        .eq('assigned_to', collaboratorId)
        .in('status', ['pending', 'in_progress']);

      if (!myTasks) return;

      const now = new Date();

      for (const task of myTasks as any[]) {
        if (task.is_blocked) {
          await supabase.from('tasks').update({ priority_score: -9999 }).eq('id', task.id);
          continue;
        }

        const projObj = extractNode<{ financial_value: number }>(task.projects);
        const ltvValue = projObj?.financial_value || 0;
        
        let costOfDelay = 0;
        if (task.urgency) costOfDelay += 1000;
        costOfDelay += (ltvValue * 0.1); 

        const hoursLeft = differenceInHours(new Date(task.deadline), now);
        if (hoursLeft <= 0) costOfDelay += 2000;      
        else if (hoursLeft <= 24) costOfDelay += 800; 
        else if (hoursLeft <= 72) costOfDelay += 300; 

        const jobSizeMinutes = task.estimated_time || 60;
        const wsjfScore = Math.round((costOfDelay / jobSizeMinutes) * 100);

        await supabase.from('tasks').update({ priority_score: wsjfScore }).eq('id', task.id);
      }
      console.log(`[PM Engine] Triagem Diária efetuada para o colaborador ${collaboratorId}`);
    } catch (error) {
      console.error("[PM Engine] Erro na indexação WSJF:", error);
    }
  }

  /**
   * ============================================================================
   * 5. PONTO DE INTERVENÇÃO 3: AUTOMAÇÃO DE APROVAÇÃO & GAMIFICAÇÃO
   * ============================================================================
   */
  static async triggerPostApproval(hookTitle: string, userId: string) {
    try {
      if (!hookTitle) return;

      const { data: tasks, error: searchError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('assigned_to', userId)
        .ilike('title', `%${hookTitle}%`) 
        .in('status', ['pending', 'in_progress', 'review'])
        .limit(1);

      if (searchError) throw searchError;
      
      if (tasks && tasks.length > 0) {
        const taskId = tasks[0].id;
        const now = new Date().toISOString();

        await supabase
          .from('tasks')
          .update({ 
            status: 'completed', 
            completed_at: now 
          })
          .eq('id', taskId);

        if (this.unlockDependencies) {
          await this.unlockDependencies(taskId);
        }

        await this.applyGamification(userId, 50); 
        
        console.log(`[Motor] Tarefa "${hookTitle}" automatizada para Concluída. Gamificação Aplicada!`);
      }
    } catch (error) {
      console.error("[Motor] Erro na automação de aprovação:", error);
    }
  }

  /**
   * ============================================================================
   * 6. PONTOS DE INTERVENÇÃO 4 E 5: GATILHOS GENÉRICOS DE SISTEMA 
   * ============================================================================
   * Centraliza ações do sistema para macro-tarefas ou tarefas diárias.
   */
  static async triggerSystemAction(projectId: string, actionType: string, userId: string) {
    try {
      if (!projectId || !userId) return;

      // -------------------------------------------------------------
      // PONTO DE INTERVENÇÃO 5: PLANEAMENTO MENSAL
      // -------------------------------------------------------------
      if (actionType === 'planning') {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('project_id', projectId)
          .eq('assigned_to', userId)
          .in('status', ['pending', 'in_progress', 'review'])
          .or('title.ilike.%planejamento%,title.ilike.%planeamento%,title.ilike.%estratégia%')
          .limit(1);

        if (error) throw error;

        if (tasks && tasks.length > 0) {
          const taskId = tasks[0].id;
          const now = new Date().toISOString();
          
          await supabase.from('tasks').update({ status: 'completed', completed_at: now }).eq('id', taskId);

          if (this.unlockDependencies) await this.unlockDependencies(taskId);
          
          await this.applyGamification(userId, 100); 
          
          console.log(`[Motor] Macro-Tarefa de Planeamento automatizada para Concluída! Bónus de 100 EXP.`);
        }
      } 
      // -------------------------------------------------------------
      // PONTO DE INTERVENÇÃO 4: DIÁRIO DE BORDO / COMUNIDADE
      // -------------------------------------------------------------
      else if (actionType === 'community') {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('project_id', projectId)
          .eq('assigned_to', userId)
          .in('status', ['pending', 'in_progress', 'review'])
          // Apanha variações comuns para tarefas de comunidade/relatório diário
          .or('title.ilike.%moderação da comunidade%,title.ilike.%diário de bordo%,title.ilike.%relatório diário%')
          .limit(1);

        if (error) throw error;

        if (tasks && tasks.length > 0) {
          const taskId = tasks[0].id;
          const now = new Date().toISOString();
          
          // Marca a tarefa diária como concluída
          await supabase.from('tasks').update({ status: 'completed', completed_at: now }).eq('id', taskId);

          // Liberta a próxima etapa (mesmo sendo raro em tarefas diárias, é uma boa prática)
          if (this.unlockDependencies) await this.unlockDependencies(taskId);
          
          // Aplica o bónus de rotina diária (30 EXP)
          await this.applyGamification(userId, 30); 
          
          console.log(`[Motor] Tarefa de Comunidade/Diário automatizada para Concluída! Bónus de 30 EXP.`);
        }
      }
    } catch (error) {
      console.error(`[Motor] Erro ao engatilhar System Action (${actionType}):`, error);
    }
  }

  /**
   * ============================================================================
   * 7. OVERWRITE DINÂMICO DE TAREFAS (SINCRONIZAÇÃO DE CONTEÚDO)
   * ============================================================================
   */
  static async syncTaskContent(projectId: string, originalTaskName: string, newTitle: string, descriptionText: string) {
    try {
      if (!projectId || !originalTaskName || !newTitle) return;

      const { data: tasks, error: searchError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)
        .ilike('title', `%${originalTaskName}%`) 
        .in('status', ['pending', 'in_progress', 'review']) 
        .limit(1);

      if (searchError) throw searchError;

      if (tasks && tasks.length > 0) {
        const taskId = tasks[0].id;

        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            title: newTitle, 
            description: descriptionText 
          })
          .eq('id', taskId);

        if (updateError) throw updateError;
        
        console.log(`[Motor] OVERWRITE SUCESSO: Tarefa "${originalTaskName}" renomeada para "${newTitle}".`);
      } else {
        console.warn(`[Motor] OVERWRITE AVISO: Tarefa genérica "${originalTaskName}" não encontrada no JTBD para este projeto.`);
      }
    } catch (error) {
      console.error(`[Motor] Erro ao sincronizar conteúdo da tarefa ${originalTaskName}:`, error);
    }
  }

  /**
   * ============================================================================
   * 8. GAMIFICATION ENGINE (Recompensas de Performance)
   * ============================================================================
   */
  private static async applyGamification(userId: string, expAmount: number) {
    try {
      const { data: perf } = await supabase
        .from('team_performance')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (perf) {
        await supabase.from('team_performance').update({
          exp_points: (perf.exp_points || 0) + expAmount,
          total_tasks_completed: (perf.total_tasks_completed || 0) + 1
        }).eq('user_id', userId);
      }
    } catch (error) {
      console.error("[PM Engine] Erro ao aplicar Gamificação:", error);
    }
  }

  /**
   * ============================================================================
   * 9. CALIBRAÇÃO (Earned Value Management - EVM Loop)
   * ============================================================================
   */
  static async calibrateUnitEconomics(adminId: string) {
    try {
      const thirtyDaysAgo = addDays(new Date(), -30).toISOString();

      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('title, task_type, estimated_time, actual_time')
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo);

      if (!completedTasks || completedTasks.length === 0) return;

      const metricsMap: Record<string, { count: number, totalEst: number, totalAct: number }> = {};

      completedTasks.forEach(t => {
        const key = t.title || t.task_type;
        if (!key) return;
        if (!metricsMap[key]) metricsMap[key] = { count: 0, totalEst: 0, totalAct: 0 };
        
        metricsMap[key].count += 1;
        metricsMap[key].totalEst += (t.estimated_time || 60);
        metricsMap[key].totalAct += (t.actual_time || 60);
      });

      for (const [taskName, data] of Object.entries(metricsMap)) {
        if (data.count >= 5) {
          const avgEst = data.totalEst / data.count;
          const avgAct = data.totalAct / data.count;

          if (avgAct > avgEst * 1.3) {
            await supabase.from('tasks').insert({
              project_id: null,
              assigned_to: adminId,
              title: `⚙️ Desvio de EVM: ${taskName}`,
              description: `Anotação do Motor: A tarefa "${taskName}" orçada em ${avgEst.toFixed(0)}m está a consumir ${avgAct.toFixed(0)}m reais (Amostra: ${data.count}). Ajuste o Dicionário de Base para proteger o lucro da agência.`,
              urgency: false,
              status: 'pending',
              stage: 'Otimização Sistémica',
              task_type: 'setup',
              deadline: addBusinessDays(new Date(), 5).toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error("[PM Engine] Erro na calibração EVM:", error);
    }
  }
}