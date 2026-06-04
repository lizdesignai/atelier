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
   * 0.0 PONTE DE PRODUÇÃO (Approved Planning -> JTBD Tasks)
   * Disparado quando o cliente (ou admin) clica em "Aprovar Planejamento"
   * ============================================================================
   */
  static async deployApprovedPlanningToTasks(planningId: string, projectId: string, adminId?: string) {
    try {
      console.log(`[PM Engine] Iniciando Deploy do Planejamento Aprovado: ${planningId}`);

      // 1. Busca os detalhes do planejamento aprovado
      const { data: planning, error: planningError } = await supabase
        .from('content_planning')
        .select('*')
        .eq('id', planningId)
        .single();

      if (planningError || !planning) throw new Error("Planejamento não encontrado.");

      // 2. Busca as Regras de Routing do Projeto para atribuir corretamente
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
      const safePillar = planning.pillar || "";

      if (planning.is_avulso) {
        // FLUXO A: Post Pontual (Apenas 1 tarefa)
        const isVideo = safePillar.toLowerCase().includes('vídeo') || safePillar.toLowerCase().includes('reels');
        const taskType = isVideo ? 'video' : 'design';
        
        const defaultAssigneeId = rulesMap[taskType] || null;
        const optimalAssignee = await this.getOptimalAssignee(taskType, projectId, defaultAssigneeId, 60);

        newTasks.push({
          project_id: projectId,
          assigned_to: optimalAssignee,
          title: `[Aprovado] ${planning.hook || 'Nova Demanda'}`,
          description: `**Pilar/Formato:** ${safePillar}\n\n**Copy/Briefing Aprovado:**\n${planning.briefing || 'Sem descrição.'}`,
          stage: 'Produção Ativa',
          task_type: taskType,
          estimated_time: 60,
          deadline: planning.publish_date ? new Date(planning.publish_date).toISOString() : addBusinessDays(now, 2).toISOString(),
          status: 'pending',
          urgency: true 
        });

      } else {
        // FLUXO B: Planejamento Mensal Completo (Lote de Tarefas)
        // Extraímos a quantidade de posts de forma segura
        const match = safePillar.match(/\d+/); 
        const qty = match ? parseInt(match[0], 10) : 8; // Fallback robusto para 8 posts
        
        const taskType = 'design'; 
        const defaultAssigneeId = rulesMap[taskType] || null;
        
        for (let i = 1; i <= qty; i++) {
          const optimalAssignee = await this.getOptimalAssignee(taskType, projectId, defaultAssigneeId, 60);
          
          newTasks.push({
            project_id: projectId,
            assigned_to: optimalAssignee,
            title: `Post Mensal #${i} - ${planning.month_year || 'Atual'}`,
            description: `**Objetivo da Campanha:** ${safePillar}\n**Tema/Linha:** ${planning.hook || 'Geral'}\n\n**Anotações do Planejamento:**\n${planning.briefing || ''}`,
            stage: 'Produção Ativa',
            task_type: taskType,
            estimated_time: 60,
            deadline: addBusinessDays(now, 2 + i).toISOString(),
            status: 'pending'
          });
        }
      }

      // 3. Insere as tarefas no Analytics/JTBD
      if (newTasks.length > 0) {
        const { error: insertError } = await supabase.from('tasks').insert(newTasks);
        if (insertError) throw insertError;
      }

      // 4. Marca o Planejamento como Processado para que não seja injetado duas vezes
      await supabase.from('content_planning').update({ status: 'in_progress' }).eq('id', planningId);

      // 5. Notifica o Admin
      if (adminId) {
        await NotificationEngine.notifyUser(
          adminId,
          "✅ Planejamento Despachado",
          `Os conteúdos aprovados foram convertidos em ${newTasks.length} tarefas na esteira de produção.`,
          "success",
          "/admin/analytics"
        );
      }

      console.log(`[PM Engine] Sucesso: ${newTasks.length} tarefas geradas e atribuídas a partir do Planejamento.`);
    } catch (error) {
      console.error("[PM Engine] Erro ao despachar planejamento para as tarefas:", error);
      throw error;
    }
  }

  /**
   * ============================================================================
   * 0.1 HOT-CHECK RECORRÊNCIA (Virada de Ciclo para Serviços de Assinatura)
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

      console.log(`[PM Engine - HotCheck] Virada de Ciclo ativada para o Projeto: ${projectId}`);

      await supabase
        .from('content_planning')
        .update({ status: 'archived' })
        .eq('project_id', projectId)
        .in('status', ['pending', 'draft']);

      const nextMonth = addMonths(startOfMonth(now), 1);
      const nextMonthLabel = format(nextMonth, "MMMM 'de' yyyy", { locale: ptBR });
      const newDeadline = endOfDay(addDays(nextMonth, -1)).toISOString(); 

      await supabase
        .from('projects')
        .update({
          deadline: newDeadline,
          billing_date: project.billing_date ? addMonths(new Date(project.billing_date), 1).toISOString() : newDeadline,
          current_focus: `Planeamento Mensal: ${nextMonthLabel}`
        })
        .eq('id', projectId);

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
        description: `O sistema renovou o ciclo deste projeto. O quadro de conteúdos foi limpo e as tarefas estruturais de planeamento foram injetadas.\n\nPróximo Passo: Marcar a sessão de planeamento com o cliente ou aprovar a nova pauta.`,
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
   * 1.5 AUTO-DISPATCHER (Just-In-Time Allocation / Despoluição Diária)
   * ============================================================================
   */
  static async executeDailyWorkloadAllocation() {
    try {
      const now = new Date();

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['pending', 'in_progress']);

      if (!allTasks || allTasks.length === 0) return;

      const loadMap: Record<string, any[]> = {};
      const tasksToAllocate: any[] = [];
      const tasksToHibernate: string[] = [];

      allTasks.forEach(task => {
        if (!task.deadline) return;

        const taskDays = Math.max(1, Math.ceil((task.estimated_time || 60) / 480));
        const mustStartBy = addBusinessDays(new Date(task.deadline), -taskDays);

        if (now >= mustStartBy) {
          if (!task.assigned_to) {
            tasksToAllocate.push(task);
          } else {
            if (!loadMap[task.assigned_to]) loadMap[task.assigned_to] = [];
            loadMap[task.assigned_to].push(task);
          }
        } else {
          if (task.assigned_to && task.status === 'pending') {
            tasksToHibernate.push(task.id);
          }
        }
      });

      if (tasksToHibernate.length > 0) {
        await supabase.from('tasks').update({ assigned_to: null }).in('id', tasksToHibernate);
        console.log(`[PM Engine] Hibernação: ${tasksToHibernate.length} tarefas futuras removidas do JTBD diário.`);
      }

      for (const [assigneeId, tasks] of Object.entries(loadMap)) {
        tasks.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

        let dailyLoad = 0;
        for (const task of tasks) {
          const time = task.estimated_time || 60;
          if (dailyLoad + time > this.CONFIG.CAPACITY.DAILY_MAX_MINUTES) {
            tasksToAllocate.push(task);
          } else {
            dailyLoad += time;
          }
        }
      }

      for (const task of tasksToAllocate) {
        const optimalUserId = await this.getOptimalAssignee(
          task.task_type || 'design',
          task.project_id,
          null, 
          task.estimated_time || 60
        );

        if (optimalUserId && optimalUserId !== task.assigned_to) {
          await supabase.from('tasks')
            .update({ 
              assigned_to: optimalUserId,
              description: task.description 
                ? `[Daily JIT Allocation]\nAlocada hoje para evitar gargalos. Prazo a cumprir.\n\n${task.description}`
                : `[Daily JIT Allocation]\nAlocada hoje para evitar gargalos. Prazo a cumprir.`
            })
            .eq('id', task.id);
          
          console.log(`[PM Engine] Despacho Diário: Tarefa "${task.title}" alocada para ${optimalUserId}.`);
        }
      }

    } catch (error) {
      console.error("[PM Engine] Erro na alocação diária de carga de trabalho:", error);
    }
  }

  /**
   * ============================================================================
   * 1.8 DISTRIBUIÇÃO MANUAL / FORÇADA (Para resolver erros de Vercel/Analytics)
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
          status: 'in_progress'
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
        dangerMap[t.assigned_to].specificTasks.push(t.title); 
      });

      for (const [assigneeId, data] of Object.entries(dangerMap)) {
        if (data.totalMinutes > this.CONFIG.CAPACITY.DAILY_MAX_MINUTES) {
          
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
   * 7. PONTOS DE INTERVENÇÃO 4 E 5: GATILHOS GENÉRICOS
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

      const { data: openAlerts } = await supabase
        .from('tasks')
        .select('title')
        .eq('stage', 'Otimização Sistémica')
        .neq('status', 'completed');
        
      const existingAlertTitles = openAlerts ? openAlerts.map(a => a.title) : [];

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
            const isAlertAlreadyOpen = existingAlertTitles.some(title => title.includes(taskName));

            if (!isAlertAlreadyOpen) {
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