// src/app/admin/jtbd/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine";
import { CalendarEngine } from "../../../lib/CalendarEngine";
import { Loader2, Plus, Flame, User } from "lucide-react";

// VIEWS E COMPONENTES
import PersonalDesk from "./views/PersonalDesk";
import CalendarWidget from "./views/CalendarWidget";
import DailyKanban from "./views/DailyKanban";
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
  
  // Ad-Hoc Grenades
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
        
        const { data: pData } = await supabase.from('projects').select('id, profiles(nome), type').eq('status', 'active');
        if (pData) setProjects(pData);
      } else {
        teamData = [profile];
      }
      setTeam(teamData);

      const teamIds = teamData.map(t => t.id);
      
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(profiles(nome), type)')
        .in('assigned_to', teamIds)
        .order('priority_score', { ascending: false }) 
        .order('deadline', { ascending: true });
      
      if (tasksData) {
        const optimizedTasks = await CalendarEngine.optimizeSchedule(tasksData);
        setAllTasks(optimizedTasks || tasksData);
      }

      AtelierPMEngine.prioritizeDailyTriage(profile.id);
    } catch (error) {
      showToast("Erro ao carregar o Centro de Operações.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (task: any, newStatus: string) => {
    if (task.status === newStatus) return;
    try {
      const updates: any = { status: newStatus };
      const now = new Date();

      if (newStatus === 'in_progress') updates.started_at = now.toISOString();

      if (task.status === 'in_progress' && task.started_at) {
        const startTime = new Date(task.started_at).getTime();
        const diffMinutes = Math.floor((now.getTime() - startTime) / 60000);
        updates.actual_time = (task.actual_time || 0) + diffMinutes;
        updates.started_at = null; 
      }

      if (newStatus === 'review' || newStatus === 'completed') {
        updates.completed_at = now.toISOString();
        if (newStatus === 'completed') {
           await AtelierPMEngine.unlockDependencies(task.id);
        }
      }

      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t));

      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
      if (error) throw error;

    } catch (error) {
      showToast("Erro ao sincronizar missão.");
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
      showToast("Missão adiada para o próximo dia útil.");
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
      showToast("🔥 Granada injetada com sucesso!");
      setIsAdHocModalOpen(false);
      setAdHocForm({ title: "", projectId: "", assigneeId: "", estTime: 60, deadline: "", description: "" });
      fetchJTBDData();
    } catch (e) {
      showToast("Falha ao disparar granada.");
    } finally {
      setAdHocProcessing(false);
    }
  };

  if (isLoading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  const viewedUser = team.find(t => t.id === viewingUserId) || currentUser;
  const allUserTasks = allTasks.filter(t => t.assigned_to === viewingUserId);
  
  const displayedTasks = selectedDate 
    ? allUserTasks.filter(t => new Date(t.deadline).toISOString().split('T')[0] === selectedDate)
    : allUserTasks;

  const pendingTasks = displayedTasks.filter(t => t.status === 'pending');
  const inProgressTasks = displayedTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = displayedTasks.filter(t => t.status === 'review');
  const completedTasks = displayedTasks.filter(t => t.status === 'completed').slice(0, 20); 

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor';
  const isViewingSelf = viewingUserId === currentUser?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 px-4 md:px-0 overflow-hidden">
      
      <div className="flex flex-col xl:flex-row gap-6 w-full mt-6 h-full min-h-0">
        
        {/* COLUNA ESQUERDA (SIDEBAR COMPACTA) */}
        <div className="flex flex-col gap-6 w-full xl:w-[340px] shrink-0 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar pr-2 pb-6">
          
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

        {/* COLUNA DIREITA (CHÃO DE FÁBRICA KANBAN - OCUPA TODA A ALTURA) */}
        <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-80px)] pb-6">
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

          {/* Menu Oculto (Aparece ao passar o rato na área) */}
          <div className="flex flex-col-reverse items-end gap-3 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 origin-bottom">
            
            {/* Lançar Granada */}
            <button 
              onClick={() => setIsAdHocModalOpen(true)} 
              className="flex items-center gap-2 bg-red-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors font-bold text-sm"
            >
               <span>Lançar Granada</span> <Flame size={18} />
            </button>
            
            {/* Divisor Visual */}
            <div className="w-12 h-[1px] bg-gray-300 mr-2 my-1"></div>

            {/* Avatares da Equipa */}
            {team.map(user => (
              <button 
                key={user.id} 
                onClick={() => setViewingUserId(user.id)} 
                className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-md transition-all border ${viewingUserId === user.id ? 'bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:scale-105'}`}
              >
                <span className="text-sm font-bold">{user.nome.split(" ")[0]}</span>
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-7 h-7 rounded-full object-cover border border-white/20" alt={user.nome} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><User size={14}/></div>
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
        earnedExpToast={{ show: false, amount: 0, msg: "" }} // Como removemos a gamificação, passamos um state vazio para o toast não quebrar
      />

    </div>
  );
}