// src/lib/AtelierPMEngine.ts
import { supabase } from './supabase';
import { 
  addBusinessDays, 
  differenceInBusinessDays, 
  differenceInHours,
  endOfDay,
  addDays,
  differenceInDays,
  startOfMonth,
  addMonths,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationEngine } from './NotificationEngine';

// ============================================================================
// UTILITÁRIO DE BLINDAGEM TYPE-SAFE
// ============================================================================
function extractNode<T>(node: any): T | null {
  if (!node) return null;
  return (Array.isArray(node) ? node[0] : node) as T;
}

export class AtelierPMEngine {
  // ============================================================================
  // 🚀 MAGIC NUMBERS -> CONSTANTES DE CONFIGURAÇÃO GERAL
  // ============================================================================
  public static CONFIG = {
    CAPACITY: {
      DAILY_MAX_MINUTES: 480,       
      BURNOUT_THRESHOLD: 900,       
      CONTEXT_SWITCH_BONUS: 60      
    },
    EVM: {
      MIN_SAMPLE_SIZE: 5,           
      POSITIVE_DEVIATION: 0.7,      
      NEGATIVE_DEVIATION: 1.3       
    },
    WSJF: {
      BASE_URGENCY: 1000,
      LTV_WEIGHT: 0.1,
      LATE_PENALTY: 2000,           
      TODAY_PENALTY: 800,           
      SHORT_TERM_PENALTY: 300       
    },
    CCPM: {
      EXECUTION_RATIO: 0.8,         
      BUFFER_WARNING: 75            
    },
    GAMIFICATION: {
      MACRO_TASK: 100,              
      MICRO_TASK: 50,               
      DAILY_ROUTINE: 30             
    }
  };

