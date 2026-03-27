// src/app/admin/clientes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Filter, Plus, ArrowRight, 
  Mail, Building, Calendar, MoreVertical, 
  CheckCircle2, Clock, AlertCircle, X, Edit2, Trash2, Ban, Loader2
} from "lucide-react";
import { supabase } from "../../../lib/supabase"; // A nossa conexão real ao banco

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function BaseClientesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 

  // Estados do Supabase
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos Modais e Menus
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Dados do Formulário de Novo Projeto
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState("Identidade Visual Premium");

  // ==========================================
  // BUSCAR PROJETOS E CLIENTES (READ)
  // ==========================================
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca os projetos cruzados com os perfis
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, profiles(nome, empresa, email, avatar_url)')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      if (projectsData) setDbProjects(projectsData);

      // 2. Busca os clientes disponíveis para o Dropdown do Modal
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('role', 'client');

      if (clientsError) throw clientsError;
      if (clientsData) setAvailableClients(clientsData);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      showToast("Erro ao conectar com a base de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==========================================
  // CRIAR NOVO PROJETO (CREATE)
  // ==========================================
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      showToast("Selecione um cliente válido da lista.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('projects').insert({
        client_id: selectedClientId,
        type: selectedProjectType,
        status: 'active',
        phase: 'Mesa de Trabalho',
        progress: 0
      });

      if (error) throw error;

      showToast("✨ Novo projeto forjado com sucesso!");
      setIsNewClientModalOpen(false);
      setSelectedClientId("");
      fetchData(); // Atualiza a lista na tela
    } catch (error) {
      console.error("Erro ao criar:", error);
      showToast("Erro ao criar projeto. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtragem local
  const filteredClients = dbProjects.filter(project => {
    const nome = project.profiles?.nome || "";
    const empresa = project.profiles?.empresa || "";
    
    const matchesSearch = nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          empresa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleManageClient = (clientName: string) => {
    showToast(`A aceder à Mesa de Trabalho de ${clientName}...`);
    router.push('/admin/projetos');
  };

  const handleMenuAction = async (action: string, projectId: string) => {
    setOpenMenuId(null);
    if (action === 'Apagar') {
      const confirm = window.confirm("Tem a certeza que deseja apagar este projeto?");
      if (!confirm) return;
      
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        showToast("Erro ao apagar projeto.");
      } else {
        showToast("Projeto apagado com sucesso.");
        fetchData();
      }
    } else {
      showToast(`Ação "${action}" em desenvolvimento na Fase 2.`);
    }
  };

  // Função para formatar a data que vem do banco
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO CRM E FILTROS FIXOS
          ========================================== */}
      <header className="shrink-0 flex flex-col gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
                <Users size={16} className="text-[var(--color-atelier-terracota)]" />
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
                Gestão de Relacionamento
              </span>
            </div>
            <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
              Base de <span className="text-[var(--color-atelier-terracota)] italic">Clientes.</span>
            </h1>
          </div>

          <button 
            onClick={() => setIsNewClientModalOpen(true)}
            className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-6 py-3.5 rounded-full font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 shadow-[0_10px_20px_rgba(122,116,112,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus size={16} /> Novo Projeto
          </button>
        </div>

        <div className="glass-panel p-2 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 border border-white">
          <div className="relative w-full md:w-[350px] group/search">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou empresa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-2.5 pl-11 pr-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0 px-1">
            <FilterButton label="Todos" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
            <FilterButton label="Em Forja (Ativos)" active={filterStatus === 'active'} onClick={() => setFilterStatus('active')} />
            <FilterButton label="Pendentes" active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')} />
            <FilterButton label="Legado (Concluídos)" active={filterStatus === 'completed'} onClick={() => setFilterStatus('completed')} />
          </div>
        </div>
      </header>

      {/* ==========================================
          2. A LISTA DE CLIENTES E PROJETOS
          ========================================== */}
      <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-md shrink-0">
          <div className="col-span-4 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Identificação</div>
          <div className="col-span-3 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Status & Fase</div>
          <div className="col-span-3 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Progresso</div>
          <div className="col-span-2 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 text-right">Ação</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredClients.map((project, index) => (
                <motion.div 
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-4 py-4 rounded-[1.5rem] bg-white/50 border border-transparent hover:border-white hover:bg-white hover:shadow-[0_10px_30px_rgba(173,111,64,0.08)] transition-all items-center group cursor-pointer"
                  onClick={(e) => {
                    if (openMenuId === project.id) return;
                    handleManageClient(project.profiles?.nome || "Cliente");
                  }}
                >
                  
                  {/* 1. Avatar e Identificação */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] font-elegant text-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      {project.profiles?.avatar_url ? (
                        <img src={project.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        project.profiles?.nome?.charAt(0) || "C"
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-roboto font-bold text-[15px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                        {project.profiles?.nome || "Cliente Sem Nome"}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 truncate">
                          <Building size={12} /> {project.profiles?.empresa || "Sem Empresa"}
                        </span>
                        <span className="hidden xl:flex items-center gap-1 font-roboto text-[11px] text-[var(--color-atelier-grafite)]/40 truncate">
                          <Mail size={12} /> {project.profiles?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Status e Fase */}
                  <div className="col-span-3 flex flex-col justify-center items-start gap-2">
                    {project.status === 'active' && <StatusBadge icon={Clock} text="Em Forja" color="terracota" />}
                    {project.status === 'pending' && <StatusBadge icon={AlertCircle} text="Ação Pendente" color="orange" />}
                    {project.status === 'completed' && <StatusBadge icon={CheckCircle2} text="Concluído" color="green" />}
                    
                    <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]/70">
                      {project.phase}
                    </span>
                  </div>

                  {/* 3. Escopo e Progresso */}
                  <div className="col-span-3 flex flex-col justify-center pr-8">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">
                        {project.type}
                      </span>
                      <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${project.progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)]'}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest font-bold">
                      <Calendar size={10} /> Ingresso: {formatDate(project.created_at)}
                    </div>
                  </div>

                  {/* 4. Ações (Botões Funcionais) */}
                  <div className="col-span-2 flex justify-end items-center gap-3 relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="w-10 h-10 rounded-xl bg-white border border-white/50 flex items-center justify-center text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)]/30 transition-all shadow-sm group-hover:bg-white"
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {openMenuId === project.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-[110%] right-[60px] w-48 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => handleMenuAction('Editar Perfil', project.id)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors w-full text-left">
                            <Edit2 size={14} /> Editar Dados
                          </button>
                          <button onClick={() => handleMenuAction('Suspender', project.id)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors w-full text-left">
                            <Ban size={14} /> Suspender Projeto
                          </button>
                          <div className="h-px bg-[var(--color-atelier-grafite)]/10 my-1 w-full"></div>
                          <button onClick={() => handleMenuAction('Apagar', project.id)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors w-full text-left">
                            <Trash2 size={14} /> Apagar Registo
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageClient(project.profiles?.nome);
                      }}
                      className="bg-transparent border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] px-5 py-2.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm flex items-center gap-2 group-hover:border-transparent"
                    >
                      Gerir <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                </motion.div>
              ))}
              
              {filteredClients.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 text-center">
                  <Search size={32} className="text-[var(--color-atelier-grafite)]/20 mb-3" />
                  <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]/50">Nenhum projeto encontrado.</p>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/40 mt-1">Crie um novo projeto ou verifique a sua base no Supabase.</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ==========================================
          3. MODAL DE NOVO PROJETO NO SUPABASE
          ========================================== */}
      <AnimatePresence>
        {isNewClientModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewClientModalOpen(false)}
              className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-sm cursor-pointer"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[600px] bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_20px_50px_rgba(122,116,112,0.2)] border border-white overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 flex justify-between items-center">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Novo Projeto</h2>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1">Iniciar na forja</p>
                </div>
                <button onClick={() => setIsNewClientModalOpen(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="p-8 flex flex-col gap-5">
                
                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70">Selecionar Cliente</label>
                  <select 
                    required 
                    value={selectedClientId} 
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)]"
                  >
                    <option value="" disabled>-- Selecione um cliente registado --</option>
                    {availableClients.map(client => (
                      <option key={client.id} value={client.id}>{client.nome} ({client.email})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[var(--color-atelier-terracota)] font-bold px-1">O cliente deve ter criado a sua conta via portal primeiro.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70">Tipo de Projeto (Escopo)</label>
                  <select 
                    value={selectedProjectType}
                    onChange={(e) => setSelectedProjectType(e.target.value)}
                    className="bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)]"
                  >
                    <option>Identidade Visual Premium</option>
                    <option>Rebranding Pleno</option>
                    <option>Naming + Identidade Visual</option>
                    <option>Identidade + Web Design</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="mt-4 w-full bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] py-4 rounded-2xl font-roboto font-bold uppercase tracking-widest text-[12px] hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Iniciar Novo Projeto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES (Design System)
// ==========================================

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        px-5 py-2 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] transition-all whitespace-nowrap
        ${active 
          ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' 
          : 'bg-transparent text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)]'
        }
      `}
    >
      {label}
    </button>
  );
}

function StatusBadge({ icon: Icon, text, color }: { icon: any, text: string, color: 'terracota' | 'orange' | 'green' }) {
  const colorStyles = {
    terracota: 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    green: 'bg-green-500/10 text-green-700 border-green-500/20',
  };

  return (
    <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-roboto text-[9px] uppercase tracking-widest font-black ${colorStyles[color]}`}>
      <Icon size={10} strokeWidth={2.5} /> {text}
    </div>
  );
}