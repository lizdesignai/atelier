// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Activity, AlertCircle, Search, 
  Filter, CheckCircle2, Clock,
  ArrowRight, ArrowUpRight, Loader2
} from "lucide-react";
import { supabase } from "../../lib/supabase"; // Ajuste o caminho se necessário

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// MAPEAMENTO DE FASES PARA UI
const STAGE_MAP: Record<string, string> = {
  'reuniao': 'Briefing Pendente',
  'pesquisa': 'Pesquisa & Estratégia',
  'direcionamento': 'Direcionamento Criativo',
  'processo': 'Processo Criativo IDV',
  'apresentacao': 'Preparação Final'
};

export default function AdminDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  // ==========================================
  // ESTADOS DO SUPABASE E DADOS REAIS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [activeClients, setActiveClients] = useState<any[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  
  // Contadores
  const [totalActiveProjects, setTotalActiveProjects] = useState(0);
  const [totalUrgentTasks, setTotalUrgentTasks] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Busca Todos os Projetos Ativos
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        let formattedClients: any[] = [];
        let tasks: any[] = [];
        let alertCount = 0;

        if (projectsData) {
          setTotalActiveProjects(projectsData.length);

          for (const project of projectsData) {
            // A. Calcula Dias Restantes
            let daysLeft = '--';
            if (project.data_limite) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const deadline = new Date(project.data_limite);
              deadline.setHours(0, 0, 0, 0);
              const diffTime = deadline.getTime() - today.getTime();
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
            }

            // B. Lógica de Status Baseada no Banco (Status Visual)
            let visualStatus = 'on_track'; // default
            
            // Verifica se tem briefing
            const { data: briefing } = await supabase.from('client_briefings').select('is_completed').eq('project_id', project.id).single();
            if (!briefing || !briefing.is_completed) {
              visualStatus = 'waiting_client';
            } else if (daysLeft !== '--' && parseInt(daysLeft) <= 3) {
               visualStatus = 'action_required'; // Faltam 3 dias ou menos!
            }

            formattedClients.push({
              id: project.id,
              name: project.profiles?.nome || 'Cliente',
              project: project.type,
              phase: STAGE_MAP[project.fase] || 'Alinhamento',
              status: visualStatus,
              daysLeft: daysLeft,
              lastActive: "Ativo Hoje" // Idealmente leria da tabela auth, mas mantemos estético por enquanto
            });

            // ==========================================
            // MOTOR DE GERAÇÃO DE TAREFAS URGENTES
            // ==========================================
            
            // Urgência 1: Prazo Curto (<= 3 dias)
            if (daysLeft !== '--' && parseInt(daysLeft) <= 3 && parseInt(daysLeft) > 0) {
              tasks.push({
                id: `deadline-${project.id}`,
                client: project.profiles?.nome,
                type: "system",
                title: `Cofre abre em ${daysLeft} dias. Necessário upload dos ficheiros finais (Ativos).`,
                time: "Urgente",
                projectId: project.id
              });
              alertCount++;
            } else if (daysLeft !== '--' && parseInt(daysLeft) <= 0) {
                tasks.push({
                id: `deadline-${project.id}`,
                client: project.profiles?.nome,
                type: "system",
                title: `Prazo esgotado! O cofre foi revelado.`,
                time: "Atrasado",
                projectId: project.id
              });
              alertCount++;
            }

            // Urgência 2: Cliente enviou Briefing mas projeto ainda está na Fase 1
            if (briefing?.is_completed && (!project.fase || project.fase === 'reuniao')) {
              tasks.push({
                id: `briefing-${project.id}`,
                client: project.profiles?.nome,
                type: "feedback",
                title: "Briefing Estratégico preenchido. Necessário iniciar pesquisa.",
                time: "Pendente",
                projectId: project.id
              });
              alertCount++;
            }
          }
          
          setActiveClients(formattedClients);
          
          // Busca Posts da Comunidade Pendentes de Aprovação (Missão 3.1 ligada aqui)
          const { data: pendingPosts } = await supabase.from('community_posts').select('id, profiles(nome)').eq('status', 'pending');
          if (pendingPosts && pendingPosts.length > 0) {
             pendingPosts.forEach((post: any) => {
                 // Contornamos o TypeScript verificando se o Supabase devolveu um Array ou um Objeto
                 const clientName = Array.isArray(post.profiles) ? post.profiles[0]?.nome : post.profiles?.nome;
                 
                 tasks.push({
                    id: `post-${post.id}`,
                    client: clientName || "Membro da Comunidade",
                    type: "system",
                    title: "Nova partilha na comunidade a aguardar aprovação.",
                    time: "Moderação",
                    route: "/comunidade" // Redireciona para a comunidade em vez do estúdio
                 });
                 alertCount++;
             });
          }

          setUrgentTasks(tasks);
          setTotalUrgentTasks(alertCount);
        }

      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
        showToast("Erro ao sincronizar dados da operação.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const filteredClients = activeClients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. HEADER DO COMANDO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full mb-3 shadow-sm border border-white">
            <Activity size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Central de Comando</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Visão Geral da <span className="text-[var(--color-atelier-terracota)] italic">Operação.</span>
          </h1>
        </div>

        {/* Estatísticas Rápidas (DADOS REAIS) */}
        <div className="flex gap-4 shrink-0">
          <div className="bg-white/60 backdrop-blur-md border border-white p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Projetos Ativos</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{totalActiveProjects < 10 ? `0${totalActiveProjects}` : totalActiveProjects}</span>
          </div>
          <div className={`border p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer transition-colors ${totalUrgentTasks > 0 ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/20 hover:bg-[var(--color-atelier-terracota)]/15' : 'bg-white/60 border-white'}`}>
            <span className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${totalUrgentTasks > 0 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>Requer Ação</span>
            <span className={`font-elegant text-3xl flex items-center gap-2 ${totalUrgentTasks > 0 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>
              {totalUrgentTasks > 0 && <AlertCircle size={20} />} {totalUrgentTasks < 10 ? `0${totalUrgentTasks}` : totalUrgentTasks}
            </span>
          </div>
        </div>
      </header>

      {/* ==========================================
          2. O PAINEL DIVIDIDO (Split Screen)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: LISTA DE CLIENTES (CRM Rápido) - 65% */}
        <div className="w-[65%] glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] h-full">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 group/search">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
                <input 
                  type="text" placeholder="Buscar cliente ativo na forja..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-3 pl-12 pr-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={() => showToast("A abrir filtros de estado...")}
                className="px-5 py-3 bg-white hover:bg-[var(--color-atelier-grafite)]/5 border border-white rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Filter size={14} /> Filtros
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
              <div className="col-span-4">Cliente / Projeto</div>
              <div className="col-span-3">Fase Atual</div>
              <div className="col-span-3">Prazo (Cofre)</div>
              <div className="col-span-2 text-right">Ação</div>
            </div>

            {filteredClients.length === 0 ? (
               <div className="text-center p-10 font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 italic">Nenhum projeto encontrado.</div>
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
                      {client.status === 'action_required' && <AlertCircle size={12} />}
                      {client.status === 'on_track' && <CheckCircle2 size={12} />}
                      <span className="truncate">{client.phase}</span>
                    </span>
                  </div>

                  <div className="col-span-3 flex flex-col justify-center">
                    <span className={`font-roboto font-bold text-[13px] ${client.daysLeft !== '--' && parseInt(client.daysLeft) <= 3 ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]'}`}>
                      {client.daysLeft} Dias
                    </span>
                    <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest font-bold mt-0.5">{client.lastActive}</span>
                  </div>

                  <div className="col-span-2 flex justify-end items-center">
                    <button 
                      onClick={() => {
                        showToast(`A aceder à Mesa de Trabalho de ${client.name}...`);
                        // Passar o ID do projeto via URL ou Contexto numa App Real (aqui forçamos navegação)
                        router.push("/admin/projetos");
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white border border-[var(--color-atelier-terracota)]/20 px-4 py-2 rounded-xl hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm flex items-center gap-1.5 group-hover:border-transparent"
                    >
                      Gerir <ArrowUpRight size={14} />
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* COLUNA DIREITA: ALERTAS E AÇÕES URGENTES (O Radar) - 35% */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] flex flex-col overflow-hidden h-full">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${totalUrgentTasks > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                {totalUrgentTasks > 0 ? <AlertCircle size={14} strokeWidth={2.5} /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
              </div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Radar de Urgência</h3>
            </div>
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-2 uppercase tracking-widest font-bold">
              {totalUrgentTasks > 0 ? 'Prioridades da operação hoje' : 'Operação Estável. Sem pendências.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4">
            {urgentTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                 <CheckCircle2 size={32} className="mb-2 text-green-600" />
                 <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">Todos os projetos estão no prazo.<br/>Nenhuma ação requerida.</p>
               </div>
            ) : (
              urgentTasks.map((task, index) => (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} key={task.id} className="bg-white border border-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/40 p-5 rounded-2xl shadow-[0_5px_15px_rgba(122,116,112,0.05)] transition-all group cursor-pointer relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-atelier-terracota)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">{task.client}</span>
                    <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/30 flex items-center gap-1"><Clock size={10}/> {task.time}</span>
                  </div>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed mb-4">
                    {task.title}
                  </p>
                  
                  <button 
                    onClick={() => {
                      showToast(`A redirecionar...`);
                      router.push(task.route || "/admin/projetos");
                    }}
                    className="w-full py-2.5 bg-[var(--color-atelier-creme)] group-hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)]/60 group-hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    Resolver Agora <ArrowRight size={12} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
          
          <div className="p-4 shrink-0 bg-white/40 border-t border-white">
            <button 
              onClick={() => showToast("A carregar histórico completo de auditoria do sistema...")}
              className="w-full py-3 bg-[var(--color-atelier-grafite)]/5 hover:bg-[var(--color-atelier-grafite)]/10 border border-transparent hover:border-white rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-atelier-grafite)] transition-all shadow-sm"
            >
              Ver Histórico Completo
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}