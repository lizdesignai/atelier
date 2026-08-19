"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine";
import { CalendarEngine } from "../../../lib/CalendarEngine";
import { NotificationEngine } from "../../../lib/NotificationEngine"; 
import { Loader2, Plus, Flame, User } from "lucide-react";

// VIEWS E COMPONENTES
import PersonalDesk from "./views/PersonalDesk";
import CalendarWidget from "./views/CalendarWidget";
import DailyKanban from "./views/DailyKanban";
import JTBDMobileView from "./views/JTBDMobileView";
import ClientSwitcherFAB from "./components/ClientSwitcherFAB";
import TaskCard from "./components/TaskCard";
import { format, addBusinessDays, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { syncTaskCompletionToTrello } from "../../../lib/trelloSync";
import JTBDModals from "./components/JTBDModals";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function JTBDPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // God Mode (Switching Users)
  const [team, setTeam] = useState<any[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>(""); 
  
  // Tasks Global State
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // 📅 Calendário States
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null);
  
  // Atribuição de Tarefas Ad-Hoc
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [adHocProcessing, setAdHocProcessing] = useState(false);
  const [adHocForm, setAdHocForm] = useState({ title: "", projectId: "", assigneeId: "", estTime: 60, deadline: "", description: "" });

  // ⚡ Focus Mode & Client Switching States
  const [focusMode, setFocusMode] = useState<'urgent' | 'monthly'>('urgent');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);

  // Lógica de Paginação da Semana (Offset)
  useEffect(() => {
    const getOffsetWeek = (offset: number) => {
      const curr = new Date();
      curr.setDate(curr.getDate() + (offset * 7));
      const week = [];
      for (let i = 0; i < 7; i++) {
        const first = curr.getDate() - curr.getDay() + i;
        const day = new Date(curr.setDate(first));
        week.push(day);
      }
      return week;
    };
    setCurrentWeek(getOffsetWeek(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    const bootEngine = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const adminId = session.user.id; 

        // Run daily maintenance tasks in the background without blocking UI
        Promise.all([
          AtelierPMEngine.executeDailyWorkloadAllocation(),
          AtelierPMEngine.runDailyRiskMitigation(adminId),
          AtelierPMEngine.calibrateUnitEconomics(adminId)
        ]).catch(console.error);
      } catch (e) {
        console.error("Engine boot failed", e);
      }
    };

    bootEngine();
  }, []);

  // Fetch Inicial
  useEffect(() => {
    fetchJTBDData();
    const handleAutoRefresh = () => fetchJTBDData();
    window.addEventListener("jtbdRefreshNeeded", handleAutoRefresh);
    return () => window.removeEventListener("jtbdRefreshNeeded", handleAutoRefresh);
  }, []);

  // Fetch assigned clients whenever viewingUserId changes
  useEffect(() => {
    if (!viewingUserId) return;
    const fetchAssigned = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      try {
        const resAssigned = await fetch(`${backendUrl}/api/v1/focus/assigned-clients/${viewingUserId}`);
        if (resAssigned.ok) {
          const { data: clientsData } = await resAssigned.json();
          setAssignedClients(clientsData || []);
        }
      } catch (cErr) {
        console.warn("Failed to fetch assigned clients for FAB:", cErr);
      }
    };
    fetchAssigned();
  }, [viewingUserId]);

  const fetchJTBDData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setCurrentUser(profile);
      setViewingUserId(profile.id);

      let teamData = [];
      if (profile.role === 'admin' || profile.role === 'gestor') {
        const [tDataRes, pDataRes] = await Promise.all([
          supabase.from('profiles').select('*').in('role', ['admin', 'gestor', 'colaborador']).order('nome'),
          supabase.from('projects').select('id, profiles(nome), type, client_id').eq('status', 'active')
        ]);
        
        if (tDataRes.data) teamData = tDataRes.data.filter((t: any) => t.status !== 'paused' && !t.is_paused);
        if (pDataRes.data) setProjects(pDataRes.data);
      } else {
        teamData = [profile];
      }
      setTeam(teamData);

      const teamIds = teamData.map(t => t.id);
      
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(profiles(nome), type, client_id), agency_subclients(id, name, trello_url), social_posts(image_url, status, created_at)')
        .in('assigned_to', teamIds)
        .order('priority_score', { ascending: false, nullsFirst: false }) 
        .order('deadline', { ascending: true });
      
      if (tasksData) {
        // Ordenação rigorosa em memória pelo prazo mais apertado (considerando a brevidade)
        tasksData.sort((a, b) => {
          const dateA = new Date(a.internal_deadline || a.deadline).getTime();
          const dateB = new Date(b.internal_deadline || b.deadline).getTime();
          if (dateA !== dateB) return dateA - dateB;
          // Desempate por priority_score
          const scoreA = a.priority_score || 0;
          const scoreB = b.priority_score || 0;
          return scoreB - scoreA;
        });

        const optimizedTasks = await CalendarEngine.optimizeSchedule(tasksData);
        const finalTasks = optimizedTasks || tasksData;

        // ==========================================
        // COTA DE PRODUTIVIDADE (FOCO DIÁRIO) EM LOTES DE 5
        // ==========================================
        const byAssignee: Record<string, any[]> = {};
        finalTasks.forEach(t => {
          if (t.status === 'pending' || t.status === 'in_progress') {
            if (!byAssignee[t.assigned_to]) byAssignee[t.assigned_to] = [];
            byAssignee[t.assigned_to].push(t);
          }
        });

        const now = new Date();
        let startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Se hoje for fim de semana ou já passou do horário comercial (18h),
        // a esteira de produtividade já foca automaticamente no próximo dia útil.
        if (isWeekend(startOfToday) || now.getHours() >= 18) {
          startOfToday = addBusinessDays(startOfToday, 1);
        }

        Object.values(byAssignee).forEach(assigneeTasks => {
          // Espelhar exatamente a ordem visual do DailyKanban:
          // 1º in_progress, 2º pending (mantendo a ordenação por urgência/valor original)
          const inProgress = assigneeTasks.filter(t => t.status === 'in_progress');
          const pending = assigneeTasks.filter(t => t.status === 'pending');
          const sortedAssigneeTasks = [...inProgress, ...pending];
          
          for (let i = 0; i < sortedAssigneeTasks.length; i++) {
             const task = sortedAssigneeTasks[i];
             const batchIndex = Math.floor(i / 5);
             const rawTargetDate = addBusinessDays(startOfToday, batchIndex);
             
             // Forçamos a esteira diária ignorando o prazo real
             task.productivity_deadline = rawTargetDate.toISOString();
             
             // Lógica inteligente de Label
             const targetTime = rawTargetDate.getTime();
             const realTodayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
             const diffDays = Math.round((targetTime - realTodayTime) / (1000 * 60 * 60 * 24));
             
             if (batchIndex === 0) {
               task.productivity_label = "HOJE";
             } else if (batchIndex === 1) {
               task.productivity_label = "AMANHÃ";
             } else {
               task.productivity_label = rawTargetDate.toLocaleDateString('pt-BR');
             }
             
             // O usuário solicitou explicitamente: "iremos conservar a data abreviada"
             // Portanto, NÃO substituímos o internal_deadline (data abreviada).
             // A view (TaskCard) usará o productivity_deadline para exibição.
          }
        });

        setAllTasks([...finalTasks]);

        // ==========================================
        // URL DINÂMICA: Abrir tarefa se estiver na URL
        // ==========================================
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const taskIdFromUrl = params.get("task");
          if (taskIdFromUrl) {
            const taskToOpen = finalTasks.find(t => t.id === taskIdFromUrl);
            if (taskToOpen) {
              setActiveTaskModal({
                task: taskToOpen,
                isFocus: true, // Ou poderíamos calcular com base em focusMode
                isReview: taskToOpen.status === 'review',
                isCompleted: taskToOpen.status === 'completed' || taskToOpen.status === 'pending_client_approval'
              });
            }
          }
        }
      }

      AtelierPMEngine.prioritizeDailyTriage(profile.id);
    } catch (error) {
      showToast("Erro ao carregar a Mesa de Trabalho.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 🚀 MOTORES DE ROTEAMENTO (FASE 2)
  // ==========================================================================
  const handleClientApprovalRouting = async (task: any) => {
    // 1. O Gestor tentou "Aprovar" (Concluir) uma tarefa que tem ficheiro anexado.
    // Em vez de fechar, nós enviamos a bola para o Cockpit do Cliente.
    try {
      const isPlanning = task.title?.toLowerCase().includes('planejamento') || task.title?.toLowerCase().includes('estratégia');
      const clientId = task.projects?.client_id;
      
      if (!clientId) {
        showToast("Projeto sem cliente associado. Tarefa concluída internamente.");
        return 'completed'; // Se não há cliente para aprovar, fecha a tarefa.
      }

      showToast("Encaminhando para aprovação do cliente...");

      if (isPlanning) {
        // Rota de Planejamento Mensal (PDF)
        await supabase.from('content_planning').insert({
          project_id: task.project_id,
          client_id: clientId,
          hook: task.title,
          planning_file_url: task.attachment_url,
          status: 'awaiting_approval',
          is_avulso: true,
          created_at: new Date().toISOString()
        });
      } else {
        // Rota de Post / Peça Gráfica ou Tarefa Genérica
        const { data: existingPost } = await supabase
          .from('social_posts')
          .select('id')
          .eq('task_id', task.id)
          .limit(1)
          .maybeSingle();
          
        if (existingPost) {
          await supabase.from('social_posts')
            .update({ status: 'pending_approval' })
            .eq('task_id', task.id);
        }
      }

      // Notifica o cliente
      await NotificationEngine.notifyUser(
        clientId,
        isPlanning ? "📅 Planejamento Disponível" : "🎨 Arte Aguardando Avaliação",
        `Há material referente a "${task.title}" aguardando sua validação no painel.`,
        "action",
        "/cockpit"
      );

      return 'pending_client_approval'; // Retorna o novo status real
    } catch (e) {
      console.error("Erro no roteamento para o cliente", e);
      showToast("Erro ao enviar ao cliente. Mantida em revisão.");
      return 'review';
    }
  };

  const updateTaskStatus = async (task: any, requestedStatus: string) => {
    if (task.status === requestedStatus) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      
      // 🟢 O Roteador Interceptador Local (Se precisar, podemos passar isso pro backend no futuro)
      let finalStatus = requestedStatus;
      if (requestedStatus === 'completed' && task.attachment_url && task.status !== 'pending_client_approval') {
        finalStatus = await handleClientApprovalRouting(task);
      }

      // 🟢 Atualização Otimista na UI
      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: finalStatus } : t));

      // 🟢 Chamada ao nosso novo Backend Ultrarrápido
      const response = await fetch(`${backendUrl}/api/v1/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestedStatus: finalStatus, 
          task,
          collaboratorName: currentUser?.nome?.split(' ')[0] || 'Desconhecido'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar status no backend');
      }

      const { data } = await response.json();

      // Atualiza com os tempos reais calculados no backend
      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...data } : t));

      if (finalStatus === 'in_progress') {
         showToast("Tarefa iniciada com sucesso!");
         window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      } else if (finalStatus === 'completed' || finalStatus === 'pending_client_approval') {
         if (finalStatus === 'completed') {
           await AtelierPMEngine.unlockDependencies(task.id);
           
           // 🟢 SINCRONIZAÇÃO TRELLO NATIVA
           try {
             await syncTaskCompletionToTrello(task);
           } catch(e) {
             console.error("Trello Sync Erro:", e);
           }
         }
         showToast("Tarefa Aprovada com sucesso!");
         window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      } else if (finalStatus === 'review') {
         showToast("Tarefa enviada para revisão interna!");
         window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
      }
    } catch (error) {
      showToast("Erro ao sincronizar tarefa.");
      fetchJTBDData();
    }
  };

  const handleReschedule = async (task: any) => {
    setIsRescheduling(task.id);
    try {
      const currentDeadline = new Date(task.internal_deadline || task.deadline);
      let nextDay = new Date(currentDeadline);
      
      do {
        nextDay.setDate(nextDay.getDate() + 1);
      } while (nextDay.getDay() === 0 || nextDay.getDay() === 6);

      const newDateStr = nextDay.toISOString();
      
      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, deadline: newDateStr } : t));
      
      await CalendarEngine.rescheduleTask(task.id, newDateStr);
      showToast("Tarefa adiada para o próximo dia útil.");
    } catch (e) {
      showToast("Erro ao reagendar.");
      fetchJTBDData();
    } finally {
      setIsRescheduling(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    
    const task = allTasks.find(t => t.id === taskId);
    if (task && !task.is_blocked) {
      updateTaskStatus(task, newStatus);
    } else if (task?.is_blocked) {
      showToast("Operação bloqueada. Conclua as dependências primeiro.");
    }
  };

  const handleFireGrenade = async () => {
    if (!adHocForm.title || !adHocForm.projectId || !adHocForm.assigneeId || !adHocForm.deadline) return;
    setAdHocProcessing(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: adHocForm.projectId,
        assigned_to: adHocForm.assigneeId,
        creator_id: currentUser.id,
        title: adHocForm.title,
        description: adHocForm.description,
        estimated_time: adHocForm.estTime,
        deadline: new Date(adHocForm.deadline).toISOString(),
        urgency: true, 
        status: 'pending',
        task_type: 'setup',
        stage: 'Ad-Hoc (Urgência)'
      });

      if (error) throw error;
      
      if (adHocForm.assigneeId !== currentUser.id) {
         await NotificationEngine.notifyUser(
           adHocForm.assigneeId,
           "🔥 Nova Demanda Urgente",
           `A gestão atribuiu-lhe a seguinte tarefa com prioridade máxima: ${adHocForm.title}`,
           "warning",
           "/admin/jtbd"
         );
      }

      showToast("🔥 Prioridade atribuída com sucesso!");
      setIsAdHocModalOpen(false);
      setAdHocForm({ title: "", projectId: "", assigneeId: "", estTime: 60, deadline: "", description: "" });
      fetchJTBDData();
    } catch (e) {
      showToast("Falha ao atribuir prioridade.");
    } finally {
      setAdHocProcessing(false);
    }
  };

  const [activeTaskModal, setActiveTaskModal] = useState<{task: any, isFocus: boolean, isReview: boolean, isCompleted: boolean} | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (activeTaskModal?.task?.id) {
        window.history.replaceState({}, '', `?task=${activeTaskModal.task.id}`);
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [activeTaskModal]);

  if (isLoading) return <div className="flex h-full min-h-[400px] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  const viewedUser = team.find(t => t.id === viewingUserId) || currentUser;
  
  // 🟢 INVARIÁVEL: Tarefas do colaborador ativo para métricas precisas (Eficiência % e Horas)
  const userAllAssignedTasks = allTasks.filter(t => t.assigned_to === viewingUserId);

  // Tasks assigned to viewed user or filtered by selected client (still scoped to viewed user)
  const allUserTasks = (focusMode === 'monthly' && selectedClient)
    ? allTasks.filter(t => t.assigned_to === viewingUserId && (selectedClient.type === 'project' ? t.project_id === selectedClient.id : t.subclient_id === selectedClient.id))
    : userAllAssignedTasks;
  
  const now = new Date();
  const displayedTasks = focusMode === 'urgent'
    ? allUserTasks.filter(t => {
        if (selectedDate) {
          const effectiveDeadline = t.internal_deadline || t.deadline;
          if (!effectiveDeadline) return false;
          try {
            const d = new Date(effectiveDeadline);
            return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === selectedDate;
          } catch {
            return false;
          }
        }
        // Se for a tela inicial sem filtro de data, exibimos as próximas demandas em aberto
        return t.status !== 'completed' && t.status !== 'pending_client_approval';
      }).slice(0, selectedDate ? undefined : 10) // Limitadas a 10 prioridades
    : allUserTasks.filter(t => {
        if (selectedClient) {
          if (selectedClient.type === 'project') return t.project_id === selectedClient.id;
          if (selectedClient.type === 'subclient') return t.subclient_id === selectedClient.id;
        }
        return true;
      });

  // 🟢 FILTROS DE COLUNAS
  const pendingTasks = displayedTasks.filter(t => t.status === 'pending' || t.status === 'draft');
  const inProgressTasks = displayedTasks.filter(t => t.status === 'in_progress');
  
  // 🟢 MÁGICA VISUAL: Tarefas 'pending_client_approval' ficam ancoradas na coluna de revisão
  const reviewTasks = displayedTasks.filter(t => t.status === 'review');
  
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const completedTasks = allUserTasks
    .filter(t => t.status === 'completed' || t.status === 'pending_client_approval')
    .filter(t => {
      const dateToCheck = t.completed_at ? new Date(t.completed_at) : (t.updated_at ? new Date(t.updated_at) : new Date(t.deadline));
      return dateToCheck.getMonth() === currentMonth && dateToCheck.getFullYear() === currentYear;
    })
    .sort((a, b) => {
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : 0);
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : 0);
      return dateB - dateA;
    });

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor';
  const isViewingSelf = viewingUserId === currentUser?.id;

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] lg:h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 px-4 overflow-hidden">
      
      {/* MOBILE VIEW (LG:HIDDEN) */}
      <JTBDMobileView 
        currentUser={currentUser}
        viewedUser={viewedUser}
        isViewingSelf={isViewingSelf}
        allUserTasks={allUserTasks}
        allTasks={allTasks}
        assignedClients={assignedClients}
        selectedClient={selectedClient}
        onSelectClient={(client) => {
          if (!client || selectedClient?.id === client?.id) {
            setSelectedClient(null);
            setFocusMode('urgent');
          } else {
            setSelectedClient(client);
            setFocusMode('monthly');
            setSelectedDate(null);
          }
        }}
        isAdminOrManager={isAdminOrManager}
        onOpenTaskModal={(task, isFocus, isReview, isCompleted) => {
          setActiveTaskModal({ 
            task, 
            isFocus: Boolean(isFocus || task?.status === 'in_progress'), 
            isReview: Boolean(isReview || task?.status === 'review'), 
            isCompleted: Boolean(isCompleted || task?.status === 'completed') 
          });
        }}
        updateTaskStatus={updateTaskStatus}
      />

      {/* DESKTOP VIEW (HIDDEN LG:FLEX - COMPLETA E INTOCADA) */}
      <div className="hidden lg:flex gap-6 w-full mt-6 h-full flex-1 min-h-0 overflow-hidden">
        
        {/* COLUNA ESQUERDA (SIDEBAR COMPACTA) */}
        <div className="flex flex-col gap-6 w-[340px] shrink-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          <PersonalDesk 
            viewedUser={viewedUser}
            isViewingSelf={isViewingSelf}
            allUserTasks={userAllAssignedTasks}
          />

          <CalendarWidget 
            currentWeek={currentWeek}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            allUserTasks={userAllAssignedTasks}
          />
        </div>

        {/* COLUNA DIREITA (PAINEL PRINCIPAL KANBAN) */}
        <div className="flex-1 flex flex-col h-full pb-6 relative z-10 overflow-hidden">
          <DailyKanban 
            pendingTasks={pendingTasks}
            inProgressTasks={inProgressTasks}
            reviewTasks={reviewTasks}
            completedTasks={completedTasks}
            isAdminOrManager={isAdminOrManager}
            updateTaskStatus={updateTaskStatus}
            handleReschedule={handleReschedule}
            isRescheduling={isRescheduling}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            teamData={team}
            currentUser={currentUser}
            selectedClient={selectedClient}
          />
        </div>
      </div>

      {/* RECYCLED FAB FOR ALL ROLES */}
      <ClientSwitcherFAB 
        userRole={currentUser?.role || 'colaborador'}
        team={team}
        assignedClients={assignedClients}
        currentMode={focusMode}
        selectedClient={selectedClient}
        viewingUserId={viewingUserId}
        onSelectUrgentView={() => {
          setFocusMode('urgent');
          setSelectedClient(null);
        }}
        onSelectClient={(client) => {
          setSelectedClient(client);
          setFocusMode('monthly');
          setSelectedDate(null);
        }}
        onSelectTeamMember={(userId) => {
          setViewingUserId(userId);
        }}
        onOpenAdHocModal={() => setIsAdHocModalOpen(true)}
      />

      {/* GLOBAL TASK CARD MODAL */}
      <AnimatePresence>
        {activeTaskModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
              onClick={() => setActiveTaskModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative z-10 w-full max-w-lg pointer-events-auto shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden my-auto max-h-[85vh] flex flex-col"
            >
              <TaskCard 
                task={activeTaskModal.task} 
                isFocus={activeTaskModal.isFocus}
                isReview={activeTaskModal.isReview}
                isCompleted={activeTaskModal.isCompleted}
                isAdmin={isAdminOrManager} 
                onAction={(newStatus: string) => {
                  updateTaskStatus(activeTaskModal.task, newStatus);
                  setActiveTaskModal(null);
                }} 
                onReschedule={() => {
                  handleReschedule(activeTaskModal.task);
                  setActiveTaskModal(null);
                }} 
                isRescheduling={isRescheduling === activeTaskModal.task.id}
                forceOpenModal={true} 
                currentUser={currentUser}
                onCloseModal={() => setActiveTaskModal(null)}
                onRevert={(taskId) => {
                  updateTaskStatus(activeTaskModal.task, 'review');
                  setActiveTaskModal(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAIS GLOBAIS */}
      <JTBDModals 
        isAdHocModalOpen={isAdHocModalOpen}
        setIsAdHocModalOpen={setIsAdHocModalOpen}
        adHocForm={adHocForm}
        setAdHocForm={setAdHocForm}
        projects={projects}
        team={team}
        handleFireGrenade={handleFireGrenade}
        adHocProcessing={adHocProcessing}
        earnedExpToast={{ show: false, amount: 0, msg: "" }} 
      />

    </div>
  );
}