// src/lib/AtelierPMEngine.ts
import { supabase } from './supabase';
import { 
  addBusinessDays, 
  differenceInBusinessDays, 
  differenceInHours,
  endOfDay,
  addDays,
  differenceInDays
} from 'date-fns';

// ============================================================================
// UTILITÁRIO DE BLINDAGEM TYPE-SAFE (Resolve o conflito de Arrays do Supabase)
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
      DAILY_MAX_MINUTES: 480,       // 8 horas por dia ideais
      BURNOUT_THRESHOLD: 900,       // 15 horas de acumulação = Perigo de rutura
      CONTEXT_SWITCH_BONUS: 60      // Desconto cognitivo por já estar focado no mesmo cliente (1h)
    },
    EVM: {
      MIN_SAMPLE_SIZE: 5,           // Requer 5 tarefas do mesmo tipo antes de gerar alerta de calibração
      POSITIVE_DEVIATION: 0.7,      // Alerta de Oportunidade: se demora menos de 70% do tempo
      NEGATIVE_DEVIATION: 1.3       // Alerta de Prejuízo: se demora mais de 130% do tempo
    },
    WSJF: {
      BASE_URGENCY: 1000,
      LTV_WEIGHT: 0.1,
      LATE_PENALTY: 2000,           // Atrasado
      TODAY_PENALTY: 800,           // Vence em 24h
      SHORT_TERM_PENALTY: 300       // Vence em 72h
    },
    CCPM: {
      EXECUTION_RATIO: 0.8,         // 80% do tempo para execução, 20% guardado como Buffer
      BUFFER_WARNING: 75            // Zona amarela do Fever Chart (%)
    },
    GAMIFICATION: {
      MACRO_TASK: 100,              // EXP por fechar um Planeamento ou Identidade
      MICRO_TASK: 50,               // EXP por fechar um Post / Peça
      DAILY_ROUTINE: 30             // EXP por reportes e comunidade
    }
  };

  /**
   * ============================================================================
   * 1. LOAD BALANCING & AUTO-ASSIGN INTELIGENTE (Otimização de Capacidade, Foco e EVM)
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

      const { data: evmData } = await supabase
        .from('tasks')
        .select('assigned_to, estimated_time, actual_time')
        .eq('task_type', taskType)
        .eq('status', 'completed')
        .gte('completed_at', addDays(new Date(), -90).toISOString()); 

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

        let spiModifier = 1; 
        if (evmData) {
          const myHistory = evmData.filter(t => t.assigned_to === candidate.id);
          if (myHistory.length >= 3) {
             const totalEst = myHistory.reduce((acc, t) => acc + (t.estimated_time || 60), 0);
             const totalAct = myHistory.reduce((acc, t) => acc + (t.actual_time || 60), 0);
             spiModifier = totalAct / totalEst; 
          }
        }

        const baseLoad = hasContext ? Math.max(0, rawLoad - this.CONFIG.CAPACITY.CONTEXT_SWITCH_BONUS) : rawLoad;
        const effectiveLoad = baseLoad * spiModifier; 

        if (effectiveLoad < lowestEffectiveLoad) {
          lowestEffectiveLoad = effectiveLoad;
          bestCandidateId = candidate.id;
        }
      }

      if (defaultAssigneeId && bestCandidateId !== defaultAssigneeId) {
        const defaultTasks = await supabase.from('tasks')
          .select('estimated_time')
          .eq('assigned_to', defaultAssigneeId)
          .in('status', ['pending', 'in_progress'])
          .lte('deadline', next7Days);
          
        const defaultLoad = defaultTasks.data?.reduce((acc, t) => acc + (t.estimated_time || 60), 0) || 0;
        
        if (defaultLoad + estimatedMinutes > this.CONFIG.CAPACITY.BURNOUT_THRESHOLD) {
          return bestCandidateId; 
        }
      }

      return defaultAssigneeId || bestCandidateId;
    } catch (error) {
      console.error("[PM Engine] Erro no Load Balancing Inteligente:", error);
      return defaultAssigneeId;
    }
  }

  /**
   * ============================================================================
   * 1.5 AUTO-DISPATCHER (Distribuição Autónoma da Linha de Montagem)
   * NOVO: O Motor agora varre a base de dados procurando tarefas não atribuídas 
   * e distribui-as autonomamente pelas pessoas da equipa para garantir o fluxo.
   * ============================================================================
   */
  static async distributeUnassignedTasks(projectId?: string) {
    try {
      let query = supabase.from('tasks')
        .select('id, title, task_type, estimated_time, project_id, description')
        .is('assigned_to', null) // Tarefas "órfãs"
        .in('status', ['pending'])
        .order('deadline', { ascending: true }); // Prioriza as que vencem mais cedo

      if (projectId) query = query.eq('project_id', projectId);

      const { data: unassignedTasks, error } = await query;
      if (error || !unassignedTasks || unassignedTasks.length === 0) return;

      for (const task of unassignedTasks) {
        const optimalUserId = await this.getOptimalAssignee(
          task.task_type || 'design', // Recai para 'design' como fallback genérico
          task.project_id,
          null,
          task.estimated_time || 60
        );

        if (optimalUserId) {
          // Atualiza a tarefa vinculando o novo responsável e registando no log
          await supabase.from('tasks')
            .update({ 
              assigned_to: optimalUserId,
              description: task.description 
                ? `[Auto-Alocado pelo Sistema]\n${task.description}` 
                : `[Auto-Alocado pelo Sistema]\nTarefa distribuída automaticamente pela IA de gestão baseada na sua capacidade e skills atuais.`
            })
            .eq('id', task.id);
            
          console.log(`[PM Engine] Despacho Ativo: Tarefa "${task.title}" alocada de forma autónoma.`);
        }
      }
    } catch (error) {
      console.error("[PM Engine] Erro na distribuição autónoma de tarefas:", error);
    }
  }

  /**
   * ============================================================================
   * 2. SMART SCHEDULING (Critical Chain Method - CCPM)
   * ============================================================================
   */
  static generateSmartSchedule(tasks: any[], startDate: Date, endDate: Date): any[] {
    const totalBusinessDays = differenceInBusinessDays(endDate, startDate);
    
    const executionDays = Math.max(1, Math.floor(totalBusinessDays * this.CONFIG.CCPM.EXECUTION_RATIO)); 
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
    const { error } = await supabase.from('tasks').update({ is_blocked: false }).eq('depends_on', completedTaskId);
    if (error) throw error;
  }

  /**
   * ============================================================================
   * 3. RISK MITIGATION (Schedule Performance Index - SPI Tracker)
   * CORREÇÃO: O sistema agora detalha QUAIS atividades estão a causar o desvio
   * diretamente na descrição, para o Gestor poder atuar rápido.
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

      const dangerMap: Record<string, { name: string, totalMinutes: number, tasks: number, specificTasks: string[] }> = {};
      
      urgentTasks.forEach((t: any) => {
        const profileObj = extractNode<{ nome: string }>(t.profiles);
        const name = profileObj?.nome || "Membro Desconhecido";

        if (!dangerMap[t.assigned_to]) dangerMap[t.assigned_to] = { name, totalMinutes: 0, tasks: 0, specificTasks: [] };
        dangerMap[t.assigned_to].totalMinutes += (t.estimated_time || 60);
        dangerMap[t.assigned_to].tasks += 1;
        dangerMap[t.assigned_to].specificTasks.push(t.title); // Guarda o nome das tarefas para o relatório
      });

      for (const [assigneeId, data] of Object.entries(dangerMap)) {
        if (data.totalMinutes > this.CONFIG.CAPACITY.DAILY_MAX_MINUTES) {
          
          // Formata a lista de tarefas críticas
          const taskListStr = data.specificTasks.map(t => `• ${t}`).join('\n');
          
          await supabase.from('tasks').insert({
            project_id: null, 
            assigned_to: adminId,
            title: `🚨 Gargalo Eminente (SPI < 1): ${data.name}`,
            description: `Alerta Vermelho: ${data.name} acumula ${(data.totalMinutes / 60).toFixed(1)}h de esforço crítico a vencer nas próximas 48h.\n\nATIVIDADES EM ATRASO/RISCO:\n${taskListStr}\n\nIntervenção exigida para reagendar ou redistribuir a carga e proteger os prazos finais.`,
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
   * 5. PONTO DE INTERVENÇÃO 3: AUTOMAÇÃO DE APROVAÇÃO (COM ROLLBACK TRANSACTIONS)
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

        if (task.project_id && adminId) {
          await this.evaluateProjectBufferHealth(task.project_id, adminId);
          await this.triggerSupervisorAnalysis(task.project_id, adminId);
        }
      }
    } catch (error) {
      console.error("[Motor] Erro na automação de aprovação:", error);
    }
  }

  /**
   * ============================================================================
   * 6. CYCLE TIME TRACKER (INÍCIO DA TAREFA)
   * ============================================================================
   */
  static async startTask(taskId: string, userId: string) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress', 
          started_at: now 
        })
        .eq('id', taskId)
        .eq('assigned_to', userId); 

      if (error) throw error;
      
      console.log(`[PM Engine] Tarefa ${taskId} iniciada. Timer de Cycle Time ativado.`);
    } catch (error) {
      console.error("[PM Engine] Erro ao iniciar Cycle Time:", error);
    }
  }

  /**
   * ============================================================================
   * 7. PONTOS DE INTERVENÇÃO 4 E 5: GATILHOS GENÉRICOS (COM ROLLBACK TRANSACTIONS)
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

        if (adminId) {
          await this.evaluateProjectBufferHealth(projectId, adminId);
          await this.triggerSupervisorAnalysis(projectId, adminId);
        }
      }
    } catch (error) {
      console.error(`[Motor] Erro ao engatilhar System Action (${actionType}):`, error);
    }
  }

  /**
   * ============================================================================
   * 8. OVERWRITE DINÂMICO DE TAREFAS (SINCRONIZAÇÃO DE CONTEÚDO)
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
   * 9. GAMIFICATION ENGINE (Recompensas de Performance)
   * ============================================================================
   */
  private static async applyGamification(userId: string, expAmount: number) {
    const { data: perf } = await supabase.from('team_performance').select('*').eq('user_id', userId).single();
    if (perf) {
      await supabase.from('team_performance').update({
        exp_points: (perf.exp_points || 0) + expAmount,
        total_tasks_completed: (perf.total_tasks_completed || 0) + 1
      }).eq('user_id', userId);
    } else {
       throw new Error("Perfil de Gamificação não encontrado."); 
    }
  }

  /**
   * ============================================================================
   * 10. FEVER CHART CCPM (Consumo de Buffer do Projeto)
   * ============================================================================
   */
  static async evaluateProjectBufferHealth(projectId: string, adminId: string) {
    try {
      const { data: project } = await supabase.from('projects').select('created_at, data_limite').eq('id', projectId).single();
      if (!project || !project.data_limite) return;

      const totalDays = differenceInDays(new Date(project.data_limite), new Date(project.created_at));
      const maxBufferDays = Math.max(1, Math.floor(totalDays * (1 - this.CONFIG.CCPM.EXECUTION_RATIO)));

      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('deadline, completed_at')
        .eq('project_id', projectId)
        .eq('status', 'completed');

      if (!completedTasks) return;

      let consumedBufferDays = 0;

      completedTasks.forEach(task => {
        if (task.deadline && task.completed_at) {
          const delay = differenceInDays(new Date(task.completed_at), new Date(task.deadline));
          if (delay > 0) consumedBufferDays += delay;
        }
      });

      const bufferConsumptionPercentage = (consumedBufferDays / maxBufferDays) * 100;

      let alertTitle = null;
      let alertDesc = null;

      if (bufferConsumptionPercentage >= 100) {
        alertTitle = `🔴 FEVER CHART: Buffer Esgotado!`;
        alertDesc = `Atrasos acumulados (${consumedBufferDays} dias) consumiram 100% do Buffer. Prazo final comprometido!`;
      } else if (bufferConsumptionPercentage >= this.CONFIG.CCPM.BUFFER_WARNING) {
        alertTitle = `🟡 FEVER CHART: Risco Elevado`;
        alertDesc = `Atrasos acumulados já consumiram ${bufferConsumptionPercentage.toFixed(0)}% do Buffer.`;
      }

      if (alertTitle) {
        const { data: existingAlert } = await supabase.from('tasks').select('id').eq('project_id', projectId).eq('title', alertTitle).limit(1);
        if (!existingAlert || existingAlert.length === 0) {
          await supabase.from('tasks').insert({
            project_id: projectId,
            assigned_to: adminId,
            title: alertTitle,
            description: alertDesc,
            urgency: true,
            status: 'pending',
            task_type: 'setup',
            deadline: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("[PM Engine] Erro na avaliação de Buffer:", error);
    }
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

      const payload = {
        projectName: project.profiles?.nome,
        deadline: project.data_limite,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        tasksPending: tasks.filter(t => t.status !== 'completed').length,
        totalTimeEstimated: tasks.reduce((acc, t) => acc + (t.estimated_time || 60), 0)
      };

      console.log(`[Supervisor IA] Telemetria do projeto ${projectId} enviada para análise autônoma.`);
    } catch (error) {
      console.error("[Supervisor IA] Erro ao contactar a IA:", error);
    }
  }

  /**
   * ============================================================================
   * 12. CALIBRAÇÃO BIDIRECIONAL (Earned Value Management - EVM Loop)
   * CORREÇÃO DE DUPLICAÇÃO: O motor agora tem memória de curto prazo mais rigorosa.
   * ============================================================================
   */
  static async calibrateUnitEconomics(adminId: string) {
    try {
      const thirtyDaysAgo = addDays(new Date(), -30).toISOString();

      // 1. Puxa as métricas reais dos últimos 30 dias
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
        if (data.count >= this.CONFIG.EVM.MIN_SAMPLE_SIZE) {
          const avgEst = data.totalEst / data.count;
          const avgAct = data.totalAct / data.count;

          let alertTitle = null;
          let alertDesc = null;

          if (avgAct > avgEst * this.CONFIG.EVM.NEGATIVE_DEVIATION) {
            alertTitle = `🚨 Desvio de EVM (Prejuízo): ${taskName}`;
            alertDesc = `Anotação do Motor: A tarefa "${taskName}" orçada em ${avgEst.toFixed(0)}m consome ${avgAct.toFixed(0)}m reais (Am. ${data.count}).`;
          } else if (avgAct < avgEst * this.CONFIG.EVM.POSITIVE_DEVIATION) {
            alertTitle = `🚀 Desvio de EVM (Oportunidade): ${taskName}`;
            alertDesc = `Anotação do Motor: Eficiência alta! Tarefa "${taskName}" orçada em ${avgEst.toFixed(0)}m consome ${avgAct.toFixed(0)}m reais (Am. ${data.count}).`;
          }

          if (alertTitle) {
            // 2. VERIFICAÇÃO RIGOROSA: Já emiti este alerta exato recentemente?
            const { data: existingAlerts } = await supabase
              .from('tasks')
              .select('id')
              .eq('title', alertTitle) // Procura EXATAMENTE este título
              .eq('stage', 'Otimização Sistémica') // Garante que é um ticket do motor
              .limit(1);

            // 3. Apenas insere se a resposta for rigorosamente vazia
            if (!existingAlerts || existingAlerts.length === 0) {
              await supabase.from('tasks').insert({
                project_id: null,
                assigned_to: adminId,
                title: alertTitle,
                description: alertDesc,
                urgency: false,
                status: 'pending',
                stage: 'Otimização Sistémica',
                task_type: 'setup',
                deadline: addBusinessDays(new Date(), 5).toISOString()
              });
              console.log(`[PM Engine] EVM Calibrado: Novo Alerta gerado para "${taskName}"`);
            }
          }
        }
      }
    } catch (error) {
      console.error("[PM Engine] Erro na calibração EVM:", error);
    }
  }
}