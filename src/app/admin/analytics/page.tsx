// src/app/admin/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine"; 
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL
import { BrainCircuit, Loader2 } from "lucide-react";

// Importações do Núcleo Estático
import { 
  TASK_TYPES_IDV, TASK_TYPES_IG, ALL_SKILLS, 
  IDV_PIPELINE, IG_SETUP, generateUnitaryIG 
} from "./constants";

// Importações dos Módulos da Interface
import OverviewDashboard from "./views/OverviewDashboard";
import ProjectsManager from "./views/ProjectsManager";
import RoutingEngine from "./views/RoutingEngine";
import LiveExecutionBar from "./components/LiveExecutionBar";
import AnalyticsModals from "./components/AnalyticsModals";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// FUNÇÕES AUXILIARES
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
// COMPONENTE ORQUESTRADOR PRINCIPAL
// ============================================================================
export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<'overview' | 'projects' | 'routing'>('overview');
  
  // 🧠 Consumo da Memória RAM Global (0ms Latência)
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [metrics, setMetrics] = useState({ activeProjects: 0, pendingTasks: 0, totalTeam: 0 });
  
  const [team, setTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPackageForDeploy, setSelectedPackageForDeploy] = useState<string>("Pacote 1");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);

  const [routeConfig, setRouteConfig] = useState({ projectId: "", taskType: "", assigneeId: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const [adHocDemand, setAdHocDemand] = useState({ title: "", projectId: "", assigneeId: "", taskType: "", urgency: false });

  // 🔥 ESTADOS DO MODO DE EDIÇÃO EM LOTE (BULK ACTIONS)
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");

  // 🏢 GESTÃO UNIFICADA (PROJETOS + AGÊNCIAS)
  const [selectedEntityId, setSelectedEntityId] = useState<string>(""); 
  const [selectedEntityType, setSelectedEntityType] = useState<'project' | 'agency'>('project');
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencySubclients, setAgencySubclients] = useState<any[]>([]);

  // 📍 MÓDULO DE LOGÍSTICA
  const [isCaptacaoModalOpen, setIsCaptacaoModalOpen] = useState(false);
  const [captacaoForm, setCaptacaoForm] = useState({ title: "", assigneeId: "", date: "", location: "", notes: "" });

  const validProjects = activeProjects.filter(p => p.status === 'active' || p.status === 'delivered');

  useEffect(() => {
    if (isGlobalLoading) return;
    fetchOperationalData();
  }, [isGlobalLoading, activeProjects.length]);

  // Limpa seleções de lote ao mudar de aba
  useEffect(() => {
    setSelectedTaskIds([]);
    setSelectedRuleIds([]);
  }, [activeView]);

  const fetchOperationalData = async () => {
    setIsLocalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const teamPromise = supabase.from('profiles').select('id, nome, role, avatar_url, skills, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']);
      const tasksPromise = supabase.from('tasks').select('*, projects(profiles(nome, avatar_url), type, service_type)').order('deadline', { ascending: true });
      const rulesPromise = supabase.from('routing_rules').select('*');
      const agenciesPromise = supabase.from('agencies').select('*').eq('status', 'active');
      const subclientsPromise = supabase.from('agency_subclients').select('*');

      const [resTeam, resTasks, resRules, resAgencies, resSubs] = await Promise.all([
        teamPromise, tasksPromise, rulesPromise, agenciesPromise, subclientsPromise
      ]);

      if (resTeam.data) setTeam(resTeam.data);
      if (resRules.data) setRoutingRules(resRules.data);
      if (resAgencies.data) setAgencies(resAgencies.data);
      if (resSubs.data) setAgencySubclients(resSubs.data);
      
      if (resTasks.data && resTeam.data) {
        const mappedTasks = resTasks.data.map(task => {
          const executor = resTeam.data.find(t => t.id === task.assigned_to);
          let projectVisualData = task.projects;
          
          if (task.agency_id && resAgencies.data && resSubs.data) {
            const agency = resAgencies.data.find(a => a.id === task.agency_id);
            const subclient = resSubs.data.find(s => s.id === task.subclient_id);
            projectVisualData = {
              type: 'Agência / White-Label',
              service_type: 'Produção Contínua',
              profiles: { nome: `${agency?.name || 'Agência'} • ${subclient?.name || 'Cliente'}`, avatar_url: null }
            };
          }

          return {
            ...task,
            projects: projectVisualData,
            profiles: executor ? { nome: executor.nome, avatar_url: executor.avatar_url } : null
          };
        });

        setTasks(mappedTasks);
        setMetrics({
          activeProjects: validProjects.filter(p => p.status === 'active').length || 0,
          pendingTasks: mappedTasks.filter(t => t.status !== 'completed').length || 0,
          totalTeam: resTeam.data.length || 0
        });

        // Seleção inicial unificada
        if (!selectedEntityId) {
            if (validProjects.length > 0) {
                setSelectedEntityId(validProjects[0].id);
                setSelectedEntityType('project');
            } else if (resAgencies.data && resAgencies.data.length > 0) {
                setSelectedEntityId(resAgencies.data[0].id);
                setSelectedEntityType('agency');
            }
        }
      }

      if (session?.user) {
        AtelierPMEngine.runDailyRiskMitigation(session.user.id);
        AtelierPMEngine.calibrateUnitEconomics(session.user.id);
      }
    } catch (error) {
      console.error("Erro no Analytics:", error);
      showToast("Erro ao sincronizar Centro de Operações.");
    } finally {
      setIsLocalLoading(false);
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

  // ============================================================================
  // 🔥 FUNÇÕES DE EXECUÇÃO EM LOTE E LOGÍSTICA
  // ============================================================================
  const toggleTaskSelection = (id: string) => {
    if (selectedTaskIds.includes(id)) setSelectedTaskIds(selectedTaskIds.filter(tid => tid !== id));
    else setSelectedTaskIds([...selectedTaskIds, id]);
  };

  const toggleRuleSelection = (id: string) => {
    if (selectedRuleIds.includes(id)) setSelectedRuleIds(selectedRuleIds.filter(rid => rid !== id));
    else setSelectedRuleIds([...selectedRuleIds, id]);
  };

  const handleBulkTaskUpdate = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsProcessing(true);
    try {
      const updates: any = {};
      if (bulkAssigneeId !== "") updates.assigned_to = bulkAssigneeId === "unassigned" ? null : bulkAssigneeId;
      if (bulkDeadline) updates.deadline = new Date(bulkDeadline).toISOString();

      if (Object.keys(updates).length > 0) {
         await supabase.from('tasks').update(updates).in('id', selectedTaskIds);
      }
      showToast(`Lote de ${selectedTaskIds.length} tarefas atualizado!`);
      setSelectedTaskIds([]);
      setBulkModalOpen(false);
      setBulkAssigneeId("");
      setBulkDeadline("");
      fetchOperationalData();
    } catch(e) {
      showToast("Erro na atualização em lote.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTaskComplete = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsProcessing(true);
    try {
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).in('id', selectedTaskIds);
      showToast(`Lote de ${selectedTaskIds.length} tarefas concluído!`);
      setSelectedTaskIds([]);
      fetchOperationalData();
    } catch(e) {
      showToast("Erro ao concluir em lote.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTaskDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`ATENÇÃO: Apagar definitivamente ${selectedTaskIds.length} tarefas?`)) return;
    setIsProcessing(true);
    try {
      await supabase.from('tasks').delete().in('id', selectedTaskIds);
      showToast(`Lote de ${selectedTaskIds.length} tarefas apagado!`);
      setSelectedTaskIds([]);
      fetchOperationalData();
    } catch(e) {
      showToast("Erro ao apagar em lote.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRuleDelete = async () => {
    if (selectedRuleIds.length === 0) return;
    if (!window.confirm(`Apagar ${selectedRuleIds.length} regras de automação?`)) return;
    setIsProcessing(true);
    try {
      await supabase.from('routing_rules').delete().in('id', selectedRuleIds);
      showToast(`${selectedRuleIds.length} regras removidas!`);
      setSelectedRuleIds([]);
      fetchOperationalData();
    } catch(e) {
      showToast("Erro ao remover regras.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdHocDemand = async () => {
    const targetProject = adHocDemand.projectId || (selectedEntityType === 'project' ? selectedEntityId : null);
    if (!adHocDemand.title || !adHocDemand.assigneeId || (!targetProject && selectedEntityType !== 'agency')) {
      showToast("Preencha título e colaborador."); return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: targetProject,
        agency_id: selectedEntityType === 'agency' ? selectedEntityId : null,
        assigned_to: adHocDemand.assigneeId,
        title: adHocDemand.title,
        urgency: adHocDemand.urgency,
        status: 'pending',
        stage: 'Demanda Pontual',
        task_type: adHocDemand.taskType || 'setup',
        deadline: new Date(Date.now() + 86400000).toISOString()
      });
      if (error) throw error;
      showToast("🔥 Demanda injetada na fila do colaborador!");
      setAdHocDemand({ title: "", projectId: "", assigneeId: "", taskType: "", urgency: false });
      fetchOperationalData();
    } catch (e) {
      showToast("Erro ao injetar demanda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCaptacao = async () => {
    if (!captacaoForm.title || !captacaoForm.assigneeId || !captacaoForm.date) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: selectedEntityType === 'project' ? selectedEntityId : null,
        agency_id: selectedEntityType === 'agency' ? selectedEntityId : null,
        assigned_to: captacaoForm.assigneeId,
        title: `📸 CAPTAÇÃO: ${captacaoForm.title}`,
        description: `📍 Local: ${captacaoForm.location}\n📝 Notas: ${captacaoForm.notes}`,
        task_type: 'captacao',
        stage: 'Logística Externa',
        deadline: new Date(captacaoForm.date).toISOString(),
        status: 'pending',
        estimated_time: 120
      });
      if (error) throw error;
      showToast("📍 Logística de captação agendada com sucesso!");
      setIsCaptacaoModalOpen(false);
      setCaptacaoForm({ title: "", assigneeId: "", date: "", location: "", notes: "" });
      fetchOperationalData();
    } catch (e) { showToast("Erro ao registrar logística."); }
    finally { setIsProcessing(false); }
  };

  const handleUpdateSubclientDemand = async (subId: string, demand: number) => {
    try {
      await supabase.from('agency_subclients').update({ deliverables_count: demand }).eq('id', subId);
      showToast("Demanda de posts atualizada.");
      fetchOperationalData();
    } catch (e) { showToast("Erro ao atualizar demanda."); }
  };

  const handleDeleteSubclient = async (subId: string) => {
    if (!window.confirm("Remover este perfil da agência?")) return;
    try {
      await supabase.from('agency_subclients').delete().eq('id', subId);
      showToast("Perfil removido da operação.");
      fetchOperationalData();
    } catch (e) { showToast("Erro ao remover perfil."); }
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
      
      let finalDeadline = new Date();
      if (isIdv && project.data_limite) {
        finalDeadline = new Date(project.data_limite);
      } else if (!isIdv && project.billing_date) {
        finalDeadline = new Date(project.billing_date);
        if (hasPreviousTasks) finalDeadline.setMonth(finalDeadline.getMonth() + 1);
      } else {
        finalDeadline.setDate(finalDeadline.getDate() + 30);
      }

      const insertData = await Promise.all(pipeline.map(async (t) => {
        const rule = projRules.find(r => r.task_type === t.type);
        const defaultAssigneeId = (rule && rule.assignee_id && rule.assignee_id.trim() !== "") ? rule.assignee_id : null;

        const optimalAssignee = await AtelierPMEngine.getOptimalAssignee(t.type, defaultAssigneeId, t.estTime);

        return {
          project_id: project.id,
          assigned_to: optimalAssignee,
          title: t.title,
          stage: t.stage,
          task_type: t.type,
          estimated_time: t.estTime,
          status: 'pending'
        };
      }));

      const scheduledData = AtelierPMEngine.generateSmartSchedule(insertData, new Date(), finalDeadline);

      if (scheduledData.length > 0) {
        const { error } = await supabase.from('tasks').insert(scheduledData);
        if (error) throw error;
      }
      
      const projUpdates: any = {};
      if (!isIdv && !project.instagram_package) projUpdates.instagram_package = currentPackage;
      if (!isIdv && hasPreviousTasks && project.billing_date) projUpdates.billing_date = finalDeadline.toISOString();

      if (Object.keys(projUpdates).length > 0) {
        await supabase.from('projects').update(projUpdates).eq('id', project.id);
        refreshGlobalData();
      }

      showToast(hasPreviousTasks ? "🔄 Ciclo Mensal Renovado!" : "🚀 Pipeline Inteligente Instanciado!");
      fetchOperationalData();
    } catch (error) {
      console.error(error);
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

  const handleToggleSkill = async (collabId: string, skillId: string) => {
    const collab = team.find(t => t.id === collabId);
    if (!collab) return;
    const currentSkills = collab.skills || [];
    const newSkills = currentSkills.includes(skillId) 
      ? currentSkills.filter((s: string) => s !== skillId)
      : [...currentSkills, skillId];
    
    setTeam(team.map(t => t.id === collabId ? { ...t, skills: newSkills } : t));
    if (selectedCollab && selectedCollab.id === collabId) {
      setSelectedCollab({ ...selectedCollab, skills: newSkills });
    }

    try {
      const { error } = await supabase.from('profiles').update({ skills: newSkills }).eq('id', collabId);
      if (error) throw error;
      showToast("Competência atualizada no banco de dados.");
    } catch (e) {
      showToast("Erro ao atualizar competências.");
      fetchOperationalData(); 
    }
  };

  // ============================================================================
  // COMPUTAÇÃO DE DADOS PARA INTERFACE
  // ============================================================================
  const activeTasksForQueue = tasks.filter(t => t.status !== 'completed');
  const activeProjectsList = validProjects.filter(p => p.status === 'active');
  const liveTasks = tasks.filter(t => t.status === 'in_progress');

  const selectedEntityData = selectedEntityType === 'project' 
    ? validProjects.find(p => p.id === selectedEntityId)
    : agencies.find(a => a.id === selectedEntityId);

  const routeProjObj = validProjects.find(p => p.id === routeConfig.projectId); 
  const currentTaskTypes = isIdvService(routeProjObj) ? TASK_TYPES_IDV : TASK_TYPES_IG;

  const unifiedWallet = [
    ...validProjects.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.profiles?.nome, type: 'project', label: isIdvService(p) ? 'IDV' : 'Instagram' })),
    ...agencies.map(a => ({ id: a.id, name: a.name, type: 'agency', label: 'White-Label' }))
  ].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  if (isGlobalLoading || isLocalLoading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* HEADER ORQUESTRADOR */}
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
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => { setIsBulkMode(!isBulkMode); setSelectedTaskIds([]); setSelectedRuleIds([]); }} 
             className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all border ${isBulkMode ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] shadow-md' : 'bg-white/60 text-[var(--color-atelier-grafite)]/60 hover:bg-white border-white shadow-sm'}`}
           >
             {isBulkMode ? "Sair da Edição em Lote" : "Ações em Lote"}
           </button>
           
           <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0">
              <button onClick={() => setActiveView('overview')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Dashboard</button>
              <button onClick={() => setActiveView('projects')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'projects' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Visão de Projetos</button>
              <button onClick={() => setActiveView('routing')} className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'routing' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}>Motor de Routing</button>
           </div>
        </div>
      </header>

      {/* WIDGET: LIVE EXECUTION */}
      <LiveExecutionBar liveTasks={liveTasks} />

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {activeView === 'overview' && (
            <OverviewDashboard 
              metrics={metrics}
              activeTasksForQueue={activeTasksForQueue}
              validProjects={validProjects}
              tasks={tasks}
              team={team}
              isBulkMode={isBulkMode}
              selectedTaskIds={selectedTaskIds}
              toggleTaskSelection={toggleTaskSelection}
              setEditingTask={setEditingTask}
              handleCompleteTask={handleCompleteTask}
              setSelectedProjectId={setSelectedProjectId}
              setActiveView={setActiveView}
              setSelectedCollab={setSelectedCollab}
              isIdvService={isIdvService}
            />
          )}

          {activeView === 'projects' && (
            <ProjectsManager 
              unifiedWallet={unifiedWallet}
              selectedEntityId={selectedEntityId}
              setSelectedEntityId={setSelectedEntityId}
              selectedEntityType={selectedEntityType}
              setSelectedEntityType={setSelectedEntityType}
              selectedEntityData={selectedEntityData}
              setIsCaptacaoModalOpen={setIsCaptacaoModalOpen}
              handleAutoDeploy={handleAutoDeploy}
              isProcessing={isProcessing}
              tasks={tasks}
              adHocDemand={adHocDemand}
              setAdHocDemand={setAdHocDemand}
              team={team}
              handleAddAdHocDemand={handleAddAdHocDemand}
              agencySubclients={agencySubclients}
              handleDeleteSubclient={handleDeleteSubclient}
              handleUpdateSubclientDemand={handleUpdateSubclientDemand}
              groupTasksByStage={groupTasksByStage}
              isBulkMode={isBulkMode}
              toggleTaskSelection={toggleTaskSelection}
              selectedTaskIds={selectedTaskIds}
              setEditingTask={setEditingTask}
              handleCompleteTask={handleCompleteTask}
              isIdvService={isIdvService}
              showToast={showToast}
            />
          )}

          {activeView === 'routing' && (
            <RoutingEngine 
              routeConfig={routeConfig}
              setRouteConfig={setRouteConfig}
              isProcessing={isProcessing}
              activeProjectsList={activeProjectsList}
              currentTaskTypes={currentTaskTypes}
              team={team}
              handleSaveRule={handleSaveRule}
              routingRules={routingRules}
              validProjects={validProjects}
              isIdvService={isIdvService}
              isBulkMode={isBulkMode}
              selectedRuleIds={selectedRuleIds}
              toggleRuleSelection={toggleRuleSelection}
              handleDeleteRule={handleDeleteRule}
            />
          )}

        </AnimatePresence>
      </div>

      {/* RENDERIZAÇÃO DOS MODAIS */}
      <AnalyticsModals 
        selectedTaskIds={selectedTaskIds}
        selectedRuleIds={selectedRuleIds}
        isBulkMode={isBulkMode}
        setIsBulkMode={setIsBulkMode}
        setSelectedTaskIds={setSelectedTaskIds}
        setSelectedRuleIds={setSelectedRuleIds}
        bulkModalOpen={bulkModalOpen}
        setBulkModalOpen={setBulkModalOpen}
        bulkAssigneeId={bulkAssigneeId}
        setBulkAssigneeId={setBulkAssigneeId}
        bulkDeadline={bulkDeadline}
        setBulkDeadline={setBulkDeadline}
        handleBulkTaskUpdate={handleBulkTaskUpdate}
        handleBulkTaskComplete={handleBulkTaskComplete}
        handleBulkTaskDelete={handleBulkTaskDelete}
        handleBulkRuleDelete={handleBulkRuleDelete}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        handleUpdateTask={handleUpdateTask}
        selectedCollab={selectedCollab}
        setSelectedCollab={setSelectedCollab}
        activeTasksForQueue={activeTasksForQueue}
        toggleTaskSelection={toggleTaskSelection}
        handleToggleSkill={handleToggleSkill}
        isCaptacaoModalOpen={isCaptacaoModalOpen}
        setIsCaptacaoModalOpen={setIsCaptacaoModalOpen}
        captacaoForm={captacaoForm}
        setCaptacaoForm={setCaptacaoForm}
        handleAddCaptacao={handleAddCaptacao}
        isProcessing={isProcessing}
        team={team}
      />

    </div>
  );
}