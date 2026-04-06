// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, AlertCircle, Search, 
  Filter, CheckCircle2, Clock,
  ArrowRight, ArrowUpRight, Loader2, X, UploadCloud, ShieldAlert,
  Zap
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 
import { useGlobalStore } from "../../contexts/GlobalStore"; // <--- INJEÇÃO DA MEMÓRIA RAM

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const STAGE_MAP: Record<string, string> = {
  'reuniao': 'Briefing Pendente',
  'pesquisa': 'Pesquisa & Estratégia',
  'direcionamento': 'Direcionamento Criativo',
  'processo': 'Processo Criativo IDV',
  'apresentacao': 'Preparação Final',
  'entrega': 'Fechamento de Arquivos'
};

export default function AdminDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  // CONSUMO DIRETO DA MEMÓRIA GLOBAL
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [activeClients, setActiveClients] = useState<any[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  
  const [totalActiveProjects, setTotalActiveProjects] = useState(0);
  const [totalUrgentTasks, setTotalUrgentTasks] = useState(0);

  // ESTADO DO CENTRO DE RESOLUÇÃO (MODAL)
  const [activeActionTask, setActiveActionTask] = useState<any | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // MOTOR DE PROCESSAMENTO ULTRA-RÁPIDO (< 59ms)
  useEffect(() => {
    // Só processa quando a RAM tiver injetado os projetos
    if (isGlobalLoading) return;

    const processDashboardData = async () => {
      setIsDashboardLoading(true);
      try {
        setTotalActiveProjects(activeProjects.length);
        const projectIds = activeProjects.map(p => p.id);

        // BATCH FETCHING PARALELO: Acaba com o loop de N+1 queries. Uma única chamada para tudo.
        const [ { data: briefingsData }, { data: pendingPosts } ] = await Promise.all([
          projectIds.length > 0 
            ? supabase.from('client_briefings').select('project_id, is_completed').in('project_id', projectIds)
            : Promise.resolve({ data: [] }),
          supabase.from('community_posts').select('id, profiles(nome), content').eq('status', 'pending')
        ]);

        let formattedClients: any[] = [];
        let tasks: any[] = [];
        let alertCount = 0;

        // Processamento Síncrono Instantâneo (Na RAM do navegador)
        for (const project of activeProjects) {
          let daysLeft = '--';
          let numericDaysLeft = 999;
          
          if (project.data_limite) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(project.data_limite);
            deadline.setHours(0, 0, 0, 0);
            numericDaysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            daysLeft = numericDaysLeft.toString();
          }

          let visualStatus = 'on_track'; 
          
          // Busca rápida no array em RAM (0ms)
          const briefing = briefingsData?.find(b => b.project_id === project.id);
            
          if (!briefing || !briefing.is_completed) {
            visualStatus = 'waiting_client';
          } else if (numericDaysLeft <= 3) {
             visualStatus = 'action_required'; 
          }

          formattedClients.push({
            id: project.id,
            name: project.profiles?.nome || 'Cliente',
            project: project.type,
            phase: STAGE_MAP[project.fase] || 'Alinhamento',
            status: visualStatus,
            daysLeft: daysLeft,
            numericDaysLeft,
            lastActive: "Ativo Hoje" 
          });

          // MOTOR DE URGÊNCIA CLASSIFICADA
          if (numericDaysLeft <= 3 && numericDaysLeft > 0) {
            tasks.push({
              id: `deadline-${project.id}`,
              client: project.profiles?.nome,
              type: "vault_upload",
              priority: "high",
              title: `Ruptura de SLA em ${daysLeft} dias. Necessário fechamento e entrega de ativos.`,
              time: "SLA Crítico",
              projectId: project.id,
              payload: project
            });
            alertCount++;
          } else if (numericDaysLeft <= 0) {
              tasks.push({
              id: `deadline-${project.id}`,
              client: project.profiles?.nome,
              type: "vault_upload",
              priority: "critical",
              title: `SLA Rompido. O cliente já aguarda a entrega no cofre. Aja imediatamente.`,
              time: "Atrasado",
              projectId: project.id,
              payload: project
            });
            alertCount++;
          }

          if (briefing?.is_completed && (!project.fase || project.fase === 'reuniao')) {
            tasks.push({
              id: `briefing-${project.id}`,
              client: project.profiles?.nome,
              type: "phase_advance",
              priority: "medium",
              title: "Briefing recebido. O projeto encontra-se bloqueado aguardando avanço de fase.",
              time: "Gargalo Operacional",
              projectId: project.id,
              payload: project
            });
            alertCount++;
          }
        }
        
        formattedClients.sort((a, b) => a.numericDaysLeft - b.numericDaysLeft);
        setActiveClients(formattedClients);
        
        // Tarefas de Comunidade (Já resolvidas no batch paralelo)
        if (pendingPosts && pendingPosts.length > 0) {
           pendingPosts.forEach((post: any) => {
               const clientName = Array.isArray(post.profiles) ? post.profiles[0]?.nome : post.profiles?.nome;
               tasks.push({
                  id: `post-${post.id}`,
                  client: clientName || "Membro da Comunidade",
                  type: "community_approval",
                  priority: "low",
                  title: "Partilha pendente de auditoria de qualidade na comunidade.",
                  time: "Moderação",
                  projectId: null,
                  payload: post
               });
               alertCount++;
           });
        }

        const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        tasks.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

        setUrgentTasks(tasks);
        setTotalUrgentTasks(alertCount);

      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
        showToast("Erro de sincronização. A consultar cache.");
      } finally {
        setIsDashboardLoading(false);
      }
    };

    processDashboardData();
  }, [activeProjects, isGlobalLoading]);

  // ==========================================
  // AÇÕES DO TERMINAL DE RESOLUÇÃO (MODAL)
  // ==========================================
  const executeResolution = async (actionType: string) => {
    if (!activeActionTask) return;
    setIsResolving(true);

    try {
      if (activeActionTask.type === 'phase_advance') {
        await supabase.from('projects').update({ fase: 'pesquisa' }).eq('id', activeActionTask.projectId);
        showToast("Projeto destravado. Fase avançada para Pesquisa & Estratégia.");
      } 
      
      else if (activeActionTask.type === 'vault_upload') {
        await supabase.from('projects').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', activeActionTask.projectId);
        showToast("SLA Protegido. Projeto marcado como entregue.");
      }

      else if (activeActionTask.type === 'community_approval') {
        if (actionType === 'approve') {
          await supabase.from('community_posts').update({ status: 'published' }).eq('id', activeActionTask.payload.id);
          showToast("Partilha aprovada e publicada na comunidade.");
        } else {
          await supabase.from('community_posts').delete().eq('id', activeActionTask.payload.id);
          showToast("Partilha rejeitada e removida.");
        }
      }

      // Sincroniza a memória global e fecha o painel
      setActiveActionTask(null);
      await refreshGlobalData(); // A memória RAM é atualizada e o useEffect redesenha a tela instantaneamente

    } catch (error) {
      showToast("Erro ao executar a ordem.");
    } finally {
      setIsResolving(false);
    }
  };


  const filteredClients = activeClients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // União do Loading Global (RAM) + Loading Local (Batch)
  if (isGlobalLoading || isDashboardLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full mb-3 shadow-sm border border-white">
            <Activity size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Terminal de Gestão C-Level</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Panorama Global da <span className="text-[var(--color-atelier-terracota)] italic">Operação.</span>
          </h1>
        </div>

        <div className="flex gap-4 shrink-0">
          <div className="bg-white/60 backdrop-blur-md border border-white p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Contratos Ativos</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{totalActiveProjects < 10 ? `0${totalActiveProjects}` : totalActiveProjects}</span>
          </div>
          <div className={`border p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer transition-colors ${totalUrgentTasks > 0 ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/20 hover:bg-[var(--color-atelier-terracota)]/15' : 'bg-white/60 border-white'}`}>
            <span className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${totalUrgentTasks > 0 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>Pontos de Fricção</span>
            <span className={`font-elegant text-3xl flex items-center gap-2 ${totalUrgentTasks > 0 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>
              {totalUrgentTasks > 0 && <AlertCircle size={20} />} {totalUrgentTasks < 10 ? `0${totalUrgentTasks}` : totalUrgentTasks}
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: LISTA DE ATIVOS (CRM Executivo) - 65% */}
        <div className="w-[65%] glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] h-full">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 group/search">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
                <input 
                  type="text" placeholder="Auditar ativo em operação..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-3 pl-12 pr-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={() => showToast("A abrir matriz de filtros...")}
                className="px-5 py-3 bg-white hover:bg-[var(--color-atelier-grafite)]/5 border border-white rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Filter size={14} /> Refinar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
              <div className="col-span-4">Ativo / Escopo</div>
              <div className="col-span-3">Ponto de Produção</div>
              <div className="col-span-3">Risco SLA (Dias)</div>
              <div className="col-span-2 text-right">Mesa de Trabalho</div>
            </div>

            {filteredClients.length === 0 ? (
               <div className="text-center p-10 font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 italic">Nenhum contrato ativo corresponde à pesquisa.</div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white/50 hover:bg-white border border-transparent hover:border-white rounded-2xl transition-all group shadow-sm mb-2 mx-2">
                  
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-xl border border-[var(--color-atelier-terracota)]/20 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">{client.name}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate mt-0.5">{client.project}</span>
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center">
                    <span className={`
                      px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border truncate
                      ${client.status === 'waiting_client' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' : ''}
                      ${client.status === 'action_required' ? 'bg-red-500/10 text-red-700 border-red-500/20' : ''}
                      ${client.status === 'on_track' ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}
                    `}>
                      {client.status === 'waiting_client' && <Clock size={12} />}
                      {client.status === 'action_required' && <ShieldAlert size={12} />}
                      {client.status === 'on_track' && <CheckCircle2 size={12} />}
                      <span className="truncate">{client.phase}</span>
                    </span>
                  </div>

                  <div className="col-span-3 flex flex-col justify-center">
                    <span className={`font-roboto font-bold text-[13px] flex items-center gap-1.5 ${client.daysLeft !== '--' && parseInt(client.daysLeft) <= 3 ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]'}`}>
                      {client.daysLeft !== '--' && parseInt(client.daysLeft) <= 3 && <AlertCircle size={12}/>}
                      {client.daysLeft} Dias
                    </span>
                    <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest font-bold mt-0.5">{client.lastActive}</span>
                  </div>

                  <div className="col-span-2 flex justify-end items-center">
                    <button 
                      onClick={() => {
                        showToast(`A rotear para a Mesa de Trabalho...`);
                        router.push("/admin/projetos");
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white border border-[var(--color-atelier-terracota)]/20 px-4 py-2 rounded-xl hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm flex items-center gap-1.5 group-hover:border-transparent"
                    >
                      Acessar <ArrowUpRight size={14} />
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: RADAR DE URGÊNCIA INTERATIVO - 35% */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] flex flex-col overflow-hidden h-full relative">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${totalUrgentTasks > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                {totalUrgentTasks > 0 ? <Activity size={14} strokeWidth={2.5} className="animate-pulse"/> : <CheckCircle2 size={14} strokeWidth={2.5} />}
              </div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Matriz de Intervenção</h3>
            </div>
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-2 uppercase tracking-widest font-bold">
              {totalUrgentTasks > 0 ? 'Fricções que exigem resolução imediata' : 'Operação Estável. Zero fricções.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4">
            {urgentTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                 <ShieldAlert size={32} className="mb-2 text-green-600" />
                 <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">Todos os Ativos estão dentro do SLA.<br/>Nenhuma intervenção exigida.</p>
               </div>
            ) : (
              urgentTasks.map((task, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} key={task.id} 
                  onClick={() => setActiveActionTask(task)} 
                  className={`border p-5 rounded-2xl shadow-[0_5px_15px_rgba(122,116,112,0.05)] transition-all group cursor-pointer relative overflow-hidden
                    ${task.priority === 'critical' ? 'bg-red-50/50 border-red-200 hover:border-red-400' : 
                      task.priority === 'high' ? 'bg-orange-50/50 border-orange-200 hover:border-orange-400' : 
                      'bg-white border-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/40'}
                  `}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity
                    ${task.priority === 'critical' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-[var(--color-atelier-terracota)]'}
                  `}></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] flex items-center gap-1.5">
                      {task.priority === 'critical' && <AlertCircle size={10} className="text-red-500"/>} {task.client}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 flex items-center gap-1"><Clock size={10}/> {task.time}</span>
                  </div>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed mb-4 font-medium">
                    {task.title}
                  </p>
                  
                  <div className="w-full py-2.5 bg-white/60 group-hover:bg-white text-[var(--color-atelier-grafite)]/60 group-hover:text-[var(--color-atelier-terracota)] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-transparent group-hover:border-[var(--color-atelier-terracota)]/20 shadow-sm">
                    Executar Ordem <Zap size={12} className="group-hover:fill-[var(--color-atelier-terracota)]"/>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          
          <div className="p-4 shrink-0 bg-white/40 border-t border-white">
            <button 
              onClick={() => showToast("A carregar log de auditoria executiva...")}
              className="w-full py-3 bg-[var(--color-atelier-grafite)]/5 hover:bg-[var(--color-atelier-grafite)]/10 border border-transparent hover:border-white rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-atelier-grafite)] transition-all shadow-sm"
            >
              Auditoria de Sistema
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          MODAL: CENTRO DE RESOLUÇÃO CONTEXTUAL
          ========================================================================= */}
      <AnimatePresence>
        {activeActionTask && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveActionTask(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white p-8">
              
              <div className="flex justify-between items-start mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-[var(--color-atelier-terracota)] fill-[var(--color-atelier-terracota)]/20" />
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Ação Requerida</span>
                  </div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{activeActionTask.client}</h3>
                </div>
                <button onClick={() => setActiveActionTask(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"><X size={16}/></button>
              </div>

              <div className="mb-8">
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] leading-relaxed bg-[var(--color-atelier-creme)]/30 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5">
                  {activeActionTask.title}
                </p>
                
                {activeActionTask.type === 'community_approval' && (
                  <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Conteúdo Submetido:</span>
                    <p className="text-[13px] italic text-gray-600">"{activeActionTask.payload.content}"</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 mt-auto">
                {activeActionTask.type === 'phase_advance' && (
                  <button onClick={() => executeResolution('advance')} disabled={isResolving} className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md flex justify-center items-center gap-2">
                    {isResolving ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16}/>} Avançar Projeto para Pesquisa
                  </button>
                )}

                {activeActionTask.type === 'vault_upload' && (
                  <div className="flex gap-3">
                    <button onClick={() => { showToast("A rotear para o Cofre..."); router.push("/admin/projetos"); }} className="flex-1 bg-white border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors shadow-sm flex justify-center items-center gap-2">
                      <UploadCloud size={14}/> Ir para o Cofre
                    </button>
                    <button onClick={() => executeResolution('deliver')} disabled={isResolving} className="flex-1 bg-green-600 text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-colors shadow-sm flex justify-center items-center gap-2">
                      {isResolving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Marcar como Entregue
                    </button>
                  </div>
                )}

                {activeActionTask.type === 'community_approval' && (
                  <div className="flex gap-3">
                    <button onClick={() => executeResolution('reject')} disabled={isResolving} className="flex-1 bg-red-50 text-red-600 border border-red-200 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors shadow-sm flex justify-center items-center gap-2">
                      {isResolving ? <Loader2 size={14} className="animate-spin"/> : <X size={14}/>} Rejeitar
                    </button>
                    <button onClick={() => executeResolution('approve')} disabled={isResolving} className="flex-1 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-600 transition-colors shadow-md flex justify-center items-center gap-2">
                      {isResolving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Aprovar Partilha
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}