// src/app/admin/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  Activity, Target, FolderKanban, Clock, Users, 
  Loader2, Sparkles, BrainCircuit, CheckCircle2, 
  AlertTriangle, LayoutDashboard, ChevronRight,
  GitMerge, Layers, UserCircle2, Flame, Edit3, X, PlayCircle, Trash2, Check, PlusCircle
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// 1. DICIONÁRIOS E PIPELINES UNITARIZADOS (BACKWARD SCHEDULING UNITÁRIO)
// ============================================================================
const TASK_TYPES_IDV = [
  { id: 'setup', label: 'Administrativo & Contratos' },
  { id: 'reuniao', label: 'Reuniões & Apresentações' },
  { id: 'copy', label: 'Pesquisa & Estratégia' },
  { id: 'design', label: 'Design & Direção Visual' }
];

const TASK_TYPES_IG = [
  { id: 'setup', label: 'Gestão & Relatórios' },
  { id: 'reuniao', label: 'Reuniões' },
  { id: 'copy', label: 'Copywriting' },
  { id: 'design', label: 'Design Gráfico' },
  { id: 'video', label: 'Edição de Vídeo' }
];

const IDV_PIPELINE = [
  { stage: "Kickoff", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
  { stage: "Kickoff", type: "setup", title: "Pagamento", daysOffset: 1, estTime: 15 },
  { stage: "Kickoff", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Imersão", type: "copy", title: "Moodboard & Semiótica Visual", daysOffset: 5, estTime: 180 },
  { stage: "Design", type: "design", title: "Laboratório de Logotipo", daysOffset: 9, estTime: 240 },
  { stage: "Design", type: "design", title: "Tipografia e Cores", daysOffset: 12, estTime: 180 },
  { stage: "Apresentação", type: "design", title: "Montagem do Brandbook", daysOffset: 16, estTime: 180 },
  { stage: "Handover", type: "setup", title: "Envio do Drive e Conclusão", daysOffset: 18, estTime: 30 }
];

const IG_SETUP = [
  { stage: "Setup", type: "setup", title: "Assinatura & Onboarding", daysOffset: 0, estTime: 30 },
  { stage: "Estratégia", type: "copy", title: "Criação de Estratégia e Copy (Mês)", daysOffset: 5, estTime: 180 },
];

// Lógica de Unitarização: Transformamos pacotes em listas explícitas de tarefas para distribuição no mês
const generateUnitaryIG = (packageName: string) => {
  const units: any[] = [];
  const counts: Record<string, {type: string, qty: number}> = {
    "Pacote 1": { type: "video", qty: 6 },
    "Pacote 2": { type: "design", qty: 4 },
    "Pacote 3": { type: "design", qty: 8 },
    "Pacote 4": { type: "design", qty: 12 }
  };

  const config = counts[packageName] || { type: "design", qty: 1 };
  
  for (let i = 1; i <= config.qty; i++) {
    units.push({
      stage: "Produção Ativa",
      type: config.type,
      title: `${config.type === 'video' ? 'Reels/Vídeo' : 'Post/Card'} Unitário #${i} - ${packageName}`,
      // Distribui as entregas entre o dia 10 e o dia 28 do ciclo
      daysOffset: Math.floor(10 + (i * (18 / config.qty))),
      estTime: 60
    });
  }

  if (packageName === "Pacote 4") {
    units.push({ stage: "Produção", type: "copy", title: "Roteirização Diária de Stories", daysOffset: 18, estTime: 300 });
  }
  
  return units;
};

// ============================================================================
// 2. FUNÇÕES AUXILIARES
// ============================================================================
const groupTasksByStage = (projectTasks: any[]) => {
  const stages: Record<string, any[]> = {};
  projectTasks.forEach(t => {
    const stageName = t.stage || 'Geral';
    if (!stages[stageName]) stages[stageName] = [];
    stages[stageName].push(t);
  });
  return stages;
};

const isIdvService = (project: any) => {
  if (!project) return false;
  return project.service_type === 'Identidade Visual' || project.type?.includes('Identidade Visual');
};

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================
export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<'overview' | 'projects' | 'routing'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({ activeProjects: 0, pendingTasks: 0, totalTeam: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  // Estados de Interface
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPackageForDeploy, setSelectedPackageForDeploy] = useState<string>("Pacote 1");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);

  // Estado do Formulário de Regras de Routing
  const [routeConfig, setRouteConfig] = useState({ projectId: "", taskType: "", assigneeId: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado para Demanda Pontual (Aba Projetos)
  const [adHocDemand, setAdHocDemand] = useState({ title: "", assigneeId: "", urgency: false });

  useEffect(() => {
    fetchOperationalData();
  }, []);

  const fetchOperationalData = async () => {
    setIsLoading(true);
    try {
      // Carrega projetos com os perfis dos clientes (para avatares)
      const { data: projData } = await supabase.from('projects').select('*, profiles(nome, avatar_url)').in('status', ['active', 'delivered']).order('created_at', { ascending: false });
      if (projData) {
        setProjects(projData);
        if (projData.length > 0 && !selectedProjectId) setSelectedProjectId(projData[0].id);
      }

      const { data: teamData } = await supabase.from('profiles').select('id, nome, role, avatar_url, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']);
      if (teamData) setTeam(teamData);

      // Carrega tarefas com perfis dos colaboradores (para avatares)
      const { data: tasksData } = await supabase.from('tasks').select('*, projects(profiles(nome, avatar_url), type, service_type), profiles!assigned_to(nome, avatar_url)').order('deadline', { ascending: true });
      if (tasksData) setTasks(tasksData);

      const { data: rulesData } = await supabase.from('routing_rules').select('*');
      if (rulesData) setRoutingRules(rulesData);

      setMetrics({
        activeProjects: projData?.filter(p => p.status === 'active').length || 0,
        pendingTasks: tasksData?.filter(t => t.status !== 'completed')?.length || 0,
        totalTeam: teamData?.length || 0
      });
    } catch (error) {
      console.error("Erro no Analytics:", error);
      showToast("Erro ao sincronizar Centro de Operações.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
      showToast("Missão concluída com sucesso!");
      fetchOperationalData();
    } catch (e) {
      showToast("Erro ao finalizar missão.");
    }
  };

  const handleAddAdHocDemand = async () => {
    if (!adHocDemand.title || !adHocDemand.assigneeId || !selectedProjectId) {
      showToast("Preencha título e colaborador."); return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: selectedProjectId,
        assigned_to: adHocDemand.assigneeId,
        title: adHocDemand.title,
        urgency: adHocDemand.urgency,
        status: 'pending',
        stage: 'Demanda Pontual',
        deadline: new Date(Date.now() + 86400000).toISOString()
      });
      if (error) throw error;
      showToast("🔥 Demanda injetada na fila do colaborador!");
      setAdHocDemand({ title: "", assigneeId: "", urgency: false });
      fetchOperationalData();
    } catch (e) {
      showToast("Erro ao injetar demanda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoDeploy = async (project: any) => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isIdv = isIdvService(project);
      const hasPreviousTasks = tasks.some(t => t.project_id === project.id);
      const currentPackage = project.instagram_package || selectedPackageForDeploy;
      
      let pipeline = [];
      if (isIdv) {
        if (hasPreviousTasks) {
          showToast("Atenção: O pipeline de IDV já foi instanciado.");
          setIsProcessing(false); return;
        }
        pipeline = IDV_PIPELINE;
      } else {
        const packageTasks = generateUnitaryIG(currentPackage);
        pipeline = hasPreviousTasks ? packageTasks : [...IG_SETUP, ...packageTasks];
      }

      const projRules = routingRules.filter(r => r.project_id === project.id);
      const maxOffset = pipeline.length > 0 ? Math.max(...pipeline.map(t => t.daysOffset)) : 0;
      
      // Inteligência de Recorrência (Empurra a data de entrega base)
      let finalDeadline = new Date();
      if (isIdv && project.data_limite) {
        finalDeadline = new Date(project.data_limite);
      } else if (!isIdv && project.billing_date) {
        finalDeadline = new Date(project.billing_date);
        if (hasPreviousTasks) {
          // Renovação Mensal: Avança o cronômetro base 1 mês à frente
          finalDeadline.setMonth(finalDeadline.getMonth() + 1);
        }
      } else {
        finalDeadline.setDate(finalDeadline.getDate() + 30);
      }

      const insertData = pipeline.map((t) => {
        const daysToSubtract = maxOffset - t.daysOffset;
        const taskDeadline = new Date(finalDeadline);
        taskDeadline.setDate(taskDeadline.getDate() - daysToSubtract);
        
        const rule = projRules.find(r => r.task_type === t.type);
        const assigneeId = (rule && rule.assignee_id && rule.assignee_id.trim() !== "") ? rule.assignee_id : null;

        return {
          project_id: project.id,
          creator_id: session?.user?.id || null,
          assigned_to: assigneeId,
          title: t.title,
          stage: t.stage,
          task_type: t.type,
          estimated_time: t.estTime,
          deadline: taskDeadline.toISOString(),
          status: 'pending'
        };
      });

      if (insertData.length > 0) {
        const { error } = await supabase.from('tasks').insert(insertData);
        if (error) throw error;
      }
      
      // Atualiza os metadados do projeto (O Pacote atual e a Nova Data de Ciclo)
      const projUpdates: any = {};
      if (!isIdv && !project.instagram_package) projUpdates.instagram_package = currentPackage;
      if (!isIdv && hasPreviousTasks && project.billing_date) projUpdates.billing_date = finalDeadline.toISOString();

      if (Object.keys(projUpdates).length > 0) {
        await supabase.from('projects').update(projUpdates).eq('id', project.id);
      }

      showToast(hasPreviousTasks ? "🔄 Ciclo Mensal Renovado! Produção unitária disparada." : "🚀 Pipeline Instanciado com Sucesso!");
      fetchOperationalData();
    } catch (error) {
      showToast("Erro no Deploy do Pipeline.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRule = async () => {
    if (!routeConfig.projectId || !routeConfig.taskType || !routeConfig.assigneeId) {
      showToast("Preencha todos os campos da regra."); return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('routing_rules').upsert({
        project_id: routeConfig.projectId,
        task_type: routeConfig.taskType,
        assignee_id: routeConfig.assigneeId
      }, { onConflict: 'project_id, task_type' });

      if (error) throw error;
      showToast("🎯 Regra de Roteamento estabelecida!");
      fetchOperationalData(); 
    } catch (error) {
      showToast("Erro ao salvar regra.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("Remover esta regra de roteamento?")) return;
    try {
      await supabase.from('routing_rules').delete().eq('id', ruleId);
      showToast("Regra removida.");
      fetchOperationalData();
    } catch (error) {
      showToast("Erro ao remover regra.");
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tasks').update({
        title: editingTask.title,
        description: editingTask.description,
        urgency: editingTask.urgency,
        deadline: editingTask.deadline,
        assigned_to: editingTask.assigned_to || null 
      }).eq('id', editingTask.id);
      
      if (error) throw error;
      showToast("Tarefa sincronizada com o JTBD!");
      setEditingTask(null);
      fetchOperationalData();
    } catch (e) {
      showToast("Erro ao atualizar tarefa.");
    } finally {
      setIsProcessing(false);
    }
  };

// ============================================================================
  // FILTROS UI E DERIVAÇÕES DE ESTADO
  // ============================================================================
  const activeTasksForQueue = tasks.filter(t => t.status !== 'completed');
  const activeTasks = activeTasksForQueue; // Garante o funcionamento do Modal de Performance
  const activeProjectsList = projects.filter(p => p.status === 'active');
  const selectedProj = projects.find(p => p.id === selectedProjectId);
  
  // Condicional de Dicionário baseada no projeto selecionado na regra (Motor de Routing)
  const routeProjObj = projects.find(p => p.id === routeConfig.projectId); // <--- A LINHA RESTAURADA
  const currentTaskTypes = isIdvService(routeProjObj) ? TASK_TYPES_IDV : TASK_TYPES_IG;
  
  const liveTasks = tasks.filter(t => t.status === 'in_progress');

  if (isLoading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* HEADER DE COMANDO */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
              <BrainCircuit size={16} className="text-[var(--color-atelier-terracota)]" />
            </span>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Engenharia Operacional</span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">Oráculo & <span className="text-[var(--color-atelier-terracota)] italic">Analytics.</span></h1>
        </div>
        
        <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0">
           <button onClick={() => setActiveView('overview')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Dashboard</button>
           <button onClick={() => setActiveView('projects')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'projects' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Visão de Projetos</button>
           <button onClick={() => setActiveView('routing')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'routing' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Motor de Routing</button>
        </div>
      </header>

      {/* WIDGET: LIVE EXECUTION */}
      {liveTasks.length > 0 && activeView !== 'routing' && (
        <div className="shrink-0 bg-[var(--color-atelier-grafite)] text-white p-4 rounded-2xl flex items-center gap-4 overflow-x-auto custom-scrollbar shadow-lg animate-[fadeIn_0.5s_ease-out]">
          <div className="flex items-center gap-2 shrink-0 border-r border-white/20 pr-4">
             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
             <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/70">Executando Agora</span>
          </div>
          {liveTasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl shrink-0">
               <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
                 {t.profiles?.avatar_url ? <img src={t.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12}/>}
               </div>
               <div className="flex flex-col">
                 <span className="font-roboto text-[11px] font-bold">{t.profiles?.nome}</span>
                 <span className="text-[9px] text-white/50 truncate max-w-[150px]">{t.title}</span>
               </div>
               <PlayCircle size={14} className="text-green-400 ml-2" />
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">

          {/* DASHBOARD OVERVIEW */}
          {activeView === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 h-full min-h-0">
              
              {/* KPIs COMPACTOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><FolderKanban size={18} /></div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.activeProjects}</span>
                    <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Projetos Ativos</span>
                  </div>
                </div>
                <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0"><Target size={18} /></div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.pendingTasks}</span>
                    <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Missões Pendentes</span>
                  </div>
                </div>
                <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0"><Users size={18} /></div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.totalTeam}</span>
                    <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Força de Equipa</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                
                {/* COLUNA 1: FILA GERAL */}
                <div className="w-full lg:w-1/3 glass-panel bg-white/40 p-6 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full min-h-0">
                  <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex justify-between items-center">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Fila de Missões</h3>
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest">{activeTasksForQueue.length} Pendentes</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                    {activeTasksForQueue.map(task => {
                      const isDelayed = task.status !== 'completed' && new Date(task.deadline) < new Date();
                      return (
                        <div key={task.id} className="bg-white/80 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 flex flex-col group hover:border-[var(--color-atelier-terracota)]/30 transition-all shadow-sm">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center shadow-inner">
                              {task.projects?.profiles?.avatar_url ? <img src={task.projects.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-lg text-[var(--color-atelier-terracota)]">{task.projects?.profiles?.nome?.charAt(0)}</span>}
                            </div>
                            <div className="flex flex-col cursor-pointer flex-1" onClick={() => setEditingTask(task)}>
                              <div className="flex justify-between items-start">
                                <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors leading-tight pr-2">{task.title}</span>
                                {task.urgency && <Flame size={12} className="text-orange-500 shrink-0 mt-0.5"/>}
                              </div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-1 truncate">
                                {task.projects?.profiles?.nome} • {new Date(task.deadline).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-gray-100 flex items-center justify-center shrink-0">
                                {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12} className="text-gray-300"/>}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-bold text-[var(--color-atelier-grafite)]/30">Executor</span>
                                <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/80 leading-none">{task.profiles?.nome?.split(" ")[0] || "Livre"}</span>
                              </div>
                            </div>
                            
                            <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-200" title="Finalizar Tarefa">
                              <Check size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* COLUNA 2: ANDAMENTO REAL DOS PROJETOS */}
                <div className="w-full lg:w-1/3 glass-panel bg-white/60 p-6 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full min-h-0">
                  <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex justify-between items-center">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Progressão Real</h3>
                    <Activity size={18} className="text-[var(--color-atelier-terracota)]"/>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                    {activeProjectsList.map(proj => {
                      const projTasks = tasks.filter(t => t.project_id === proj.id);
                      const total = projTasks.length;
                      const done = projTasks.filter(t => t.status === 'completed').length;
                      const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                      const isDelayed = projTasks.some(t => t.status !== 'completed' && new Date(t.deadline) < new Date());

                      return (
                        <div key={proj.id} onClick={() => { setSelectedProjectId(proj.id); setActiveView('projects'); }} className="bg-white p-4 rounded-xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                                {proj.profiles?.avatar_url ? <img src={proj.profiles.avatar_url} className="w-full h-full object-cover"/> : <span className="font-elegant text-sm text-[var(--color-atelier-terracota)]">{proj.profiles?.nome?.charAt(0)}</span>}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate max-w-[150px]">{proj.profiles?.nome}</span>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{isIdvService(proj) ? 'IDV' : 'Instagram'}</span>
                              </div>
                            </div>
                            {total === 0 ? <AlertTriangle size={14} className="text-orange-500" /> : isDelayed && <AlertTriangle size={14} className="text-red-500" />}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                              <span className="text-[var(--color-atelier-grafite)]/50">{total === 0 ? 'Sem Pipeline' : 'Avanço do JTBD'}</span>
                              <span className="text-[var(--color-atelier-terracota)]">{total > 0 && `${done}/${total}`}</span>
                            </div>
                            <div className="h-1.5 w-full bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full rounded-full ${isDelayed ? 'bg-red-500' : 'bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)]'}`}></motion.div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* COLUNA 3: CARGA DA EQUIPA E XP */}
                <div className="w-full lg:w-1/3 glass-panel bg-[var(--color-atelier-creme)]/50 p-6 flex flex-col rounded-[2.5rem] border border-[var(--color-atelier-terracota)]/20 shadow-sm overflow-hidden h-full min-h-0">
                  <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex justify-between items-center">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Alocação de Esforço</h3>
                    <Users size={18} className="text-[var(--color-atelier-terracota)]"/>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                    {team.map(member => {
                      const memberTasks = activeTasksForQueue.filter(t => t.assigned_to === member.id);
                      const estHours = (memberTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0) / 60).toFixed(1);
                      return (
                        <div key={member.id} onClick={() => setSelectedCollab(member)} className="bg-white p-4 rounded-xl border border-white shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--color-atelier-terracota)]/40 transition-all group">
                          <div className="flex items-center gap-3 w-3/4">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--color-atelier-terracota)]/20 shadow-inner shrink-0 bg-white flex items-center justify-center">
                              {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 className="text-gray-200" />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">{member.nome}</span>
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">{memberTasks.length} Ativas</span>
                            </div>
                          </div>
                          <div className="text-right pl-2 border-l border-[var(--color-atelier-grafite)]/5 shrink-0">
                            <span className="text-[10px] font-bold text-orange-500">~{estHours}h</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VISÃO DE PROJETOS E DEMANDA AD-HOC */}
          {activeView === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              
              {/* LISTA LATERAL DE PROJETOS */}
              <div className="w-full lg:w-[320px] glass-panel bg-white/40 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col h-[300px] lg:h-full shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 px-2 block border-b border-[var(--color-atelier-grafite)]/10 pb-4">Carteira Ativa</span>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                  {activeProjectsList.map(p => (
                    <button key={p.id} onClick={() => setSelectedProjectId(p.id)} className={`p-4 rounded-xl text-left transition-all border ${selectedProjectId === p.id ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-md' : 'border-transparent hover:bg-white/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                           {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="bg-gray-50 w-full h-full flex items-center justify-center font-elegant text-sm text-[var(--color-atelier-terracota)]">{p.profiles?.nome?.charAt(0)}</div>}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] block truncate">{p.profiles?.nome}</span>
                          <span className="text-[9px] uppercase font-bold text-[var(--color-atelier-terracota)]">{isIdvService(p) ? 'IDV' : 'Instagram'}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PAINEL DE DETALHES + WIDGET AD-HOC */}
              <div className="flex-1 glass-panel bg-white/80 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
                {!selectedProj ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-40"><FolderKanban size={48} className="mb-4 text-[var(--color-atelier-terracota)]"/><p className="font-elegant text-3xl">Selecione um Projeto</p></div>
                ) : (
                  <>
                    <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4 mb-6 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                          {selectedProj.profiles?.avatar_url ? <img src={selectedProj.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="bg-gray-50 w-full h-full flex items-center justify-center font-elegant text-2xl text-[var(--color-atelier-terracota)]">{selectedProj.profiles?.nome?.charAt(0)}</div>}
                        </div>
                        <div>
                          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{selectedProj.profiles?.nome}</h2>
                          <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">{isIdvService(selectedProj) ? 'Identidade Visual' : `Gestão de Instagram ${selectedProj.instagram_package ? `• ${selectedProj.instagram_package}` : ''}`}</p>
                        </div>
                      </div>
                      
                      {(!isIdvService(selectedProj) || tasks.filter(t => t.project_id === selectedProj.id).length === 0) && (
                        <button onClick={() => handleAutoDeploy(selectedProj)} disabled={isProcessing} className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-all flex items-center gap-2">
                          {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                          {tasks.filter(t => t.project_id === selectedProj.id).length > 0 ? "Renovar Ciclo Mensal" : "Instanciar Produção"}
                        </button>
                      )}
                    </div>

                    {/* WIDGET AD-HOC: DEMANDA PONTUAL */}
                    <div className="bg-[var(--color-atelier-grafite)] p-6 rounded-[2rem] mb-8 flex flex-col md:flex-row items-end gap-4 shadow-xl relative overflow-hidden shrink-0">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                      <div className="flex flex-col gap-2 flex-1 relative z-10 w-full">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-1">Injetar Demanda Puntual</span>
                        <input type="text" placeholder="Título da tarefa urgente..." value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] transition-colors" />
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-56 relative z-10">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-1">Para o Executor</span>
                        <select value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-[12px] outline-none">
                          <option value="" className="text-black">Escolher...</option>
                          {team.map(t => <option key={t.id} value={t.id} className="text-black">{t.nome}</option>)}
                        </select>
                      </div>
                      <button onClick={handleAddAdHocDemand} disabled={isProcessing || !adHocDemand.title || !adHocDemand.assigneeId} className="bg-[var(--color-atelier-terracota)] text-white w-full md:w-14 h-[46px] rounded-xl flex items-center justify-center hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all shrink-0">
                        {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <PlusCircle size={20}/>}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                       {Object.keys(groupTasksByStage(tasks.filter(t => t.project_id === selectedProjectId))).map(stage => (
                         <div key={stage} className="mb-6">
                           <h4 className="font-roboto font-bold text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-3 flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 pb-2"><Layers size={12}/> {stage}</h4>
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                             {tasks.filter(t => t.project_id === selectedProjectId && t.stage === stage).map(task => (
                               <div key={task.id} className="bg-white p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 flex flex-col gap-3 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors group">
                                 <div className="flex justify-between items-start">
                                    <span className={`text-[13px] font-bold leading-tight pr-4 ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>{task.title}</span>
                                    <button onClick={() => setEditingTask(task)} className="opacity-0 group-hover:opacity-100 text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] transition-opacity"><Edit3 size={14}/></button>
                                 </div>
                                 <div className="flex justify-between items-end border-t border-[var(--color-atelier-grafite)]/5 pt-3 mt-1">
                                   <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-white">
                                        {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={10} className="text-gray-300"/>}
                                      </div>
                                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">{task.profiles?.nome?.split(" ")[0] || "A definir"}</span>
                                   </div>
                                   <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 bg-gray-50 px-2 py-1 rounded-md">{new Date(task.deadline).toLocaleDateString('pt-BR')}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* MOTOR DE ROUTING */}
          {activeView === 'routing' && (
            <motion.div key="routing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-12 gap-6 h-full min-h-0">
              
              <div className="col-span-4 glass-panel bg-[var(--color-atelier-grafite)] text-white p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl h-fit relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 border-b border-white/10 pb-4">
                  <h3 className="font-elegant text-3xl mb-1">Distribuição de Regras</h3>
                  <p className="font-roboto text-[11px] text-white/50 uppercase tracking-widest">Delegar Fases Automáticas</p>
                </div>
                
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">1. Qual Projeto?</span>
                    <select value={routeConfig.projectId} onChange={(e) => setRouteConfig({...routeConfig, projectId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-[13px] text-white outline-none">
                      <option value="" disabled className="text-black">Selecionar Cliente...</option>
                      {activeProjectsList.map(p => <option key={p.id} value={p.id} className="text-black">{p.profiles?.nome}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">2. Que Fase ou Tarefa?</span>
                    <select value={routeConfig.taskType} onChange={(e) => setRouteConfig({...routeConfig, taskType: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-[13px] text-white outline-none">
                      <option value="" disabled className="text-black">Fase da Operação...</option>
                      {routeConfig.projectId 
                        ? currentTaskTypes?.map(type => <option key={type.id} value={type.id} className="text-black">{type.label}</option>)
                        : <option disabled className="text-black">Selecione o Cliente Acima ↑</option>
                      }
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">3. A quem vai pertencer?</span>
                    <select value={routeConfig.assigneeId} onChange={(e) => setRouteConfig({...routeConfig, assigneeId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-[13px] text-white outline-none">
                      <option value="" disabled className="text-black">Responsável Direto...</option>
                      {team.map(t => <option key={t.id} value={t.id} className="text-black">{t.nome}</option>)}
                    </select>
                  </div>
                  
                  <button onClick={handleSaveRule} disabled={isProcessing || !routeConfig.projectId || !routeConfig.taskType || !routeConfig.assigneeId} className="w-full mt-2 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <GitMerge size={16}/>} Estabelecer Regra
                  </button>
                </div>
              </div>

              <div className="col-span-8 glass-panel bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm overflow-hidden flex flex-col h-full">
                <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0">
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Matriz Ativa</h3>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 mt-1">Conexões mapeadas para atribuição automática.</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                  {routingRules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                      <GitMerge size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                      <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Sem Automação</p>
                    </div>
                  ) : (
                    routingRules.map(rule => {
                      const proj = projects.find(p => p.id === rule.project_id);
                      const member = team.find(t => t.id === rule.assignee_id);
                      const taskTypeArray = isIdvService(proj) ? TASK_TYPES_IDV : TASK_TYPES_IG;
                      const taskTypeLabel = taskTypeArray?.find(t => t.id === rule.task_type)?.label || rule.task_type;

                      return (
                        <div key={rule.id} className="bg-white p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 flex items-center justify-between group hover:border-red-200 transition-all shadow-sm">
                          <div className="flex items-center gap-6 w-full">
                            <div className="flex flex-col w-1/3">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Cliente</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                  {proj?.profiles?.avatar_url ? <img src={proj.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[8px] flex items-center justify-center w-full h-full">{proj?.profiles?.nome?.charAt(0)}</span>}
                                </div>
                                <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">{proj?.profiles?.nome || "Excluído"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col w-1/4">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Atribuição</span>
                              <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)]/80 truncate">{taskTypeLabel}</span>
                            </div>
                            <ChevronRight size={14} className="text-[var(--color-atelier-grafite)]/20"/>
                            <div className="flex flex-col flex-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Vai para</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                  {member?.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={12} className="text-gray-300"/>}
                                </div>
                                <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-terracota)] truncate">{member?.nome || "Desconhecido"}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteRule(rule.id)} className="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ml-4"><Trash2 size={16}/></button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL DE EDIÇÃO DE TAREFA */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTask(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-5">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div className="w-full pr-4">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Modificar Missão</h3>
                  <input type="text" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} className="w-full bg-transparent font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)]/80 outline-none mt-1 border-b border-transparent focus:border-[var(--color-atelier-terracota)]/40" />
                </div>
                <button onClick={() => setEditingTask(null)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0"><X size={20}/></button>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Responsável no JTBD</span>
                <select value={editingTask.assigned_to || ""} onChange={(e) => setEditingTask({...editingTask, assigned_to: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50">
                  <option value="">Ficar em Fila Neutra</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.role})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Data de Entrega (Deadline)</span>
                <input type="datetime-local" value={new Date(editingTask.deadline).toISOString().slice(0, 16)} onChange={(e) => setEditingTask({...editingTask, deadline: new Date(e.target.value).toISOString()})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Instruções Técnicas</span>
                <textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] resize-none h-24 outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar" placeholder="Instruções para a equipa..." />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors">
                <input type="checkbox" className="hidden" checked={editingTask.urgency} onChange={(e) => setEditingTask({...editingTask, urgency: e.target.checked})} />
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${editingTask.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>{editingTask.urgency && <CheckCircle2 size={12} strokeWidth={3}/>}</div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1"><Flame size={12}/> Classificar como Granada (Urgente)</span>
              </label>
              <button onClick={handleUpdateTask} disabled={isProcessing} className="w-full mt-2 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors flex justify-center items-center gap-2">
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Edit3 size={16}/>} Atualizar Missão
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RAIO-X DO COLABORADOR */}
      <AnimatePresence>
        {selectedCollab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCollab(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--color-atelier-creme)] p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-3xl border border-white/40 flex flex-col h-[85vh]">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[var(--color-atelier-terracota)]/20 shadow-inner bg-white flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl">
                    {selectedCollab.avatar_url ? <img src={selectedCollab.avatar_url} className="w-full h-full object-cover"/> : selectedCollab.nome.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">{selectedCollab.nome}</h3>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{selectedCollab.role}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCollab(null)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] bg-white p-2 rounded-full shadow-sm"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 shrink-0">
                {(() => {
                  const myTasks = activeTasks.filter(t => t.assigned_to === selectedCollab.id);
                  const estHours = (myTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0) / 60).toFixed(1);
                  const activeClients = new Set(myTasks.map(t => t.project_id)).size;
                  const inProgress = myTasks.filter(t => t.status === 'in_progress');
                  return (
                    <>
                      <div className="bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] block mb-1">{estHours}h</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Carga Estimada Pendente</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] block mb-1">{myTasks.length}</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Tarefas Filadas</span>
                      </div>
                      <div className="bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] block mb-1">{activeClients}</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Projetos em Mãos</span>
                      </div>
                      
                      <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0"><Activity size={18}/></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-blue-600/70 mb-0.5">Executando Agora (Timer On)</span>
                          <span className="font-roboto font-bold text-[14px] text-blue-900 truncate">
                            {inProgress.length > 0 ? inProgress[0].title : "Mesa limpa ou fora de turno."}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="mt-6 flex-1 bg-white rounded-[2rem] p-6 md:p-8 border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col min-h-0">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 shrink-0 flex items-center gap-2"><FolderKanban size={14}/> Fila de Produção</h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                  {activeTasks.filter(t => t.assigned_to === selectedCollab.id).map(task => (
                    <div key={task.id} className="p-4 rounded-xl border border-[var(--color-atelier-grafite)]/10 flex justify-between items-center bg-gray-50/50 hover:bg-white transition-colors group">
                      <div className="flex flex-col truncate pr-4">
                        <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{task.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{task.projects?.profiles?.nome}</span>
                          <span className="text-[9px] text-[var(--color-atelier-grafite)]/20">•</span>
                          <span className={`text-[9px] uppercase font-bold tracking-widest ${new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-[var(--color-atelier-terracota)]'}`}>
                            Vence: {new Date(task.deadline).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shrink-0
                        ${task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-[var(--color-atelier-grafite)]/50'}
                      `}>
                        {task.status === 'in_progress' ? 'Em Foco' : 'Fila'}
                      </span>
                    </div>
                  ))}
                  {activeTasks.filter(t => t.assigned_to === selectedCollab.id).length === 0 && (
                    <div className="text-center py-6 opacity-40 flex flex-col items-center justify-center h-full">
                      <CheckCircle2 size={32} className="mb-2"/>
                      <p className="font-roboto text-[12px] uppercase font-bold tracking-widest">Sem tarefas pendentes.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}