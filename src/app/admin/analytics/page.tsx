// src/app/admin/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine"; 
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL
import { NotificationEngine } from "../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES
import { BrainCircuit, Loader2, Bell, X, Cpu, Play, CheckSquare, Check } from "lucide-react";

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
  
  // 🧠 Consumo da Memória RAM Global
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [metrics, setMetrics] = useState({ activeProjects: 0, pendingTasks: 0, totalTeam: 0 });
  
  const [team, setTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  // 🚀 NOVOS ESTADOS DO MOTOR OPERACIONAL (HITL & CAIXA DE ENTRADA)
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [engineMode, setEngineMode] = useState<'manual' | 'auto'>('manual');
  const [isOracleOpen, setIsOracleOpen] = useState(false); // Estado da Gaveta (Drawer)

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPackageForDeploy, setSelectedPackageForDeploy] = useState<string>("Pacote 1");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);

  const [routeConfig, setRouteConfig] = useState({ projectId: "", taskType: "", assigneeId: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const [adHocDemand, setAdHocDemand] = useState({ title: "", projectId: "", assigneeId: "", taskType: "", urgency: false });

  // 🔥 ESTADOS DO MODO DE EDIÇÃO EM LOTE
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");

  // 🏢 GESTÃO UNIFICADA
  const [selectedEntityId, setSelectedEntityId] = useState<string>(""); 
  const [selectedEntityType, setSelectedEntityType] = useState<'project' | 'agency'>('project');
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencySubclients, setAgencySubclients] = useState<any[]>([]);

  const [isCaptacaoModalOpen, setIsCaptacaoModalOpen] = useState(false);
  const [captacaoForm, setCaptacaoForm] = useState({ title: "", assigneeId: "", date: "", location: "", notes: "" });

  const validProjects = activeProjects.filter(p => p.status === 'active' || p.status === 'delivered');

  useEffect(() => {
    if (isGlobalLoading) return;
    fetchOperationalData();
  }, [isGlobalLoading, activeProjects.length]);

  useEffect(() => {
    setSelectedTaskIds([]);
    setSelectedRuleIds([]);
  }, [activeView]);

  // 🚀 AUTOMAÇÃO DO MOTOR: Vigia o modo Auto
  useEffect(() => {
    if (engineMode === 'auto' && !isLocalLoading && !isProcessing) {
      const hasOrphans = tasks.some(t => !t.assigned_to && t.status === 'pending');
      if (hasOrphans) {
        handleAutoDispatch();
      }
    }
  }, [engineMode, tasks, isLocalLoading]);

  // ============================================================================
  // 🛡️ OTIMIZAÇÃO DE INFRAESTRUTURA (LEAN FETCHING)
  // ============================================================================
  const fetchOperationalData = async () => {
    setIsLocalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const teamPromise = supabase.from('profiles').select('id, nome, role, avatar_url, skills, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']);
      
      // LEAN QUERY
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const isoDate = fifteenDaysAgo.toISOString();

      const tasksPromise = supabase
        .from('tasks')
        .select('*, projects(profiles(nome, avatar_url), type, service_type)')
        .or(`status.neq.completed,completed_at.gte.${isoDate}`)
        .order('deadline', { ascending: true });

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

        // SEPARAÇÃO DO FLUXO
        const standardTasks = mappedTasks.filter(t => t.project_id !== null || t.agency_id !== null);
        const engineAlerts = mappedTasks.filter(t => t.project_id === null && t.agency_id === null);

        setTasks(standardTasks);
        setSystemAlerts(engineAlerts);

        setMetrics({
          activeProjects: validProjects.filter(p => p.status === 'active').length || 0,
          pendingTasks: standardTasks.filter(t => t.status !== 'completed').length || 0,
          totalTeam: resTeam.data.length || 0
        });

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

    } catch (error) {
      console.error("Erro no Analytics:", error);
      showToast("Erro ao sincronizar Centro de Operações.");
    } finally {
      setIsLocalLoading(false);
    }
  };

  // ============================================================================
  // 🚀 BOOT DO MOTOR (Corre apenas 1 vez na abertura do painel)
  // ============================================================================
  useEffect(() => {
    const bootEngine = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await AtelierPMEngine.runDailyRiskMitigation(session.user.id);
        await AtelierPMEngine.calibrateUnitEconomics(session.user.id);
      }
    };
    bootEngine();
  }, []); 

  // ============================================================================
  // 🚀 GATILHOS DO ATELIER PM ENGINE COM NOTIFICAÇÕES (BELL)
  // ============================================================================
  const handleAutoDispatch = async () => {
    setIsProcessing(true);
    try {
      await AtelierPMEngine.distributeUnassignedTasks();
      
      // 🔔 NOTIFICAÇÃO: Gestão
      await NotificationEngine.notifyManagement(
        "🤖 Despacho Automático Concluído",
        "O Motor de IA alocou com sucesso as tarefas pendentes na fila da equipa.",
        "success",
        "/admin/analytics"
      );

      showToast("Automação executada: O Motor alocou as tarefas pendentes.");
      fetchOperationalData();
    } catch (e) {
      showToast("Erro na distribuição autónoma.");
    } finally {
      setIsProcessing(false);
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
      
      // 🔔 NOTIFICAÇÃO: Colaborador Alvo
      await NotificationEngine.notifyUser(
        adHocDemand.assigneeId,
        "🔥 Nova Demanda Ad-Hoc",
        `Foi-lhe atribuída a demanda imediata: ${adHocDemand.title}`,
        "warning",
        "/admin/jtbd"
      );

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
      
      // 🔔 NOTIFICAÇÃO: Operador de Captação
      await NotificationEngine.notifyUser(
        captacaoForm.assigneeId,
        "📸 Nova Captação Agendada",
        `Data: ${new Date(captacaoForm.date).toLocaleDateString('pt-PT')}. Local: ${captacaoForm.location}`,
        "action",
        "/admin/jtbd"
      );

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

      // 🔔 NOTIFICAÇÕES: Gestão e Cliente
      await NotificationEngine.notifyManagement(
        "🚀 Pipeline Instanciado",
        `O ciclo operacional para o projeto ${project.profiles?.nome || 'Cliente'} foi ativado com sucesso.`,
        "success",
        "/admin/projetos"
      );
      
      await NotificationEngine.notifyUser(
        project.client_id,
        "🔄 Novo Ciclo Operacional",
        "O Atelier ativou o seu novo ciclo de produção. A nossa equipa já está a trabalhar nos seus novos ativos.",
        "info",
        "/cockpit"
      );

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
      
      // 🔔 NOTIFICAÇÃO: Colaborador com Skill Alterada
      await NotificationEngine.notifyUser(
        collabId,
        "🎖️ Competências Atualizadas",
        "O seu perfil de skills no estúdio foi recalibrado pela Liderança.",
        "info",
        "/admin/jtbd"
      );

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
      
      {/* HEADER ORQUESTRADOR COM BOTÃO DO ORÁCULO NO CANTO DIREITO */}
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

           {/* 🚀 O BOTÃO DO SINO DO ORÁCULO AQUI (À Direita de Tudo) */}
           <button 
             onClick={() => setIsOracleOpen(true)} 
             className="flex items-center justify-center w-10 h-10 ml-2 bg-white/70 border border-white hover:bg-white rounded-xl shadow-sm transition-all text-[var(--color-atelier-grafite)] hover:shadow-md relative"
             title="Painel do Oráculo"
           >
              <Bell size={18} className="text-[var(--color-atelier-terracota)]" />
              {systemAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>
              )}
           </button>
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
              handleStartTask={async () => {}} // Não injeta a ação
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

      {/* =========================================================================
          MODAL DRAWER: ORÁCULO E AUTOMAÇÃO (Painel Lateral do Admin)
          ========================================================================= */}
      <AnimatePresence>
        {isOracleOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOracleOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-[101] flex flex-col border-l border-[var(--color-atelier-grafite)]/10"
            >
               {/* Cabeçalho do Drawer */}
               <div className="p-6 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between bg-gray-50/50 shrink-0">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                      <Cpu size={24} />
                   </div>
                   <div>
                     <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">Oráculo</h2>
                     <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 block">Central de Automação</span>
                   </div>
                 </div>
                 <button onClick={() => setIsOracleOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                   <X size={16} />
                 </button>
               </div>

               {/* Conteúdo Deslizável */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
                 
                 {/* Secção 1: Controlo do Motor */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Motor Operacional</h3>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col gap-5 shadow-sm">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-[var(--color-atelier-grafite)]">Modo de Distribuição</span>
                            <span className="text-[10px] text-[var(--color-atelier-grafite)]/50 mt-0.5">Alocação de tarefas órfãs</span>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${engineMode === 'auto' ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {engineMode === 'auto' ? 'Automático' : 'HITL (Manual)'}
                          </span>
                       </div>

                       {/* Toggle do Engine Mode */}
                       <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-inner">
                          <button onClick={() => setEngineMode('manual')} className={`flex-1 py-2 rounded-lg font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${engineMode === 'manual' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-sm' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-gray-50'}`}>Manual</button>
                          <button onClick={() => setEngineMode('auto')} className={`flex-1 py-2 rounded-lg font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${engineMode === 'auto' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-gray-50'}`}>Auto</button>
                       </div>
                       
                       <button 
                         onClick={handleAutoDispatch}
                         disabled={isProcessing}
                         className="w-full py-3.5 bg-[var(--color-atelier-grafite)] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm disabled:opacity-50"
                       >
                         {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor"/>}
                         Forçar Despacho de Tarefas
                       </button>
                    </div>
                 </div>

                 {/* Secção 2: Caixa de Entrada (Alertas do Sistema) */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Inbox (Anomalias de Sistema)</h3>
                      {systemAlerts.length > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{systemAlerts.length} pendentes</span>}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      {systemAlerts.length === 0 ? (
                         <div className="text-center py-10 opacity-40 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <CheckSquare size={32} className="mx-auto mb-3 text-[var(--color-atelier-grafite)]" />
                            <p className="font-elegant text-2xl">Inbox Limpa.</p>
                            <p className="text-[11px] font-roboto max-w-[200px] mx-auto mt-1">O motor de IA não detetou desvios de orçamento ou gargalos.</p>
                         </div>
                      ) : (
                         systemAlerts.map(alert => (
                             <div key={alert.id} className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col gap-3 shadow-sm relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] leading-tight">{alert.title}</span>
                                  <button onClick={() => handleCompleteTask(alert.id)} className="w-8 h-8 shrink-0 rounded-full bg-white border border-green-200 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm" title="Aprovar / Resolvido">
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                </div>
                                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 whitespace-pre-wrap leading-relaxed">{alert.description}</p>
                             </div>
                          ))
                       )}
                     </div>
                 </div>

               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}