// src/app/admin/jtbd/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine";
import { CalendarEngine } from "../../../lib/CalendarEngine";
import { NotificationEngine } from "../../../lib/NotificationEngine"; 
import { Loader2, Plus, Flame, User } from "lucide-react";

// VIEWS E COMPONENTES
import PersonalDesk from "./views/PersonalDesk";
import CalendarWidget from "./views/CalendarWidget";
import DailyKanban from "./views/DailyKanban";
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
        const { data: tData } = await supabase.from('profiles').select('*').in('role', ['admin', 'gestor', 'colaborador']).order('nome');
        if (tData) teamData = tData;
        
        const { data: pData } = await supabase.from('projects').select('id, profiles(nome), type, client_id').eq('status', 'active');
        if (pData) setProjects(pData);
      } else {
        teamData = [profile];
      }
      setTeam(teamData);

      const teamIds = teamData.map(t => t.id);
      
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(profiles(nome), type, client_id), agency_subclients(name)')
        .in('assigned_to', teamIds)
        .order('priority_score', { ascending: false }) 
        .order('deadline', { ascending: true });
      
      if (tasksData) {
        const optimizedTasks = await CalendarEngine.optimizeSchedule(tasksData);
        setAllTasks(optimizedTasks || tasksData);
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
        // Rota de Post / Peça Gráfica
        // A entrada em social_posts é criada no momento do Upload, agora apenas mudamos o status.
        await supabase.from('social_posts')
          .update({ status: 'pending_approval' })
          .eq('task_id', task.id);
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

      if (finalStatus === 'completed') {
         await AtelierPMEngine.unlockDependencies(task.id);
         
         // 🟢 SINCRONIZAÇÃO TRELLO NATIVA
         try {
           await syncTaskCompletionToTrello(task.id);
         } catch(e) {
           console.error("Trello Sync Erro:", e);
         }

         showToast("Tarefa Concluída com sucesso!");
         NotificationEngine.notifyManagement("✅ Tarefa Concluída", `A tarefa "${task.title}" de "${task.agency_subclients?.name || task.projects?.profiles?.nome || 'Sem Cliente'}" foi concluída e aprovada.`, "success");
      } else if (finalStatus === 'review') {
         showToast("Tarefa enviada para Revisão Interna!");
         NotificationEngine.notifyManagement("👀 Revisão Solicitada", ` ${currentUser?.nome?.split(' ')[0] || 'Desconhecido'} enviou a tarefa "${task.title}" de "${task.agency_subclients?.name || task.projects?.profiles?.nome || 'Sem Cliente'}" para revisão interna.`, "action");
      }

    } catch (error) {
      showToast("Erro ao sincronizar tarefa.");
      fetchJTBDData();
    }
  };

  const handleReschedule = async (task: any) => {
    setIsRescheduling(task.id);
    try {
      const currentDeadline = new Date(task.deadline);
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

  if (isLoading) return <div className="flex h-full min-h-[400px] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  const viewedUser = team.find(t => t.id === viewingUserId) || currentUser;
  const allUserTasks = allTasks.filter(t => t.assigned_to === viewingUserId);
  
  const displayedTasks = selectedDate 
    ? allUserTasks.filter(t => new Date(t.deadline).toISOString().split('T')[0] === selectedDate)
    : allUserTasks;

  // 🟢 FILTROS DE COLUNAS
  const pendingTasks = displayedTasks.filter(t => t.status === 'pending');
  const inProgressTasks = displayedTasks.filter(t => t.status === 'in_progress');
  
  // 🟢 MÁGICA VISUAL: Tarefas 'pending_client_approval' ficam ancoradas na coluna de revisão, mas o Kanban lidará com a desativação visual dos botões
  const reviewTasks = displayedTasks.filter(t => t.status === 'review');
  
  const now = new Date();
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
      return dateB - dateA; // Mais recentes primeiro
    });

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor';
  const isViewingSelf = viewingUserId === currentUser?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 px-4 md:px-0">
      
      <div className="flex flex-col xl:flex-row gap-6 w-full mt-6 h-full flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA (SIDEBAR COMPACTA) */}
        <div className="flex flex-col gap-6 w-full xl:w-[340px] shrink-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          <PersonalDesk 
            viewedUser={viewedUser}
            isViewingSelf={isViewingSelf}
            allUserTasks={allUserTasks}
          />

          <CalendarWidget 
            currentWeek={currentWeek}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            allUserTasks={allUserTasks}
          />
        </div>

        {/* COLUNA DIREITA (PAINEL PRINCIPAL KANBAN) */}
        <div className="flex-1 flex flex-col h-full pb-6 relative z-10">
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
          />
        </div>
      </div>

      {/* BOTÃO FLUTUANTE (FAB) PARA COMANDOS */}
      {isAdminOrManager && (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col-reverse items-end gap-3 group">
          
          {/* Botão Principal */}
          <button className="w-14 h-14 bg-[var(--color-atelier-terracota)] rounded-full text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105">
            <Plus size={28} />
          </button>

          {/* Menu Oculto */}
          <div className="flex flex-col-reverse items-end gap-3 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 origin-bottom">
            
            {/* Atribuir Prioridade */}
            <button 
              onClick={() => setIsAdHocModalOpen(true)} 
              className="flex items-center gap-2 bg-red-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors font-bold text-sm"
            >
               <span>Atribuir Prioridade</span> <Flame size={18} />
            </button>
            
            {/* Divisor Visual */}
            <div className="w-12 h-[1px] bg-gray-300 mr-2 my-1"></div>

            {/* Avatares da Equipe */}
            {team.map(user => (
              <button 
                key={user.id} 
                onClick={() => setViewingUserId(user.id)} 
                className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-md transition-all border ${viewingUserId === user.id ? 'bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]' : 'bg-white text-[var(--color-atelier-grafite)] border-white/50 hover:bg-gray-50 hover:scale-105'}`}
              >
                <span className="text-sm font-bold">{user.nome.split(" ")[0]}</span>
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-7 h-7 rounded-full object-cover border border-white/20 shadow-inner" alt={user.nome} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shadow-inner"><User size={14}/></div>
                )}
              </button>
            ))}
          </div>

        </div>
      )}

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