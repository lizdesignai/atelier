// src/app/admin/analytics/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine"; 
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL
import { NotificationEngine } from "../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES
import { BrainCircuit, Loader2, X, Cpu, Play, CheckSquare, Check, Activity, FolderKanban, GitMerge } from "lucide-react";
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

export default function AnalyticsPage() {
  const [activeView, setActiveView] = useState<'overview' | 'projects' | 'routing'>('overview');
  
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [metrics, setMetrics] = useState({ activeProjects: 0, pendingTasks: 0, totalTeam: 0 });
  
  const [team, setTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [engineMode, setEngineMode] = useState<'manual' | 'auto'>('manual');
  const [isOracleOpen, setIsOracleOpen] = useState(false); 

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPackageForDeploy, setSelectedPackageForDeploy] = useState<string>("Pacote 1");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);

  const [routeConfig, setRouteConfig] = useState({ projectId: "", taskType: "", assigneeId: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const [adHocDemand, setAdHocDemand] = useState({
    title: "",
    projectId: "",
    agencyId: "",
    assigneeId: "",
    taskType: "",
    urgency: false,
    description: "",
    caption: "", 
    subclientId: "",
    deadline: "",
    estTime: 0,
    external_links: [] as string[]
  });

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");

  const [selectedEntityId, setSelectedEntityId] = useState<string>(""); 
  const [selectedEntityType, setSelectedEntityType] = useState<'project' | 'agency' | 'subclient'>('project');
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencySubclients, setAgencySubclients] = useState<any[]>([]);

  const [isCaptacaoModalOpen, setIsCaptacaoModalOpen] = useState(false);
  const [captacaoForm, setCaptacaoForm] = useState({ title: "", assigneeId: "", date: "", location: "", notes: "" });

  // 🟢 Proteção contra Loop Infinito
  const validProjects = useMemo(() => {
    return activeProjects.filter(p => p.status === 'active' || p.status === 'delivered');
  }, [activeProjects]);

  // ============================================================================
  // 🚀 OTIMIZAÇÃO DE INFRAESTRUTURA E CACHE BUSTER SEGURO (Fase 1 - Backend API)
  // ============================================================================
  const fetchOperationalData = useCallback(async () => {
    setIsLocalLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      
      const response = await fetch(`${backendUrl}/api/v1/analytics/dashboard`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar dados do backend');
      }

      const { data } = await response.json();

      if (data.team) setTeam(data.team);
      if (data.routingRules) setRoutingRules(data.routingRules);
      if (data.agencies) setAgencies(data.agencies);
      if (data.subclients) setAgencySubclients(data.subclients);
      
      if (data.tasks && data.team) {
        const mappedTasks = data.tasks.map((task: any) => {
          const executor = data.team.find((t: any) => t.id === task.assigned_to);
          let projectVisualData = task.projects;
          
          if (task.agency_id && data.agencies && data.subclients) {
            const agency = data.agencies.find((a: any) => a.id === task.agency_id);
            const subclient = data.subclients.find((s: any) => s.id === task.subclient_id);
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

        const standardTasks = mappedTasks.filter((t: any) => t.project_id !== null || t.agency_id !== null);
        const engineAlerts = mappedTasks.filter((t: any) => t.project_id === null && t.agency_id === null);

        setTasks(standardTasks);
        setSystemAlerts(engineAlerts);

        setMetrics({
          activeProjects: validProjects.filter(p => p.status === 'active').length || 0,
          pendingTasks: standardTasks.filter((t: any) => t.status !== 'completed').length || 0,
          totalTeam: data.team.length || 0
        });

        if (!selectedEntityId) {
            if (validProjects.length > 0) {
                setSelectedEntityId(validProjects[0].id);
                setSelectedEntityType('project');
            } else if (data.agencies && data.agencies.length > 0) {
                setSelectedEntityId(data.agencies[0].id);
                setSelectedEntityType('agency');
            }
        }
      }

    } catch (error) {
      console.error("Erro no Analytics:", error);
      showToast("Erro ao sincronizar os dados gerais.");
    } finally {
      setIsLocalLoading(false);
    }
  }, [validProjects, selectedEntityId]); 

  useEffect(() => {
    if (isGlobalLoading) return;
    fetchOperationalData();
  }, [isGlobalLoading, fetchOperationalData]);

  useEffect(() => {
    setSelectedTaskIds([]);
    setSelectedRuleIds([]);
  }, [activeView]);

  useEffect(() => {
    if (engineMode === 'auto' && !isLocalLoading && !isProcessing) {
      const hasOrphans = tasks.some(t => !t.assigned_to && t.status === 'pending');
      if (hasOrphans) {
        handleAutoDispatch();
      }
    }
  }, [engineMode, tasks, isLocalLoading]);

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
  // 🚀 GATILHOS DE MUTAÇÃO OTIMISTA
  // ============================================================================
  const handleAutoDispatch = async () => {
    setIsProcessing(true);
    try {
      await AtelierPMEngine.distributeUnassignedTasks();
      
      await NotificationEngine.notifyManagement(
        "🤖 Atribuição Automática Concluída",
        "O Assistente alocou com sucesso as tarefas pendentes para a equipe.",
        "success",
        "/admin/analytics"
      );

      showToast("Automação executada: As tarefas pendentes foram alocadas.");
      await fetchOperationalData(); 
    } catch (e) {
      showToast("Erro na distribuição autónoma.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    try {
      const { error } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
      showToast("Tarefa concluída com sucesso!");
      await fetchOperationalData();
    } catch (e) {
      showToast("Erro ao finalizar tarefa.");
      await fetchOperationalData(); 
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    setIsProcessing(true);

    setTasks(prev => prev.map(t => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          title: editingTask.title,
          description: editingTask.description,
          caption: editingTask.caption,
          urgency: editingTask.urgency,
          deadline: editingTask.deadline,
          assigned_to: editingTask.assigned_to || null,
          external_links: editingTask.external_links || [],
          profiles: editingTask.assigned_to ? team.find(m => m.id === editingTask.assigned_to) : null
        };
      }
      return t;
    }));

    try {
      const { error } = await supabase.from('tasks').update({
        title: editingTask.title,
        description: editingTask.description,
        caption: editingTask.caption,
        urgency: editingTask.urgency,
        deadline: editingTask.deadline,
        assigned_to: editingTask.assigned_to || null,
        external_links: editingTask.external_links || []
      }).eq('id', editingTask.id);
      
      if (error) throw error;
      showToast("Tarefa sincronizada com a Mesa de Trabalho!");
      setEditingTask(null);
      await fetchOperationalData(); 
    } catch (e) {
      showToast("Erro ao atualizar tarefa.");
      await fetchOperationalData(); 
    } finally {
      setIsProcessing(false);
    }
  };

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

    setTasks(prev => prev.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return {
          ...t,
          assigned_to: bulkAssigneeId === "unassigned" ? null : (bulkAssigneeId || t.assigned_to),
          deadline: bulkDeadline ? new Date(bulkDeadline).toISOString() : t.deadline,
          profiles: bulkAssigneeId === "unassigned" ? null : (bulkAssigneeId ? team.find(m => m.id === bulkAssigneeId) : t.profiles)
        };
      }
      return t;
    }));

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
      await fetchOperationalData();
    } catch(e) {
      showToast("Erro na atualização em lote.");
      await fetchOperationalData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTaskComplete = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsProcessing(true);
    setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, status: 'completed' } : t));
    try {
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).in('id', selectedTaskIds);
      showToast(`Lote de ${selectedTaskIds.length} tarefas concluído!`);
      setSelectedTaskIds([]);
      await fetchOperationalData();
    } catch(e) {
      showToast("Erro ao concluir em lote.");
      await fetchOperationalData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTaskDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!window.confirm(`ATENÇÃO: Apagar definitivamente ${selectedTaskIds.length} tarefas?`)) return;
    setIsProcessing(true);
    setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
    try {
      await supabase.from('tasks').delete().in('id', selectedTaskIds);
      showToast(`Lote de ${selectedTaskIds.length} tarefas apagado!`);
      setSelectedTaskIds([]);
      await fetchOperationalData();
    } catch(e) {
      showToast("Erro ao apagar em lote.");
      await fetchOperationalData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRuleDelete = async () => {
    if (selectedRuleIds.length === 0) return;
    if (!window.confirm(`Remover estas ${selectedRuleIds.length} automações?`)) return;
    setIsProcessing(true);
    try {
      await supabase.from('routing_rules').delete().in('id', selectedRuleIds);
      showToast(`${selectedRuleIds.length} automações removidas!`);
      setSelectedRuleIds([]);
      await fetchOperationalData();
    } catch(e) {
      showToast("Erro ao remover automação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdHocDemand = async (demandPayload?: any) => {
    const demand = demandPayload || adHocDemand;
    
    // Resolvemos corretamente para onde a task vai (Projeto ou Agência)
    const targetProject = demand.projectId || (selectedEntityType === 'project' ? selectedEntityId : null);
    const targetAgency = demand.agencyId || (selectedEntityType === 'agency' ? selectedEntityId : null);

    if (!demand.title || !demand.assigneeId || (!targetProject && !targetAgency)) {
      showToast("Preencha título e colaborador."); return;
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: targetProject || null,
        agency_id: targetAgency || null,
        subclient_id: demand.subclientId || null,
        assigned_to: demand.assigneeId,
        title: demand.title,
        description: demand.description,
        caption: demand.caption, // 🟢 Mapeando a Legenda para o Banco de Dados
        external_links: demand.external_links || [], // 🟢 Mapeando links dinâmicos cumulativos
        urgency: demand.urgency,
        status: 'pending',
        stage: 'Demanda Pontual',
        task_type: demand.taskType || 'setup',
        // 🟢 Utilizando o prazo definido no modal ou um prazo padrão de 24h
        deadline: demand.deadline ? new Date(demand.deadline).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        // 🟢 Utilizando o tempo estimado definido no modal
        estimated_time: demand.estTime || 60 
      });
      if (error) throw error;
      
      await NotificationEngine.notifyUser(
        demand.assigneeId,
        "Nova Demanda Pontual",
        `Foi atribuída uma nova prioridade: ${demand.title}`,
        "warning",
        "/admin/jtbd"
      );

      showToast("Demanda adicionada às tarefas do colaborador!");
      
      // 🟢 Resetando todos os campos com segurança
      setAdHocDemand({
        title: "",
        projectId: "",
        agencyId: "",
        assigneeId: "",
        taskType: "",
        urgency: false,
        description: "",
        caption: "", 
        external_links: [],
        subclientId: "",
        deadline: "",
        estTime: 0
      });
      
      await fetchOperationalData();
    } catch (e) {
      showToast("Erro ao adicionar demanda.");
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
      await fetchOperationalData();
    } catch (e) { showToast("Erro ao registrar logística."); }
    finally { setIsProcessing(false); }
  };

  const handleUpdateSubclientDemand = async (subId: string, demand: number) => {
    try {
      await supabase.from('agency_subclients').update({ deliverables_count: demand }).eq('id', subId);
      showToast("Demanda de posts atualizada.");
      await fetchOperationalData();
    } catch (e) { showToast("Erro ao atualizar demanda."); }
  };

  const handleDeleteSubclient = async (subId: string) => {
    if (!window.confirm("Remover este perfil da agência?")) return;
    try {
      await supabase.from('agency_subclients').delete().eq('id', subId);
      showToast("Perfil removido da operação.");
      await fetchOperationalData();
    } catch (e) { showToast("Erro ao remover perfil."); }
  };

  // ============================================================================
  // 🟢 CORREÇÃO DA RENOVAÇÃO DO INSTAGRAM (PASSO 2, 3 e 4 DA ORQUESTRAÇÃO)
  // ============================================================================
  const handleAutoDeploy = async (project: any) => {
    setIsProcessing(true);
    try {
      const isIdv = isIdvService(project);
      const hasPreviousTasks = tasks.some(t => t.project_id === project.id);
      
      // 1. Usa o pacote que está no banco do cliente (coluna type)
      const currentPackage = project.instagram_package || project.type || selectedPackageForDeploy;
      
      let pipeline = [];
      if (isIdv) {
        if (hasPreviousTasks) {
          showToast("Atenção: O fluxo de Identidade Visual já foi iniciado.");
          setIsProcessing(false); return;
        }
        pipeline = IDV_PIPELINE;
      } else {
        // Passo 2: Geração unitária de posts baseada no pacote do cliente
        const packageTasks = generateUnitaryIG(currentPackage);
        pipeline = hasPreviousTasks ? packageTasks : [...IG_SETUP, ...packageTasks];
      }

      const projRules = routingRules.filter(r => r.project_id === project.id);
      
      // Passo 3: Renovação Rigorosa de Ciclo Mensal
      let finalDeadline = new Date();
      if (isIdv && project.data_limite) {
        finalDeadline = new Date(project.data_limite);
      } else if (!isIdv) {
        if (project.billing_date) {
          const savedBilling = new Date(project.billing_date);
          if (hasPreviousTasks) {
            // Se é uma renovação de cliente ativo, avança exatamente 1 mês
            savedBilling.setMonth(savedBilling.getMonth() + 1);
          }
          
          // Previne que a data final fique no passado caso a renovação esteja atrasada
          if (savedBilling < new Date()) {
            finalDeadline = new Date();
            finalDeadline.setDate(finalDeadline.getDate() + 30);
          } else {
            finalDeadline = savedBilling;
          }
        } else {
          // Fallback: +30 dias a partir da data atual
          finalDeadline.setDate(finalDeadline.getDate() + 30);
        }
      }

      // Prepara os dados de inserção garantindo o Assignee
      const insertData = await Promise.all(pipeline.map(async (t) => {
        const rule = projRules.find(r => r.task_type === t.type);
        const defaultAssigneeId = (rule && rule.assignee_id && rule.assignee_id.trim() !== "") ? rule.assignee_id : null;

        // 🟢 FIX: O ID do projeto foi mapeado corretamente para o 2º parâmetro
        const optimalAssignee = await AtelierPMEngine.getOptimalAssignee(t.type, project.id, defaultAssigneeId, t.estTime);

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

      // Distribuição linear das datas
      const scheduledData = AtelierPMEngine.generateSmartSchedule(insertData, new Date(), finalDeadline);

      // Passo 4: Mutação Otimista na Tela UX (A tarefa aparece na hora)
      const optimisticTasks = scheduledData.map((t, index) => ({
        ...t,
        id: `temp-${Date.now()}-${index}`, 
        created_at: new Date().toISOString(),
        projects: {
          type: project.type,
          service_type: project.service_type,
          profiles: project.profiles
        },
        profiles: t.assigned_to ? team.find(m => m.id === t.assigned_to) : null
      }));

      // Renderiza instantaneamente antes mesmo da resposta do banco
      setTasks(prev => [...optimisticTasks, ...prev]); 

      if (scheduledData.length > 0) {
        const { error } = await supabase.from('tasks').insert(scheduledData);
        if (error) throw error;
      }
      
      const projUpdates: any = {};
      
      if (!isIdv) {
        projUpdates.instagram_package = currentPackage;
        projUpdates.billing_date = finalDeadline.toISOString();
      }

      if (Object.keys(projUpdates).length > 0) {
        await supabase.from('projects').update(projUpdates).eq('id', project.id);
        refreshGlobalData();
      }

      await NotificationEngine.notifyManagement(
        "🚀 Produção Iniciada",
        `O ciclo de trabalho para o projeto ${project.profiles?.nome || 'Cliente'} foi ativado com sucesso.`,
        "success",
        "/admin/projetos"
      );

      showToast(hasPreviousTasks ? "🔄 Ciclo Mensal Renovado com Sucesso!" : "🚀 Produção Iniciada com Sucesso!");
      await fetchOperationalData(); // Limpa as tarefas temporárias e traz os IDs reais
    } catch (error) {
      console.error(error);
      showToast("Erro ao iniciar a produção.");
      await fetchOperationalData(); // Reverte o otimismo caso dê erro no banco
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
      showToast("🎯 Automação gravada com sucesso!");
      await fetchOperationalData(); 
    } catch (error) {
      showToast("Erro ao salvar regra.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("Remover esta automação?")) return;
    try {
      await supabase.from('routing_rules').delete().eq('id', ruleId);
      showToast("Automação removida.");
      await fetchOperationalData();
    } catch (error) {
      showToast("Erro ao remover automação.");
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
      await fetchOperationalData(); 
    }
  };

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
      
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
              <BrainCircuit size={16} className="text-[var(--color-atelier-terracota)]" />
            </span>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Gestão do Estúdio</span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">Estratégia & <span className="text-[var(--color-atelier-terracota)] italic">Analytics.</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           
           {/* Botão Ações em Lote Elegante */}
           <div className="flex items-center gap-2 bg-white/60 border border-white py-2 px-3 rounded-2xl shadow-sm">
             <span className={`font-roboto text-[9px] font-bold uppercase tracking-widest transition-colors ${isBulkMode ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>Ações Lote</span>
             <button 
               onClick={() => { setIsBulkMode(!isBulkMode); setSelectedTaskIds([]); setSelectedRuleIds([]); }} 
               className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${isBulkMode ? 'bg-[var(--color-atelier-terracota)]' : 'bg-gray-300'}`}
             >
               <motion.div 
                 layout
                 className="w-4 h-4 bg-white rounded-full shadow-sm"
                 initial={false}
                 animate={{ x: isBulkMode ? 16 : 0 }}
                 transition={{ type: "spring", stiffness: 500, damping: 30 }}
               />
             </button>
           </div>
           
           {/* Menu Estúdio (Ícone + Nome apenas na Ativa) */}
           <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0 overflow-hidden">
              <button 
                onClick={() => setActiveView('overview')} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all overflow-hidden ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-12 justify-center px-0'}`}
              >
                <Activity size={14} className="shrink-0" />
                <AnimatePresence>
                  {activeView === 'overview' && (
                    <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="whitespace-nowrap overflow-hidden origin-left">
                      Visão Geral
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button 
                onClick={() => setActiveView('projects')} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all overflow-hidden ${activeView === 'projects' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-12 justify-center px-0'}`}
              >
                <FolderKanban size={14} className="shrink-0" />
                <AnimatePresence>
                  {activeView === 'projects' && (
                    <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="whitespace-nowrap overflow-hidden origin-left">
                      Projetos
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button 
                onClick={() => setActiveView('routing')} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all overflow-hidden ${activeView === 'routing' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-12 justify-center px-0'}`}
              >
                <GitMerge size={14} className="shrink-0" />
                <AnimatePresence>
                  {activeView === 'routing' && (
                    <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="whitespace-nowrap overflow-hidden origin-left">
                      Encaminhamento
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
           </div>
        </div>
      </header>

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
              handleStartTask={async () => {}} 
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
               <div className="p-6 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between bg-gray-50/50 shrink-0">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                      <Cpu size={24} />
                   </div>
                   <div>
                     <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">Assistente Estratégico</h2>
                     <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 block">Controle de Processos</span>
                   </div>
                 </div>
                 <button onClick={() => setIsOracleOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                   <X size={16} />
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
                 
                 <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Gestão de Fluxo</h3>
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
                         Atribuir Tarefas Automaticamente
                       </button>
                    </div>
                 </div>

                 <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Avisos e Alertas (Sistema)</h3>
                      {systemAlerts.length > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{systemAlerts.length} pendentes</span>}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      {systemAlerts.length === 0 ? (
                         <div className="text-center py-10 opacity-40 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <CheckSquare size={32} className="mx-auto mb-3 text-[var(--color-atelier-grafite)]" />
                            <p className="font-elegant text-2xl">Sem Avisos.</p>
                            <p className="text-[11px] font-roboto max-w-[200px] mx-auto mt-1">O sistema não identificou atrasos ou desvios.</p>
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
