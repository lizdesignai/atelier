// src/lib/CalendarEngine.ts
import { supabase } from "./supabase";

// Tipagem rigorosa para evitar falhas de memória
interface TaskPayload {
  id: string;
  title: string;
  task_type: string;
  status: string;
  deadline: string;
  estimated_time: number;
  assigned_to: string;
  [key: string]: any;
}

export class CalendarEngine {
  // Limites Operacionais de Segurança (Saúde Mental & Qualidade)
  static readonly MAX_HEAVY_PER_DAY = 2; // Máximo de Reuniões/Captações por dia
  static readonly MAX_MINUTES_PER_DAY = 360; // 6 horas de trabalho profundo real por dia
  static readonly HEAVY_TYPES = ['reuniao', 'captacao'];

  /**
   * Gera a Timeline da semana corrente de forma segura contra fusos horários.
   */
  static getCurrentWeek(): Date[] {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Força início na Segunda
    
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, i) => {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      return nextDay;
    });
  }

  /**
   * O Cérebro Autónomo: Capacity Planning & Load Balancing
   * Reorganiza a matriz de tempo respeitando limites de horas e burnout.
   */
  static async optimizeSchedule(tasks: TaskPayload[]): Promise<TaskPayload[] | null> {
    if (!tasks || tasks.length === 0) return tasks;

    let hasMutations = false;
    const updatesQueue: Promise<any>[] = [];
    const optimizedTasks = [...tasks];

    // 1. Isolar a matriz por executor (Cada colaborador tem a sua agenda)
    const tasksByUser = optimizedTasks.reduce((acc, task) => {
      if (!task.assigned_to || task.status === 'completed') return acc;
      if (!acc[task.assigned_to]) acc[task.assigned_to] = [];
      acc[task.assigned_to].push(task);
      return acc;
    }, {} as Record<string, TaskPayload[]>);

    // 2. Processar a fila de cada colaborador de forma independente
    for (const userId of Object.keys(tasksByUser)) {
      const userTasks = tasksByUser[userId];
      
      // Agrupar cronologicamente por dia (YYYY-MM-DD)
      const scheduleMap = userTasks.reduce((acc, t) => {
        const dateStr = new Date(t.deadline).toISOString().split('T')[0];
        if (!acc[dateStr]) acc[dateStr] = { tasks: [], totalMinutes: 0, heavyCount: 0 };
        acc[dateStr].tasks.push(t);
        acc[dateStr].totalMinutes += (t.estimated_time || 60);
        if (this.HEAVY_TYPES.includes(t.task_type)) acc[dateStr].heavyCount += 1;
        return acc;
      }, {} as Record<string, { tasks: TaskPayload[], totalMinutes: number, heavyCount: number }>);

      // 3. Varredura de Sobrecarga e Deteção de Colisão Diária
      const sortedDates = Object.keys(scheduleMap).sort();
      
      for (const dateStr of sortedDates) {
        const dayData = scheduleMap[dateStr];
        const isOverloaded = dayData.heavyCount > this.MAX_HEAVY_PER_DAY || dayData.totalMinutes > this.MAX_MINUTES_PER_DAY;

        if (isOverloaded) {
          // Ordenar as tarefas do dia: as pesadas ou de menor prioridade saem primeiro
          dayData.tasks.sort((a, b) => {
             const aHeavy = this.HEAVY_TYPES.includes(a.task_type) ? 1 : 0;
             const bHeavy = this.HEAVY_TYPES.includes(b.task_type) ? 1 : 0;
             return bHeavy - aHeavy; // Move pesadas para o fim da fila para reagendamento
          });

          // Iterar e remover o excesso
          while (dayData.heavyCount > this.MAX_HEAVY_PER_DAY || dayData.totalMinutes > this.MAX_MINUTES_PER_DAY) {
            const taskToMove = dayData.tasks.pop(); // Remove a última (excesso)
            if (!taskToMove) break;

            // Abater os contadores locais
            dayData.totalMinutes -= (taskToMove.estimated_time || 60);
            if (this.HEAVY_TYPES.includes(taskToMove.task_type)) dayData.heavyCount -= 1;

            // 4. Forward-Looking: Encontrar o próximo Slot Válido
            let nextValidDate = new Date(dateStr);
            let targetDateStr = "";
            let slotFound = false;

            while (!slotFound) {
              nextValidDate.setDate(nextValidDate.getDate() + 1);
              const dayOfWeek = nextValidDate.getDay();
              
              // Pular Fins de Semana
              if (dayOfWeek === 0 || dayOfWeek === 6) continue;

              targetDateStr = nextValidDate.toISOString().split('T')[0];
              
              // Se o dia ainda não existe no mapa, cria-o
              if (!scheduleMap[targetDateStr]) {
                scheduleMap[targetDateStr] = { tasks: [], totalMinutes: 0, heavyCount: 0 };
              }

              // Checar Capacidade do novo Slot
              const targetDay = scheduleMap[targetDateStr];
              const willExceedTime = (targetDay.totalMinutes + (taskToMove.estimated_time || 60)) > this.MAX_MINUTES_PER_DAY;
              const isHeavyTask = this.HEAVY_TYPES.includes(taskToMove.task_type);
              const willExceedHeavy = isHeavyTask && (targetDay.heavyCount + 1 > this.MAX_HEAVY_PER_DAY);

              if (!willExceedTime && !willExceedHeavy) {
                // Slot encontrado! Alocar.
                targetDay.tasks.push(taskToMove);
                targetDay.totalMinutes += (taskToMove.estimated_time || 60);
                if (isHeavyTask) targetDay.heavyCount += 1;
                slotFound = true;
              }
            }

            // 5. Aplicar a Mutação
            const newIsoDeadline = nextValidDate.toISOString();
            taskToMove.deadline = newIsoDeadline;
            
            // 🔥 CORREÇÃO: Função Assíncrona Imediata que devolve uma Promise<void> nativa garantida
            updatesQueue.push(
              (async () => {
                await supabase.from('tasks').update({ deadline: newIsoDeadline }).eq('id', taskToMove.id);
              })()
            );
            
            hasMutations = true;
          }
        }
      }
    }

    // 6. Execução em Batch Silencioso (Assíncrona)
    if (hasMutations && updatesQueue.length > 0) {
      // Deixamos a Promise.all rodar sem travar a thread principal para não prejudicar a UI
      Promise.all(updatesQueue).catch(err => console.error("Erro no Calendar Auto-Balance:", err));
    }

    // Retorna a matriz limpa e perfeitamente equilibrada instantaneamente para a UI
    return hasMutations ? optimizedTasks : null;
  }

  /**
   * Reagendamento Rápido Manual (Fallback UI)
   */
  static async rescheduleTask(taskId: string, newDateIso: string): Promise<boolean> {
    const { error } = await supabase.from('tasks').update({ deadline: newDateIso }).eq('id', taskId);
    if (error) throw error;
    return true;
  }
}