  /**
   * ============================================================================
   * 0.0 PONTE DE PRODUÇÃO (Approved Planning -> JTBD Tasks)
   * ============================================================================
   */
  static async deployApprovedPlanningToTasks(planningId: string, projectId: string, adminId?: string) {
    try {
      console.log(`[PM Engine] Iniciando Deploy do Planejamento Aprovado: ${planningId}`);

      const { data: planning, error: planningError } = await supabase
        .from('content_planning')
        .select('*')
        .eq('id', planningId)
        .single();

      if (planningError || !planning) throw new Error("Planejamento não encontrado.");

      const { data: routingRules } = await supabase
        .from('routing_rules')
        .select('task_type, assignee_id')
        .eq('project_id', projectId);

      const rulesMap: Record<string, string> = {};
      if (routingRules) {
        routingRules.forEach(r => {
          if (r.assignee_id) rulesMap[r.task_type] = r.assignee_id;
        });
      }

      const newTasks = [];
      const now = new Date();
      const endOfToday = endOfDay(now).toISOString();
      const safePillar = planning.pillar || "";

      if (planning.is_avulso) {
        const isVideo = safePillar.toLowerCase().includes('vídeo') || safePillar.toLowerCase().includes('reels');
        const taskType = isVideo ? 'video' : 'design';
        
        const defaultAssigneeId = rulesMap[taskType] || null;
        const optimalAssignee = await this.getOptimalAssignee(taskType, projectId, defaultAssigneeId, 60);

        const deadline = planning.publish_date ? new Date(planning.publish_date).toISOString() : addBusinessDays(now, 2).toISOString();
        
        // 🟢 Foco Diário: Se a deadline for para o futuro, entra como rascunho (draft) para não poluir o Kanban de hoje.
        const initialStatus = deadline <= endOfToday ? 'pending' : 'draft';

        newTasks.push({
          project_id: projectId,
          assigned_to: optimalAssignee,
          title: `[Aprovado] ${planning.hook || 'Nova Demanda'}`,
          description: `**Pilar/Formato:** ${safePillar}\n\n**Copy/Briefing Aprovado:**\n${planning.briefing || 'Sem descrição.'}`,
          stage: 'Produção Ativa',
          task_type: taskType,
          estimated_time: 60,
          deadline: deadline,
          status: initialStatus,
          urgency: true 
        });

      } else {
        const match = safePillar.match(/\d+/); 
        const qty = match ? parseInt(match[0], 10) : 8; 
        
        const taskType = 'design'; 
        const defaultAssigneeId = rulesMap[taskType] || null;
        
        for (let i = 1; i <= qty; i++) {
          const optimalAssignee = await this.getOptimalAssignee(taskType, projectId, defaultAssigneeId, 60);
          const deadline = addBusinessDays(now, 2 + i).toISOString();
          const initialStatus = deadline <= endOfToday ? 'pending' : 'draft';

          newTasks.push({
            project_id: projectId,
            assigned_to: optimalAssignee,
            title: `Post Mensal #${i} - ${planning.month_year || 'Atual'}`,
            description: `**Objetivo da Campanha:** ${safePillar}\n**Tema/Linha:** ${planning.hook || 'Geral'}\n\n**Anotações do Planejamento:**\n${planning.briefing || ''}`,
            stage: 'Produção Ativa',
            task_type: taskType,
            estimated_time: 60,
            deadline: deadline,
            status: initialStatus
          });
        }
      }

      if (newTasks.length > 0) {
        const { error: insertError } = await supabase.from('tasks').insert(newTasks);
        if (insertError) throw insertError;
      }

      await supabase.from('content_planning').update({ status: 'in_progress' }).eq('id', planningId);

      if (adminId) {
        await NotificationEngine.notifyUser(
          adminId,
          "✅ Planejamento Despachado",
          `Os conteúdos aprovados foram convertidos em ${newTasks.length} tarefas de execução.`,
          "success",
          "/admin/analytics"
        );
      }
    } catch (error) {
      console.error("[PM Engine] Erro ao despachar planejamento para as tarefas:", error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * 0.1 HOT-CHECK RECORRÊNCIA
   * ============================================================================
   */
  static async runRecurrenceHotCheck(projectId: string, adminId: string) {
    try {
      const now = new Date();
      
      const { data: project, error: projError } = await supabase
        .from('projects')
        .select('id, client_id, deadline, service_type, payment_recurrence, billing_date')
        .eq('id', projectId)
        .single();

      if (projError || !project) return;

      const isRecurring = project.payment_recurrence?.toLowerCase().includes('mensal') || 
                          project.service_type?.toLowerCase().includes('gestão');
      
      if (!isRecurring) return;

      const projectDeadline = project.deadline ? new Date(project.deadline) : null;
      
      if (projectDeadline && projectDeadline > now) {
        const { data: activeContent } = await supabase
          .from('content_planning')
          .select('id')
          .eq('project_id', projectId)
          .in('status', ['pending', 'in_progress', 'review'])
          .limit(1);

        if (activeContent && activeContent.length > 0) return;
      }

      await supabase.from('content_planning').update({ status: 'archived' }).eq('project_id', projectId).in('status', ['pending', 'draft']);

      const nextMonth = addMonths(startOfMonth(now), 1);
      const nextMonthLabel = format(nextMonth, "MMMM 'de' yyyy", { locale: ptBR });
      const newDeadline = endOfDay(addDays(nextMonth, -1)).toISOString(); 

      await supabase.from('projects').update({
          deadline: newDeadline,
          billing_date: project.billing_date ? addMonths(new Date(project.billing_date), 1).toISOString() : newDeadline,
          current_focus: `Planeamento Mensal: ${nextMonthLabel}`
      }).eq('id', projectId);

      const newMonthTasks = [
        {
          project_id: projectId,
          client_id: project.client_id,
          month_year: nextMonthLabel,
          pillar: 'Estratégia Inicial',
          hook: 'Definição de Pautas e Metas Mensais',
          briefing: 'Revisão das métricas do mês passado e alinhamento do novo cronograma.',
          status: 'pending',
          is_avulso: false
        },
        {
          project_id: projectId,
          client_id: project.client_id,
          month_year: nextMonthLabel,
          pillar: 'Conteúdo Pilar',
          hook: 'Lote de Produção Principal',
          briefing: 'Aguardando aprovação de pautas para iniciar a produção.',
          status: 'draft',
          is_avulso: false
        }
      ];

      await supabase.from('content_planning').insert(newMonthTasks);

      await supabase.from('tasks').insert({
        project_id: projectId,
        assigned_to: adminId,
        title: `🗓️ Novo Ciclo Iniciado: ${nextMonthLabel}`,
        description: `O sistema renovou o ciclo deste projeto.\n\nPróximo Passo: Marcar a sessão de planeamento ou aprovar pauta.`,
        urgency: true,
        status: 'pending',
        stage: 'Planeamento Estratégico',
        task_type: 'management',
        deadline: addBusinessDays(now, 2).toISOString() 
      });

    } catch (error) {
      console.error("[PM Engine - HotCheck] Erro na virada automática de ciclo:", error);
    }
  }

  /**
   * ============================================================================
   * 1. LOAD BALANCING & AUTO-ASSIGN INTELIGENTE
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
      const next7Days = addDays(new Date(), 7).toISOString();

      for (const candidate of candidates) {
        const { data: pendingTasks } = await supabase
          .from('tasks')
          .select('project_id, estimated_time')
          .eq('assigned_to', candidate.id)
          .in('status', ['pending', 'in_progress'])
          .lte('deadline', next7Days);

        let rawLoad = 0;
        let hasContext = false;

        pendingTasks?.forEach(t => {
          rawLoad += (t.estimated_time || 60);
          if (t.project_id === projectId) hasContext = true;
        });

        const effectiveLoad = hasContext ? Math.max(0, rawLoad - this.CONFIG.CAPACITY.CONTEXT_SWITCH_BONUS) : rawLoad;

        if (effectiveLoad < lowestEffectiveLoad) {
          lowestEffectiveLoad = effectiveLoad;
          bestCandidateId = candidate.id;
        }
      }

      return bestCandidateId || defaultAssigneeId;
    } catch (error) {
      return defaultAssigneeId;
    }
  }

  /**
   * ============================================================================
   * 1.5 FOCO DIÁRIO ABSOLUTO (Daily Focus Engine)
   * ============================================================================
   */
  static async executeDailyWorkloadAllocation() {
    try {
      const endOfToday = endOfDay(new Date()).toISOString();

      const { data: futureTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'pending')
        .gt('deadline', endOfToday);

      if (futureTasks && futureTasks.length > 0) {
        await supabase.from('tasks')
          .update({ status: 'draft' })
          .in('id', futureTasks.map(t => t.id));
      }

      const { data: todayTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'draft')
        .lte('deadline', endOfToday);

      if (todayTasks && todayTasks.length > 0) {
        await supabase.from('tasks')
          .update({ status: 'pending' })
          .in('id', todayTasks.map(t => t.id));
      }

    } catch (error) {
      console.error("[PM Engine] Erro na calibração de Foco Diário:", error);
    }
  }

  /**
   * ============================================================================
   * 1.8 DISTRIBUIÇÃO MANUAL / FORÇADA 
   * ============================================================================
   */
  static async distributeUnassignedTasks() {
    try {
      const { data: unassignedTasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .is('assigned_to', null)
        .in('status', ['pending', 'needs_revision']);

      if (taskError) throw taskError;
      if (!unassignedTasks || unassignedTasks.length === 0) return true;

      const { data: teamMembers, error: teamError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['admin', 'gestor', 'colaborador']);

      if (teamError) throw teamError;
      if (!teamMembers || teamMembers.length === 0) return false;

      const updates = [];
      let memberIndex = 0;

      for (const task of unassignedTasks) {
        updates.push({
          id: task.id,
          assigned_to: teamMembers[memberIndex].id,
          status: 'pending' 
        });
        memberIndex = (memberIndex + 1) % teamMembers.length;
      }

      const { error: updateError } = await supabase.from('tasks').upsert(updates);
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error("[PM Engine] Erro na distribuição forçada:", error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * 2. SMART SCHEDULING (Critical Chain Method - CCPM)
   * ============================================================================
   */
  static generateSmartSchedule(tasks: any[], startDate: Date, endDate: Date): any[] {
    return tasks.map((task, index) => {
      return {
        ...task,
        temp_dependency_index: index > 0 ? index - 1 : null,
        is_blocked: index > 0 
      };
    });
  }

  static async unlockDependencies(completedTaskId: string) {
    const { error } = await supabase.from('tasks').update({ is_blocked: false }).eq('depends_on', completedTaskId);
    if (error) throw error;
  }

  /**
   * ============================================================================
   * 3. RISK MITIGATION (Desativado)
   * ============================================================================
   */
  static async runDailyRiskMitigation(adminId: string) {
    return;
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
        if (task.urgency) costOfDelay += this.CONFIG.WSJF.BASE_URGENCY;
        costOfDelay += (ltvValue * this.CONFIG.WSJF.LTV_WEIGHT); 

        const hoursLeft = differenceInHours(new Date(task.deadline), now);
        if (hoursLeft <= 0) costOfDelay += this.CONFIG.WSJF.LATE_PENALTY;       
        else if (hoursLeft <= 24) costOfDelay += this.CONFIG.WSJF.TODAY_PENALTY; 
        else if (hoursLeft <= 72) costOfDelay += this.CONFIG.WSJF.SHORT_TERM_PENALTY; 

        const jobSizeMinutes = task.estimated_time || 60;
        const wsjfScore = Math.round((costOfDelay / jobSizeMinutes) * 100);

        await supabase.from('tasks').update({ priority_score: wsjfScore }).eq('id', task.id);
      }
    } catch (error) {
      console.error("[PM Engine] Erro na indexação WSJF:", error);
    }
  }

  /**
   * ============================================================================
   * 5. PONTO DE INTERVENÇÃO 3: AUTOMAÇÃO DE APROVAÇÃO
   * ============================================================================
   */
  static async triggerPostApproval(hookTitle: string, userId: string, adminId?: string) {
    try {
      if (!hookTitle) return;

      const { data: tasks, error: searchError } = await supabase
        .from('tasks')
        .select('id, status, project_id, deadline')
        .eq('assigned_to', userId)
        .ilike('title', `%${hookTitle}%`) 
        .in('status', ['pending', 'in_progress', 'review'])
        .limit(1);

      if (searchError) throw searchError;
      
      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        const now = new Date().toISOString();
        const originalStatus = task.status; 

        const { error: completeErr } = await supabase.from('tasks').update({ status: 'completed', completed_at: now }).eq('id', task.id);
        if (completeErr) throw completeErr;

        const results = await Promise.allSettled([
          this.unlockDependencies(task.id),
          this.applyGamification(userId, this.CONFIG.GAMIFICATION.MICRO_TASK)
        ]);

        if (results.some(r => r.status === 'rejected')) {
          await supabase.from('tasks').update({ status: originalStatus, completed_at: null }).eq('id', task.id);
          throw new Error("Transação falhou. Rollback executado.");
        }
      }
    } catch (error) {
      console.error("[Motor] Erro na automação de aprovação:", error);
    }
  }

  /**
   * ============================================================================
   * 6. CYCLE TIME TRACKER E SESSÕES DE TRABALHO (RH TELEMETRY)
   * ============================================================================
   */
  static async startTask(taskId: string, userId: string) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress', started_at: now })
        .eq('id', taskId)
        .eq('assigned_to', userId); 

      if (error) throw error;

      // 🟢 Inicia a Sessão de Trabalho no Novo Módulo RH
      await supabase.from('work_sessions').insert({
        user_id: userId,
        task_id: taskId,
        start_time: now
      });

      console.log(`[PM Engine] Tarefa iniciada. Sessão de trabalho ativa para ${userId}.`);
    } catch (error) {
      console.error("[PM Engine] Erro ao iniciar Cycle Time e Sessão:", error);
    }
  }

  /**
   * Encerra a Sessão de Trabalho Ativa, calculando a duração para o Módulo RH
   */
  static async stopTaskSession(taskId: string, userId: string) {
    try {
      const now = new Date();
      
      // Encontra a sessão aberta
      const { data: openSession } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSession) {
        const start = new Date(openSession.start_time);
        const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

        await supabase.from('work_sessions').update({
          end_time: now.toISOString(),
          duration_minutes: diffMinutes > 0 ? diffMinutes : 0
        }).eq('id', openSession.id);
        
        console.log(`[PM Engine] Sessão de trabalho encerrada. Duração: ${diffMinutes}m.`);
      }
    } catch (error) {
      console.error("[PM Engine] Erro ao fechar sessão de trabalho:", error);
    }
  }

  /**
   * ============================================================================
   * 7. PONTOS DE INTERVENÇÃO: GATILHOS GENÉRICOS
   * ============================================================================
   */
  static async triggerSystemAction(projectId: string, actionType: string, userId: string, adminId?: string) {
    try {
      if (!projectId || !userId) return;

      let query = supabase.from('tasks').select('id, status, deadline').eq('project_id', projectId).eq('assigned_to', userId).in('status', ['pending', 'in_progress', 'review']);

      if (actionType === 'planning') {
        query = query.or('title.ilike.%planejamento%,title.ilike.%planeamento%,title.ilike.%estratégia%').limit(1);
      } else if (actionType === 'community') {
        query = query.or('title.ilike.%moderação da comunidade%,title.ilike.%diário de bordo%,title.ilike.%relatório diário%').limit(1);
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        const now = new Date().toISOString();
        const originalStatus = task.status;

        const { error: completeErr } = await supabase.from('tasks').update({ status: 'completed', completed_at: now }).eq('id', task.id);
        if (completeErr) throw completeErr;

        const expBonus = actionType === 'planning' ? this.CONFIG.GAMIFICATION.MACRO_TASK : this.CONFIG.GAMIFICATION.DAILY_ROUTINE;

        const results = await Promise.allSettled([
          this.unlockDependencies(task.id),
          this.applyGamification(userId, expBonus)
        ]);

        if (results.some(r => r.status === 'rejected')) {
          await supabase.from('tasks').update({ status: originalStatus, completed_at: null }).eq('id', task.id);
          throw new Error("Falha na transação. Rollback executado.");
        }
      }
    } catch (error) {
      console.error(`[Motor] Erro ao engatilhar System Action (${actionType}):`, error);
    }
  }

  /**
   * ============================================================================
   * 8. OVERWRITE DINÂMICO DE TAREFAS
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
        await supabase.from('tasks').update({ title: newTitle, description: descriptionText }).eq('id', tasks[0].id);
      }
    } catch (error) {
      console.error(`[Motor] Erro ao sincronizar conteúdo:`, error);
    }
  }

  /**
   * ============================================================================
   * 9. GAMIFICATION ENGINE
   * ============================================================================
   */
  private static async applyGamification(userId: string, expAmount: number) {
    const { data: perf } = await supabase.from('team_performance').select('*').eq('user_id', userId).single();
    if (perf) {
      await supabase.from('team_performance').update({
        exp_points: (perf.exp_points || 0) + expAmount,
        total_tasks_completed: (perf.total_tasks_completed || 0) + 1
      }).eq('user_id', userId);
    }
  }

  /**
   * ============================================================================
   * 10. FEVER CHART CCPM (Desativado)
   * ============================================================================
   */
  static async evaluateProjectBufferHealth(projectId: string, adminId: string) {
    return;
  }

  /**
   * ============================================================================
   * 11. SUPERVISOR ASSISTENTE IA (Fiscalização Autônoma)
   * ============================================================================
   */
  static async triggerSupervisorAnalysis(projectId: string, adminId: string) {
    try {
      const { data: project } = await supabase.from('projects').select('*, profiles(nome)').eq('id', projectId).single();
      const { data: tasks } = await supabase.from('tasks').select('status, deadline, estimated_time').eq('project_id', projectId);
      
      if (!project || !tasks) return;

      console.log(`[Supervisor IA] Telemetria do projeto ${projectId} enviada para análise autônoma.`);
    } catch (error) {
      console.error("[Supervisor IA] Erro ao contactar a IA:", error);
    }
  }

  /**
   * ============================================================================
   * 12. CALIBRAÇÃO BIDIRECIONAL (Desativado)
   * ============================================================================
   */
  static async calibrateUnitEconomics(adminId: string) {
    return;
  }
}