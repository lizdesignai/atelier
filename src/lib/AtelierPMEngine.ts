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
   * Utiliza a Teoria das Restrições para evitar gargalos e penalização por troca de contexto.
   */
  static async getOptimalAssignee(taskType: string, projectId: string, defaultAssigneeId: string | null, estimatedMinutes: number = 60): Promise<string | null> {
    try {
      const { data: team } = await supabase.from('profiles').select('id, skills').in('role', ['admin', 'gestor', 'colaborador']);
      if (!team || team.length === 0) return defaultAssigneeId;

      // Filtra pool de talentos pela competência (Tag)
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

        // Fórmula de Carga Efetiva: Reduz o "peso" percebido se o colaborador já domina o contexto do cliente
        const effectiveLoad = hasContext ? Math.max(0, rawLoad - this.CONTEXT_SWITCH_BONUS) : rawLoad;

        if (effectiveLoad < lowestEffectiveLoad) {
          lowestEffectiveLoad = effectiveLoad;
          bestCandidateId = candidate.id;
        }
      }

      // Se o designado padrão estiver a entrar em Burnout, força o Bypass
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
   * Aplica a Lei de Parkinson mitigada: O trabalho expande para preencher o tempo.
   * Logo, comprimimos os prazos reais e adicionamos um Buffer de Projeto no final.
   */
  static generateSmartSchedule(tasks: any[], startDate: Date, endDate: Date): any[] {
    const totalBusinessDays = differenceInBusinessDays(endDate, startDate);
    
    // Reserva 20% do tempo final como "Project Buffer" para acomodar refações e feedback do cliente
    const executionDays = Math.max(1, Math.floor(totalBusinessDays * 0.8)); 
    const step = Math.max(1, Math.floor(executionDays / tasks.length));

    let currentDate = startDate;
    
    return tasks.map((task, index) => {
      currentDate = addBusinessDays(currentDate, step);
      return {
        ...task,
        deadline: currentDate.toISOString(),
        temp_dependency_index: index > 0 ? index - 1 : null,
        is_blocked: index > 0 // Cria a dependência linear (Finish-to-Start)
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
        // Extração Blindada (Type-Safe)
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
   * Algoritmo de Priorização SAFe: (Custo do Atraso) / Duração
   * Retira a carga cognitiva do colaborador sobre "O que devo fazer a seguir?".
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

        // Extração Blindada (Type-Safe)
        const projObj = extractNode<{ financial_value: number }>(task.projects);
        const ltvValue = projObj?.financial_value || 0;
        
        // 1. Cálculo do Custo do Atraso (Cost of Delay)
        let costOfDelay = 0;
        if (task.urgency) costOfDelay += 1000;
        costOfDelay += (ltvValue * 0.1); // Contratos maiores geram mais pressão

        const hoursLeft = differenceInHours(new Date(task.deadline), now);
        if (hoursLeft <= 0) costOfDelay += 2000;      // Em atraso = Crítico
        else if (hoursLeft <= 24) costOfDelay += 800; // Hoje
        else if (hoursLeft <= 72) costOfDelay += 300; // Curto Prazo

        // 2. Cálculo Final WSJF (Quanto menor a tarefa e maior o custo do atraso, maior o Score)
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
   * 5. CALIBRAÇÃO (Earned Value Management - EVM Loop)
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

          // Desvio Padrão Aceitável é de 30%. Se passar disso, exige calibração do modelo.
          if (avgAct > avgEst * 1.3) {
            await supabase.from('tasks').insert({
              project_id: null,
              assigned_to: adminId,
              title: `⚙️ Desvio de EVM: ${taskName}`,
              description: `Anotação do Motor: A tarefa "${taskName}" orçada em ${avgEst.toFixed(0)}m está a consumir ${avgAct.toFixed(0)}m reais (Amostra: ${data.count}). Ajuste o Dicionário de Base (IG_SETUP / IDV_PIPELINE) para proteger o lucro da agência.`,
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