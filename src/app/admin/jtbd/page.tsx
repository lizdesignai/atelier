// src/app/admin/jtbd/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  PlayCircle, PauseCircle, CheckCircle2, Clock, Flame, 
  Loader2, AlertTriangle, Crosshair, Plus, X, 
  ChevronRight, Award, UserCircle2, Star, Zap, Target, Eye, Activity
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const getNextLevelExp = (currentExp: number) => {
  if (currentExp < 500) return 500;
  if (currentExp < 1500) return 1500;
  if (currentExp < 3000) return 3000;
  return 5000;
};

export default function JTBDPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // God Mode (Switching Users)
  const [team, setTeam] = useState<any[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>(""); 
  
  // Tasks Global State
  const [allTasks, setAllTasks] = useState<any[]>([]);
  
  // Ad-Hoc Grenades
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [adHocProcessing, setAdHocProcessing] = useState(false);
  const [adHocForm, setAdHocForm] = useState({ title: "", projectId: "", assigneeId: "", estTime: 60, deadline: "", description: "" });

  // Feedback Gamificação
  const [earnedExpToast, setEarnedExpToast] = useState<{show: boolean, amount: number, msg: string}>({ show: false, amount: 0, msg: "" });

  useEffect(() => {
    fetchJTBDData();
  }, []);

  const fetchJTBDData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('*, team_performance(*)').eq('id', session.user.id).single();
      setCurrentUser(profile);
      setViewingUserId(profile.id); // Inicia vendo o próprio quadro

      let teamData = [];
      if (profile.role === 'admin' || profile.role === 'gestor') {
        const { data: tData } = await supabase.from('profiles').select('*, team_performance(*)').in('role', ['admin', 'gestor', 'colaborador']).order('nome');
        if (tData) teamData = tData;
        
        const { data: pData } = await supabase.from('projects').select('id, profiles(nome), type').eq('status', 'active');
        if (pData) setProjects(pData);
      } else {
        teamData = [profile]; // Colaborador só vê ele mesmo
      }
      setTeam(teamData);

      const teamIds = teamData.map(t => t.id);
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(profiles(nome), type)')
        .in('assigned_to', teamIds)
        .order('urgency', { ascending: false })
        .order('deadline', { ascending: true });
      
      if (tasksData) setAllTasks(tasksData);

    } catch (error) {
      showToast("Erro ao carregar o Centro de Operações.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // MOTOR DE TEMPO E ESTADOS
  // ============================================================================
  const updateTaskStatus = async (task: any, newStatus: string) => {
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
           await processGamification(task, updates.actual_time || task.actual_time);
        }
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
      if (error) throw error;

      fetchJTBDData(); 
    } catch (error) {
      showToast("Erro ao sincronizar missão.");
    }
  };

  // ============================================================================
  // ALGORITMO DE GAMIFICAÇÃO
  // ============================================================================
  const processGamification = async (task: any, totalMinutes: number) => {
    if (!currentUser) return;
    
    let expEarned = 0;
    let msg = "";

    const deadlineDate = new Date(task.deadline);
    const isLate = new Date() > deadlineDate;
    const isUnderTime = totalMinutes <= task.estimated_time;

    if (isLate) {
      expEarned -= 50;
      msg = "Prazo estourado. Missão penalizada.";
    } else {
      expEarned += 50; 
      msg = "Missão cumprida no prazo!";
      if (isUnderTime) {
        expEarned += 50; 
        msg = "Eficiência tática! Abaixo do tempo estimado.";
      }
    }

    if (task.urgency) {
      expEarned += 100;
      msg = "Granada desarmada! Bônus de urgência.";
    }

    try {
      const { data: perf } = await supabase.from('team_performance').select('*').eq('user_id', task.assigned_to).single();
      if (perf) {
        await supabase.from('team_performance').update({
          exp_points: Math.max(0, perf.exp_points + expEarned),
          total_tasks_completed: perf.total_tasks_completed + 1
        }).eq('user_id', task.assigned_to);
        
        // Só mostra o toast se a pessoa que concluiu for a mesma que está a ver a tela
        if (currentUser.id === task.assigned_to) {
          setEarnedExpToast({ show: true, amount: expEarned, msg });
          setTimeout(() => setEarnedExpToast({ show: false, amount: 0, msg: "" }), 4000);
        }
      }
    } catch (e) {
      console.error("Erro ao aplicar EXP.");
    }
  };

  // ============================================================================
  // DISPARAR GRANADA (Ad-Hoc)
  // ============================================================================
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

  // Variáveis do Usuário Visualizado (Viewed User)
  const viewedUser = team.find(t => t.id === viewingUserId) || currentUser;
  const viewedUserPerf = viewedUser?.team_performance?.[0] || { exp_points: 0, level_name: 'Aprendiz', total_tasks_completed: 0, avg_tnps: 10 };
  const nextLevelExp = getNextLevelExp(viewedUserPerf.exp_points);
  const expProgress = Math.min((viewedUserPerf.exp_points / nextLevelExp) * 100, 100);

  // Tarefas do Usuário Visualizado
  const displayedTasks = allTasks.filter(t => t.assigned_to === viewingUserId);
  const pendingTasks = displayedTasks.filter(t => t.status === 'pending');
  const inProgressTasks = displayedTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = displayedTasks.filter(t => t.status === 'review');
  const completedTasks = displayedTasks.filter(t => t.status === 'completed').slice(0, 20); 

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor';
  const isViewingSelf = viewingUserId === currentUser.id;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* =========================================================================
          1. WIDGET DE IMERSÃO E IDENTIFICAÇÃO (ATELIER OS COCKPIT)
          ========================================================================= */}
      <div className="shrink-0 flex flex-col gap-6 animate-[fadeInUp_0.5s_ease-out] mt-6">
        
        {/* Barra de Comando (God Mode Switcher) */}
        {isAdminOrManager && (
          <div className="glass-panel p-3 rounded-2xl bg-white/40 border border-white flex items-center justify-between shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 shrink-0 border-r border-[var(--color-atelier-grafite)]/10 mr-2">
              <Eye size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Visão de Comando</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-1 pr-4">
              {team.map(member => (
                <button 
                  key={member.id} 
                  onClick={() => setViewingUserId(member.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border ${viewingUserId === member.id ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent shadow-md' : 'bg-white/50 text-[var(--color-atelier-grafite)]/60 hover:bg-white border-white'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--color-atelier-creme)] overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--color-atelier-terracota)]">
                    {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : member.nome.charAt(0)}
                  </div>
                  <span className="font-roboto text-[11px] font-bold">{member.nome.split(" ")[0]}</span>
                  {viewingUserId === member.id && <CheckCircle2 size={12} className="ml-1 opacity-50"/>}
                </button>
              ))}
            </div>
            <button onClick={() => setIsAdHocModalOpen(true)} className="ml-4 shrink-0 bg-orange-500 text-white px-5 py-2 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-md flex items-center gap-2">
              <Flame size={12} /> Disparar Granada
            </button>
          </div>
        )}

        {/* Cockpit Pessoal do Usuário Visualizado */}
        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="absolute right-[-10%] top-[-20%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[80px] pointer-events-none"></div>
          
          {/* IDENTIFICAÇÃO E GAMIFICAÇÃO */}
          <div className="flex items-center gap-6 w-full md:w-auto relative z-10">
            <div className="relative">
              {/* Anel de Pulso */}
              <div className="absolute inset-[-6px] rounded-full border-2 border-[var(--color-atelier-terracota)]/30 border-t-[var(--color-atelier-terracota)] animate-spin" style={{ animationDuration: '3s' }}></div>
              <div className="w-24 h-24 rounded-full bg-white/10 overflow-hidden border border-white/20 flex items-center justify-center text-4xl font-elegant text-white shadow-inner relative z-10">
                {viewedUser.avatar_url ? <img src={viewedUser.avatar_url} className="w-full h-full object-cover"/> : viewedUser.nome.charAt(0)}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 flex items-center gap-2 mb-1">
                {isViewingSelf ? 'Mesa de Trabalho Pessoal' : 'Modo Espectador Ativo'} {isViewingSelf && <CheckCircle2 size={10} className="text-green-400"/>}
              </span>
              <h2 className="font-elegant text-4xl text-white tracking-wide">{viewedUser.nome}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="bg-white/10 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-white/80">{viewedUser.role}</span>
                <span className="text-[11px] font-bold text-[var(--color-atelier-terracota)] tracking-widest uppercase flex items-center gap-1">
                  <Award size={12}/> Nível: {viewedUserPerf.level_name}
                </span>
              </div>
              {/* Barra de EXP */}
              <div className="flex items-center gap-3 mt-4">
                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${expProgress}%` }} className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] rounded-full"></motion.div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{viewedUserPerf.exp_points} / {nextLevelExp} XP</span>
              </div>
            </div>
          </div>

          {/* WIDGETS TÁTICOS (MÉTRICAS DO USUÁRIO) */}
          <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition-colors">
              <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/40 mb-2">Foco Atual</span>
              <span className="font-roboto font-bold text-[13px] text-blue-300 leading-tight line-clamp-2">
                {inProgressTasks.length > 0 ? inProgressTasks[0].title : "Nenhuma Missão Ativa."}
              </span>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition-colors">
              <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/40 mb-2 flex items-center gap-1"><Crosshair size={10}/> Eficiência</span>
              <div className="flex items-end gap-2">
                <span className="font-elegant text-3xl text-white leading-none">{completedTasks.length}</span>
                <span className="text-[10px] text-white/40 pb-0.5">Missões Feitas</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:bg-white/10 transition-colors">
              <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/40 mb-2 flex items-center gap-1"><Star size={10}/> T-NPS Pessoal</span>
              <div className="flex items-end gap-2">
                <span className="font-elegant text-3xl text-green-400 leading-none">{viewedUserPerf.avg_tnps}</span>
                <span className="text-[10px] text-white/40 pb-0.5">Média / 10</span>
              </div>
            </div>

            <div className="bg-[var(--color-atelier-terracota)]/20 border border-[var(--color-atelier-terracota)]/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-[var(--color-atelier-terracota)]/30 transition-colors">
              <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-2 flex items-center gap-1"><Zap size={10}/> Carga Visível</span>
              <div className="flex items-end gap-2">
                <span className="font-elegant text-3xl text-white leading-none">{pendingTasks.length}</span>
                <span className="text-[10px] text-white/60 pb-0.5">Na Fila</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK GAMIFICAÇÃO NA TELA */}
      <AnimatePresence>
        {earnedExpToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-[200] bg-[var(--color-atelier-grafite)] text-white p-6 rounded-3xl shadow-2xl flex items-center gap-5 border border-white/10"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${earnedExpToast.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <Award size={28} />
            </div>
            <div className="flex flex-col">
              <span className={`font-elegant text-3xl leading-none ${earnedExpToast.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {earnedExpToast.amount > 0 ? '+' : ''}{earnedExpToast.amount} EXP
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest text-white/50 mt-1">{earnedExpToast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          2. O KANBAN SILENCIOSO (Chão de Fábrica Premium)
          ========================================================================= */}
      <div className="flex-1 flex gap-6 overflow-x-auto custom-scrollbar pb-4 min-h-[550px] animate-[fadeInUp_0.7s_ease-out]">
        
        {/* COLUNA 1: FILA DE ESPERA */}
        <div className="flex flex-col min-w-[340px] max-w-[340px] bg-white/40 p-5 rounded-[2.5rem] border border-white h-full shadow-sm">
          <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <Clock size={18} className="text-[var(--color-atelier-grafite)]/40"/> Fila de Espera
            </h3>
            <span className="bg-white px-2.5 py-1 rounded-md text-[11px] font-bold text-[var(--color-atelier-grafite)]/60 shadow-sm border border-[var(--color-atelier-grafite)]/5">{pendingTasks.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {pendingTasks.map(task => <TaskCard key={task.id} task={task} isAdmin={isAdminOrManager} onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} />)}
            {pendingTasks.length === 0 && <div className="text-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10">Fila Vazia</div>}
          </div>
        </div>

        {/* COLUNA 2: EM FOCO (TIMER ATIVO) */}
        <div className="flex flex-col min-w-[340px] max-w-[340px] bg-blue-50/70 p-5 rounded-[2.5rem] border border-blue-200 h-full shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1.5 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
          <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-blue-200/50 pb-4 relative z-10">
            <h3 className="font-elegant text-2xl text-blue-900 flex items-center gap-2">
              <Crosshair size={18} className="text-blue-500"/> Em Foco <span className="text-[10px] font-sans uppercase font-bold tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded animate-pulse">Live</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 relative z-10">
            {inProgressTasks.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                 <PlayCircle size={48} className="mb-4 text-blue-500 opacity-50"/>
                 <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-blue-900">Puxe uma missão da fila para iniciar o cronómetro.</span>
               </div>
            ) : (
              inProgressTasks.map(task => <TaskCard key={task.id} task={task} isFocus isAdmin={isAdminOrManager} onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} />)
            )}
          </div>
        </div>

        {/* COLUNA 3: AGUARDANDO REVISÃO */}
        <div className="flex flex-col min-w-[340px] max-w-[340px] bg-orange-50/70 p-5 rounded-[2.5rem] border border-orange-200 h-full shadow-sm relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-orange-200/50 pb-4 relative z-10">
            <h3 className="font-elegant text-2xl text-orange-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500"/> Revisão Interna
            </h3>
            <span className="bg-white px-2.5 py-1 rounded-md text-[11px] font-bold text-orange-600 shadow-sm border border-orange-200">{reviewTasks.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 relative z-10">
            {reviewTasks.map(task => <TaskCard key={task.id} task={task} isReview isAdmin={isAdminOrManager} onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} />)}
            {reviewTasks.length === 0 && <div className="text-center text-[10px] uppercase font-bold text-orange-900/30 mt-10">Nada a rever</div>}
          </div>
        </div>

        {/* COLUNA 4: CONCLUÍDOS */}
        <div className="flex flex-col min-w-[340px] max-w-[340px] bg-white/40 p-5 rounded-[2.5rem] border border-white/60 h-full shadow-sm opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500"/> Arsenal (Feitos)
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {completedTasks.map(task => <TaskCard key={task.id} task={task} isCompleted isAdmin={isAdminOrManager} onAction={() => {}} />)}
            {completedTasks.length === 0 && <div className="text-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10">Histórico Vazio</div>}
          </div>
        </div>

      </div>

      {/* =========================================================================
          MODAL: INJETAR GRANADA (ADMIN/GESTOR)
          ========================================================================= */}
      <AnimatePresence>
        {isAdHocModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdHocModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-orange-500/20 flex flex-col gap-5">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-orange-600 flex items-center gap-2"><Flame size={24}/> Granada Ad-Hoc</h3>
                  <p className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Injeção direta no JTBD de um membro</p>
                </div>
                <button onClick={() => setIsAdHocModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)]"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <input type="text" placeholder="Título da Missão Urgente..." value={adHocForm.title} onChange={(e) => setAdHocForm({...adHocForm, title: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none focus:border-orange-500 shadow-sm" />
                
                <select value={adHocForm.projectId} onChange={(e) => setAdHocForm({...adHocForm, projectId: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-orange-500 shadow-sm">
                  <option value="" disabled>Selecione o Projeto do Cliente...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.profiles?.nome}</option>)}
                </select>

                <select value={adHocForm.assigneeId} onChange={(e) => setAdHocForm({...adHocForm, assigneeId: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-orange-500 shadow-sm">
                  <option value="" disabled>Quem deve executar AGORA?</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.role})</option>)}
                </select>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 ml-1">Deadline Crucial</span>
                    <input type="datetime-local" value={adHocForm.deadline} onChange={(e) => setAdHocForm({...adHocForm, deadline: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 ml-1">Tempo Est. (Min)</span>
                    <input type="number" value={adHocForm.estTime} onChange={(e) => setAdHocForm({...adHocForm, estTime: parseInt(e.target.value)})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-orange-500 shadow-sm" />
                  </div>
                </div>

                <textarea placeholder="Briefing e Links rápidos..." value={adHocForm.description} onChange={(e) => setAdHocForm({...adHocForm, description: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none h-24 outline-none focus:border-orange-500 custom-scrollbar shadow-sm" />
              </div>

              <button onClick={handleFireGrenade} disabled={adHocProcessing || !adHocForm.title || !adHocForm.projectId || !adHocForm.assigneeId || !adHocForm.deadline} className="w-full mt-2 bg-orange-500 text-white py-4 rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-colors flex justify-center items-center">
                {adHocProcessing ? <Loader2 size={16} className="animate-spin"/> : "Disparar Granada"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ============================================================================
// COMPONENTE: CARTÃO DE TAREFA (O Item do Kanban - PREMIUM)
// ============================================================================
function TaskCard({ task, isFocus, isReview, isCompleted, isAdmin, onAction }: any) {
  const isDelayed = !isCompleted && new Date(task.deadline) < new Date();
  
  return (
    <div className={`p-5 rounded-2xl flex flex-col gap-3 group transition-all relative overflow-hidden
      ${isCompleted ? 'bg-white/40 border border-[var(--color-atelier-grafite)]/10' : 'bg-white border border-[var(--color-atelier-grafite)]/5 shadow-[0_4px_12px_rgba(122,116,112,0.05)] hover:shadow-[0_8px_24px_rgba(122,116,112,0.1)] hover:border-[var(--color-atelier-terracota)]/30'}
      ${task.urgency && !isCompleted ? 'border-orange-300 ring-1 ring-orange-500/20' : ''}
    `}>
      {/* Efeitos Visuais (Luzes de Foco e Urgência) */}
      {isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>}
      {task.urgency && !isCompleted && !isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}

      <div className="flex justify-between items-start">
        <div className="flex flex-col pr-4">
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1 flex items-center gap-1">
            {task.projects?.type === 'Identidade Visual' ? <Target size={10}/> : <Activity size={10}/>}
            {task.projects?.profiles?.nome?.split(" ")[0]} • {task.stage}
          </span>
          <span className={`font-roboto font-bold text-[14px] leading-snug ${isCompleted ? 'text-[var(--color-atelier-grafite)]/40 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
            {task.title}
          </span>
        </div>
        {task.urgency && !isCompleted && <Flame size={16} className="text-orange-500 shrink-0 mt-1 animate-pulse" />}
      </div>

      {/* Interface de Ação */}
      {!isCompleted && (
        <div className="flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4 mt-2">
          
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 ${isDelayed ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]/50'}`}>
              <Clock size={12}/> {new Date(task.deadline).toLocaleDateString('pt-BR')}
            </span>
            <span className="text-[9px] text-[var(--color-atelier-grafite)]/30 uppercase font-bold tracking-widest">Est: {task.estimated_time}m</span>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            
            {/* ESTADO: PENDENTE (Na Fila) */}
            {task.status === 'pending' && (
              <button onClick={() => onAction('in_progress')} className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2">
                <PlayCircle size={14} /> Foco
              </button>
            )}

            {/* ESTADO: EM FOCO (Timer Rodando) */}
            {isFocus && (
              <>
                <button onClick={() => onAction('pending')} className="bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-200 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm" title="Pausar Foco">
                  <PauseCircle size={14} />
                </button>
                <button onClick={() => onAction('review')} className="bg-orange-500 border border-orange-600 text-white hover:bg-orange-600 px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 flex items-center gap-1">
                  Revisão <ChevronRight size={14}/>
                </button>
              </>
            )}

            {/* ESTADO: EM REVISÃO (Aguardando Admin/Gestor) */}
            {isReview && (
              <>
                {isAdmin ? (
                  <button onClick={() => onAction('completed')} className="bg-green-500 border border-green-600 text-white hover:bg-green-600 px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 flex items-center gap-1">
                    Aprovar <CheckCircle2 size={14}/>
                  </button>
                ) : (
                  <span className="bg-orange-50 border border-orange-200 text-orange-600 px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest animate-pulse cursor-not-allowed">
                    Aguardando
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Selo Visual de Concluído */}
      {isCompleted && (
        <div className="absolute right-[-15px] bottom-[-15px] opacity-10">
          <CheckCircle2 size={100} className="text-green-500" />
        </div>
      )}
    </div>
  );
}