// src/app/admin/analytics/views/ProjectsManager.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  FolderKanban, Briefcase, UserCircle2, MapPin, 
  Sparkles, Loader2, PlusCircle, Trash2, Save, 
  Layers, CheckSquare, Square, Flame, Edit3, Check, X, 
  ArrowRight, Trello, ExternalLink, PanelRightClose, PanelRightOpen, ListTodo,
  AlertCircle, AlignLeft, MessageSquare, ChevronLeft, ChevronRight
} from "lucide-react";
import { ALL_SKILLS } from "../constants";

// 🟢 TIPAGEM ESTRITA BLINDADA
interface ProjectsManagerProps {
  unifiedWallet: any[];
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  selectedEntityType: 'project' | 'agency' | 'subclient';
  setSelectedEntityType: (type: 'project' | 'agency' | 'subclient') => void;
  selectedEntityData: any;
  setIsCaptacaoModalOpen: (isOpen: boolean) => void;
  handleAutoDeploy: (project: any, subclient_id?: string) => void;
  isProcessing: boolean;
  tasks: any[];
  adHocDemand: { 
    title: string; 
    projectId: string; 
    assigneeId: string; 
    taskType: string; 
    urgency: boolean; 
    subclientId?: string; 
    description: string;
    caption: string; 
    deadline: string; 
    estTime: number;
    external_links?: string[];
  };
  setAdHocDemand: (demand: any) => void;
  team: any[];
  handleAddAdHocDemand: (payload?: any) => void;
  agencySubclients: any[];
  handleDeleteSubclient: (id: string) => void;
  handleUpdateSubclientDemand: (id: string, count: number) => void;
  groupTasksByStage: (tasks: any[]) => Record<string, any[]>;
  isBulkMode: boolean;
  toggleTaskSelection: (id: string) => void;
  selectedTaskIds: string[];
  setEditingTask: (task: any) => void;
  handleCompleteTask: (id: string) => void;
  isIdvService: (project: any) => boolean;
  showToast: (msg: string) => void;
  handleStartTask: (taskId: string, userId: string) => Promise<void>;
  routingRules?: any[]; 
}

// 🟢 EXTRAIR ID DO BOARD PARA A API REST
const extractTrelloBoardId = (url: string) => {
  if (!url) return null;
  const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

// =======================================================================
// 🧩 COMPONENTE NATIVO: RENDERIZADOR DE TRELLO VIA API
// =======================================================================
const NativeTrelloBoard = ({ boardUrl, onCardClick }: { boardUrl: string, onCardClick: (card: any) => void }) => {
  const [lists, setLists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBoardData = async () => {
      const boardId = extractTrelloBoardId(boardUrl);
      const apiKey = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
      const apiToken = process.env.NEXT_PUBLIC_TRELLO_TOKEN;

      if (!boardId) {
        setError("URL do Trello inválida.");
        setIsLoading(false);
        return;
      }

      if (!apiKey || !apiToken) {
        setError("Credenciais da API do Trello não configuradas no sistema (.env).");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?cards=open&card_attachments=true&key=${apiKey}&token=${apiToken}`);
        if (!response.ok) throw new Error("Acesso negado ou Quadro Privado/Inexistente.");
        
        const data = await response.json();
        setLists(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardData();
  }, [boardUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-full relative group/board overflow-hidden bg-[#f4f5f7]">
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px]">
          <Loader2 size={32} className="animate-spin mb-4 text-[var(--color-atelier-terracota)]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Sincronizando Trello...</span>
        </div>
      </div>
    );
  }
  
  if (error) return <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-8 text-center"><AlertCircle size={40} className="mb-4 opacity-50"/> <p className="font-bold text-[13px] uppercase tracking-widest">{error}</p><p className="text-[12px] text-gray-500 mt-2">Certifique-se de que a API Key e o Token estão corretos e que o quadro existe.</p></div>;

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="w-full h-full relative group/board">
        {lists.length > 0 && (
          <>
            <button 
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.1)] border border-gray-100 p-3 rounded-full text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:scale-110 transition-all opacity-0 group-hover/board:opacity-100"
              title="Rolar para a Esquerda"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={scrollRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white shadow-[0_5px_15px_rgba(0,0,0,0.1)] border border-gray-100 p-3 rounded-full text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:scale-110 transition-all opacity-0 group-hover/board:opacity-100"
              title="Rolar para a Direita"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
        <div 
          ref={scrollRef}
          className="w-full h-full flex gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar p-6 bg-[#f4f5f7] items-start pb-8"
        >
          {lists.map(list => (
          <div key={list.id} className="w-[280px] shrink-0 bg-gray-200/50 rounded-2xl flex flex-col max-h-full border border-gray-200">
            <div className="px-4 py-3 shrink-0">
              <h3 className="font-roboto font-bold text-[13px] text-gray-700">{list.name}</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 flex flex-col gap-2">
              {list.cards.map((card: any) => {
                const isCompleted = card.closed || card.dueComplete;
                return (
                  <div 
                    key={card.id} 
                    onClick={() => setExpandedCard(card)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onCardClick(card);
                    }}
                    className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-[var(--color-atelier-terracota)]/50 hover:shadow-md transition-all group"
                  >
                    <p className={`font-roboto text-[13px] font-medium leading-tight group-hover:text-[var(--color-atelier-terracota)] transition-colors ${isCompleted ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
                      {card.name}
                    </p>
                    {isCompleted && (
                       <div className="mt-2 flex">
                         <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-widest rounded-md">Concluída</span>
                       </div>
                    )}
                    {card.desc && !isCompleted && (
                      <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {card.desc}
                      </p>
                    )}
                    {card.attachments && card.attachments.length > 0 && !isCompleted && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                         <ExternalLink size={10} /> {card.attachments.length} Anexos
                      </div>
                    )}
                  </div>
                );
              })}
              {list.cards.length === 0 && <span className="text-[11px] text-gray-400 font-medium italic px-2 py-4">Nenhum cartão nesta lista.</span>}
            </div>
          </div>
        ))}
      </div>
    </div>

      <AnimatePresence>
        {expandedCard && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setExpandedCard(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white rounded-[2.5rem] p-8 relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 shrink-0">
                <div>
                  <h2 className="text-2xl font-elegant text-gray-800 pr-4">{expandedCard.name}</h2>
                  {(expandedCard.closed || expandedCard.dueComplete) && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-md">Concluída</span>
                  )}
                </div>
                <button onClick={() => setExpandedCard(null)} className="text-gray-400 hover:text-black bg-gray-50 p-2 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                {expandedCard.desc && (
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><AlignLeft size={14}/> Descrição</h3>
                    <div className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {expandedCard.desc}
                    </div>
                  </div>
                )}
                
                {expandedCard.attachments && expandedCard.attachments.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><ExternalLink size={14}/> Mídias Anexadas ({expandedCard.attachments.length})</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {expandedCard.attachments.map((att: any) => (
                        <div key={att.id} className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col">
                           {att.previews && att.previews.length > 0 ? (
                             <a href={att.url} target="_blank" rel="noreferrer" className="block h-32 overflow-hidden hover:opacity-80 transition-opacity">
                               <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                             </a>
                           ) : (
                             <a href={att.url} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center justify-center p-6 text-blue-500 hover:text-blue-600 hover:bg-gray-100 transition-colors">
                               <ExternalLink size={24} className="mb-2 opacity-50" />
                               <span className="text-[11px] font-bold text-center break-all line-clamp-2">{att.name}</span>
                             </a>
                           )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 shrink-0">
                <button 
                  onClick={() => {
                    onCardClick(expandedCard);
                    setExpandedCard(null);
                  }}
                  className="w-full bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[12px] hover:bg-[#8c562e] transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={16} /> Copiar para Formulário de Demanda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function ProjectsManager({
  unifiedWallet,
  selectedEntityId,
  setSelectedEntityId,
  selectedEntityType,
  setSelectedEntityType,
  selectedEntityData,
  setIsCaptacaoModalOpen,
  handleAutoDeploy,
  isProcessing,
  tasks,
  adHocDemand,
  setAdHocDemand,
  team,
  handleAddAdHocDemand,
  agencySubclients,
  handleDeleteSubclient,
  handleUpdateSubclientDemand,
  groupTasksByStage,
  isBulkMode,
  toggleTaskSelection,
  selectedTaskIds,
  setEditingTask,
  handleCompleteTask,
  isIdvService,
  showToast,
  handleStartTask,
  routingRules = [] 
}: ProjectsManagerProps) {

  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [isSubclientModalOpen, setIsSubclientModalOpen] = useState(false);
  const [isCreatingSubclient, setIsCreatingSubclient] = useState(false);
  const [subclientForm, setSubclientForm] = useState({ name: "", count: 0, trello_url: "" });

  const [isTrelloModalOpen, setIsTrelloModalOpen] = useState(false);
  const [isTrelloInputOpen, setIsTrelloInputOpen] = useState(false);
  const [trelloUrlInput, setTrelloUrlInput] = useState("");
  const [isProcessingTrello, setIsProcessingTrello] = useState(false);
  const [activeTrelloEntity, setActiveTrelloEntity] = useState<any>(null);
  const [isTrelloSidebarOpen, setIsTrelloSidebarOpen] = useState(true); 
  const [newLinkInput, setNewLinkInput] = useState("");

  const [walletSearch, setWalletSearch] = useState("");
  const [walletFilter, setWalletFilter] = useState<'all' | 'agency' | 'studio'>('all');

  const isSubclientView = selectedEntityType === 'subclient';
  const displayData = isSubclientView 
    ? agencySubclients.find(s => s.id === selectedEntityId) 
    : selectedEntityData;

  const hasTrello = Boolean(displayData?.trello_url);

  // Auto-Fill Roteamento
  useEffect(() => {
    if ((isAdHocModalOpen || isTrelloModalOpen) && adHocDemand.taskType) {
      const currentProjectAnchorId = isSubclientView && displayData ? displayData.agency_id : selectedEntityId;
      const existingRule = routingRules.find(r => r.project_id === currentProjectAnchorId && r.task_type === adHocDemand.taskType);

      if (existingRule && adHocDemand.assigneeId !== existingRule.assignee_id) {
        setAdHocDemand({ ...adHocDemand, assigneeId: existingRule.assignee_id });
      }
    }
  }, [adHocDemand.taskType, isAdHocModalOpen, isTrelloModalOpen, selectedEntityId, isSubclientView, displayData]);

  const handleSaveTrelloUrl = async () => {
    if (!trelloUrlInput.trim()) return;
    setIsProcessingTrello(true);
    try {
      const table = isSubclientView ? 'agency_subclients' : 'agencies';
      const { error } = await supabase.from(table).update({ trello_url: trelloUrlInput }).eq('id', displayData.id);
      if (error) throw error;
      
      displayData.trello_url = trelloUrlInput;
      showToast("Quadro do Trello vinculado com sucesso!");
      setIsTrelloInputOpen(false);
      setTrelloUrlInput("");
    } catch (e) {
      showToast("Erro ao vincular Trello.");
    } finally {
      setIsProcessingTrello(false);
    }
  };

  // 🟢 FECHAR O MODAL NORMAL E LIMPAR ESTADO
  const closeAdHocModal = () => {
    setIsAdHocModalOpen(false);
    setAdHocDemand({
      title: "", projectId: "", assigneeId: "", taskType: "", urgency: false, subclientId: undefined, description: "", caption: "", deadline: "", estTime: 0
    });
  };

  // 🟢 FUNÇÃO INJETADA PARA PREENCHER FORMULÁRIO A PARTIR DA API DO TRELLO
  const handleTrelloCardClick = (card: any) => {
    setAdHocDemand({
      ...adHocDemand,
      title: card.name,
      description: card.desc || ""
    });
    setIsTrelloSidebarOpen(true);
    showToast("Dados do card carregados no formulário!");
  };

  // ==========================================
  // ADICIONAR DEMANDA PONTUAL (TELA PRINCIPAL)
  // ==========================================
  const executeAdHocSubmit = () => {
    if (!adHocDemand.title.trim() || !adHocDemand.assigneeId.trim()) {
      showToast("Preencha o título e selecione um executor obrigatoriamente.");
      return;
    }

    const isSub = isSubclientView && displayData;
    const isAgency = selectedEntityType === 'agency';
    
    const projId = (!isSub && !isAgency) ? selectedEntityId : "";
    const agId = isSub ? displayData.agency_id : (isAgency ? selectedEntityId : "");
    const subId = isSub ? displayData.id : undefined;

    const payloadDemand = {
      ...adHocDemand,
      projectId: projId,
      agencyId: agId,
      subclientId: subId
    };

    setAdHocDemand(payloadDemand);
    handleAddAdHocDemand(payloadDemand);
    closeAdHocModal();
  };

  // ==========================================
  // ADICIONAR DEMANDA PONTUAL (VIA TRELLO SPLIT-SCREEN)
  // ==========================================
  const executeTrelloAdHocSubmit = () => {
    if (!adHocDemand.title.trim() || !adHocDemand.assigneeId.trim()) {
      showToast("Preencha o título e o executor.");
      return;
    }

    const isSub = Boolean(activeTrelloEntity.agency_id);
    const isAgency = selectedEntityType === 'agency';
    
    const projId = (!isSub && !isAgency) ? (activeTrelloEntity.client_id || activeTrelloEntity.id) : "";
    const agId = isSub ? activeTrelloEntity.agency_id : (isAgency ? selectedEntityId : "");
    const subId = isSub ? activeTrelloEntity.id : undefined;

    const payloadDemand = {
      ...adHocDemand,
      projectId: projId,
      agencyId: agId,
      subclientId: subId
    };

    setAdHocDemand(payloadDemand);
    handleAddAdHocDemand(payloadDemand);
    // UX: Limpa apenas texto visual
    setAdHocDemand({ ...payloadDemand, title: "", description: "", caption: "" });
  };

  const handleCreateSubclient = async () => {
    if (!subclientForm.name.trim()) {
      showToast("O nome da marca/cliente é obrigatório.");
      return;
    }
    
    setIsCreatingSubclient(true);
    try {
      const { error } = await supabase.from('agency_subclients').insert({
        agency_id: selectedEntityId,
        name: subclientForm.name,
        deliverables_count: subclientForm.count,
        trello_url: subclientForm.trello_url || null 
      });

      if (error) throw error;
      
      showToast("Perfil White-Label criado com sucesso!");
      setIsSubclientModalOpen(false);
      setSubclientForm({ name: "", count: 0, trello_url: "" });
      
      setTimeout(() => window.location.reload(), 1000);
    } catch(e) {
      showToast("Erro ao criar perfil de cliente delegado.");
    } finally {
      setIsCreatingSubclient(false);
    }
  };

  const getTasksForCurrentView = () => {
    if (isSubclientView && displayData) return tasks.filter(t => t.subclient_id === displayData.id);
    return tasks.filter(t => t.project_id === selectedEntityId && !t.subclient_id);
  };

  const visibleTasks = getTasksForCurrentView();

  const pendingTasksForActiveTrello = tasks.filter(t => 
    t.status === 'pending' && 
    (activeTrelloEntity?.id === t.subclient_id || activeTrelloEntity?.id === t.project_id || activeTrelloEntity?.client_id === t.project_id)
  );

  return (
    <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden relative">
      
      {/* SIDEBAR UNIFICADA */}
      <div className="w-full lg:w-[320px] glass-panel bg-white/40 p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-[300px] lg:h-full shrink-0 transition-all hover:bg-white/50">
        <div className="mb-4 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mb-3">Carteira Unificada</span>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                className="w-full bg-white/70 border border-white focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/30 rounded-xl py-1.5 pl-8 pr-3 text-xs text-[var(--color-atelier-grafite)] placeholder-gray-400"
              />
            </div>
            
            <div className="relative group/filter">
               <button className="w-8 h-8 rounded-xl bg-white/70 border border-white flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
               </button>
               <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-32 opacity-0 pointer-events-none group-hover/filter:opacity-100 group-hover/filter:pointer-events-auto transition-all z-50">
                  <button onClick={() => setWalletFilter('all')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${walletFilter === 'all' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>Todos</button>
                  <button onClick={() => setWalletFilter('agency')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${walletFilter === 'agency' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>Agências</button>
                  <button onClick={() => setWalletFilter('studio')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${walletFilter === 'studio' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>Studio</button>
               </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {unifiedWallet.filter(item => {
             const matchesSearch = item.name?.toLowerCase().includes(walletSearch.toLowerCase());
             const matchesFilter = walletFilter === 'all' || 
                                   (walletFilter === 'agency' && item.type === 'agency') || 
                                   (walletFilter === 'studio' && item.type === 'project');
             return matchesSearch && matchesFilter;
          }).map(item => {
            const avatarUrl = item.avatar_url || item.profiles?.avatar_url || item.logo_url;
            return (
              <button 
                  key={`${item.type}-${item.id}`} 
                  onClick={() => { setSelectedEntityId(item.id); setSelectedEntityType(item.type as any); setIsTrelloInputOpen(false); }} 
                  className={`p-4 rounded-[1.2rem] text-left transition-all border ${selectedEntityId === item.id ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-sm scale-[1.02]' : 'border-transparent hover:bg-white/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-inner border border-white/50 overflow-hidden shrink-0 ${item.type === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'agency' ? (
                      <Briefcase size={14}/>
                    ) : (
                      <span className="font-elegant text-[14px] leading-none uppercase">{item.name?.charAt(0) || "U"}</span>
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className={`font-roboto font-bold text-[13px] truncate transition-colors ${selectedEntityId === item.id ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/70'}`}>{item.name}</span>
                    <span className={`text-[9px] uppercase font-bold tracking-widest ${item.type === 'agency' ? 'text-blue-500' : 'text-[var(--color-atelier-terracota)]/80'}`}>{item.label}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* PAINEL DINÂMICO DE GESTÃO */}
      <div className="flex-1 glass-panel bg-white/80 p-8 flex flex-col rounded-[2.5rem] shadow-sm overflow-hidden h-full relative">
        {!selectedEntityId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40"><FolderKanban size={48} className="mb-4 text-[var(--color-atelier-terracota)]"/><p className="font-elegant text-3xl">Selecione um Cliente ou Agência</p></div>
        ) : (
          <>
            <button 
              onClick={() => {
                const isSub = isSubclientView && displayData;
                const isAgency = selectedEntityType === 'agency';
                
                const projId = (!isSub && !isAgency) ? selectedEntityId : "";
                const agId = isSub ? displayData.agency_id : (isAgency ? selectedEntityId : "");
                const subId = isSub ? displayData.id : undefined;
                
                setAdHocDemand({ 
                  ...adHocDemand, 
                  projectId: projId, 
                  agencyId: agId,
                  subclientId: subId, 
                  title: "", 
                  description: "", 
                  caption: "", 
                  assigneeId: "", 
                  taskType: "", 
                  urgency: false, 
                  deadline: "", 
                  estTime: 0 
                });
                setIsAdHocModalOpen(true);
              }}
              className="absolute bottom-8 right-8 z-40 bg-[var(--color-atelier-grafite)] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 group"
              title="Adicionar Demanda Pontual"
            >
              <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <div className="flex flex-col xl:flex-row justify-between xl:items-start gap-4 mb-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 pb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-inner border border-white/50 overflow-hidden shrink-0 
                  ${selectedEntityType === 'agency' ? 'bg-blue-50 text-blue-600' : isSubclientView ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}
                `}>
                  {selectedEntityType === 'agency' ? (
                    displayData?.logo_url ? <img src={displayData.logo_url} className="w-full h-full object-cover" /> : <Briefcase size={28}/>
                  ) : isSubclientView ? (
                    <UserCircle2 size={28} />
                  ) : (
                    displayData?.profiles?.avatar_url ? <img src={displayData.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-2xl uppercase">{displayData?.profiles?.nome?.charAt(0) || "W"}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] tracking-tight">
                    {selectedEntityType === 'agency' || isSubclientView ? displayData?.name : displayData?.profiles?.nome}
                  </h2>
                  <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">
                    {selectedEntityType === 'agency' ? 'Operação White-Label (Agência)' : isSubclientView ? 'Subcliente Delegado (White-Label)' : displayData?.service_type}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 flex-wrap justify-end items-center">
                 {(selectedEntityType === 'agency' || isSubclientView) && (
                   hasTrello ? (
                     <button 
                       onClick={() => { 
                          const isSub = Boolean(displayData.agency_id);
                          const isAgency = selectedEntityType === 'agency';
                          
                          const projId = (!isSub && !isAgency) ? (displayData.client_id || displayData.id) : "";
                          const agId = isSub ? displayData.agency_id : (isAgency ? selectedEntityId : "");
                          const subId = isSub ? displayData.id : undefined;

                          setAdHocDemand({ 
                            ...adHocDemand, 
                            projectId: projId, 
                            agencyId: agId,
                            subclientId: subId, 
                            title: "", 
                            description: "", 
                            caption: "", 
                            assigneeId: "", 
                            taskType: "", 
                            urgency: false, 
                            deadline: "", 
                            estTime: 0 
                          });
                          setActiveTrelloEntity(displayData); setIsTrelloSidebarOpen(true); setIsTrelloModalOpen(true); 
                       }} 
                       className="bg-[#0079BF] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#026AA7] transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
                     >
                       <Trello size={14} /> Abrir Trello Board
                     </button>
                   ) : (
                     isTrelloInputOpen ? (
                       <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-1.5 rounded-xl shadow-sm border border-[var(--color-atelier-terracota)]/40 transition-all">
                         <Trello size={14} className="text-[#0079BF]" />
                         <input 
                           type="url" 
                           placeholder="Cole o Link Trello..." 
                           value={trelloUrlInput} 
                           onChange={(e) => setTrelloUrlInput(e.target.value)}
                           className="text-[11px] font-roboto font-medium outline-none w-40 text-[var(--color-atelier-grafite)] placeholder-gray-400 bg-transparent"
                           autoFocus
                         />
                         <button onClick={handleSaveTrelloUrl} disabled={isProcessingTrello} className="w-7 h-7 flex items-center justify-center bg-gray-50 rounded-lg text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                           {isProcessingTrello ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                         </button>
                         <button onClick={() => setIsTrelloInputOpen(false)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                           <X size={12}/>
                         </button>
                       </div>
                     ) : (
                       <button 
                         onClick={() => setIsTrelloInputOpen(true)}
                         className="bg-white text-[#0079BF] border border-[#0079BF]/20 px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#0079BF] hover:text-white transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
                       >
                         <Trello size={14} /> Vincular Trello
                       </button>
                     )
                   )
                 )}

                 <button onClick={() => setIsCaptacaoModalOpen(true)} className="bg-[var(--color-atelier-grafite)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5">
                   <MapPin size={14} className="text-[var(--color-atelier-terracota)]"/> Agendar Captação
                 </button>
                 {(selectedEntityType === 'project' || isSubclientView) && (
                   <button 
                     onClick={() => {
                       const projectToDeploy = isSubclientView ? { id: displayData.agency_id } : displayData;
                       handleAutoDeploy(projectToDeploy, isSubclientView ? displayData.id : undefined);
                     }} 
                     disabled={isProcessing} 
                     className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                   >
                     {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                     {visibleTasks.length > 0 ? "Renovar Ciclo Mensal" : "Iniciar Produção"}
                   </button>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16">
               {selectedEntityType === 'agency' ? (
                 <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h4 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-gray-500">Perfis Sob Demanda</h4>
                      <button onClick={() => setIsSubclientModalOpen(true)} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors shadow-sm border border-blue-100">
                        <PlusCircle size={14}/> Novo Perfil
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {agencySubclients.filter(s => s.agency_id === selectedEntityId).length === 0 ? (
                         <div className="col-span-1 md:col-span-2 text-center py-10 opacity-50">
                           <UserCircle2 size={32} className="mx-auto mb-2 text-gray-400" />
                           <span className="font-bold text-[12px] uppercase tracking-widest">Nenhum cliente cadastrado</span>
                         </div>
                       ) : (
                         agencySubclients.filter(s => s.agency_id === selectedEntityId).map(sub => (
                           <div key={sub.id} className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 group hover:border-[var(--color-atelier-terracota)]/30 transition-all hover:bg-white relative overflow-hidden">
                              <div className="flex justify-between items-start z-10 relative">
                                 <span className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)] flex items-center gap-2">
                                   {sub.name}
                                   {sub.trello_url && <span title="Conectado ao Trello" className="flex items-center"><Trello size={14} className="text-[#0079BF]" /></span>}
                                 </span>
                                 <button onClick={() => handleDeleteSubclient(sub.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                              </div>
                              <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 z-10 relative">
                                 <div className="flex-1">
                                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Carga Mensal (Posts)</span>
                                    <input 
                                      type="number" 
                                      defaultValue={sub.deliverables_count} 
                                      onBlur={(e) => handleUpdateSubclientDemand(sub.id, parseInt(e.target.value))}
                                      className="bg-transparent font-bold text-[18px] outline-none w-full text-blue-600" 
                                    />
                                 </div>
                                 <Save size={18} className="text-gray-300 hover:text-blue-500 transition-colors cursor-pointer"/>
                              </div>
                              
                              <button 
                                onClick={() => { setSelectedEntityId(sub.id); setSelectedEntityType('subclient'); }}
                                className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors mt-2 flex items-center justify-center gap-2 relative z-10"
                              >
                                Gerir Este Cliente <ArrowRight size={14}/>
                              </button>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
               ) : (
                 Object.keys(groupTasksByStage(visibleTasks)).map(stage => (
                    <div key={stage} className="mb-6 animate-[fadeIn_0.4s_ease-out]">
                      <h4 className="font-roboto font-bold text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-3 flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 pb-2"><Layers size={12}/> {stage}</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {visibleTasks.filter(t => t.stage === stage).map(task => {
                          const isSelected = selectedTaskIds.includes(task.id);
                          const executorName = task.profiles?.nome ? task.profiles.nome.split(" ")[0] : "Aguardando Responsável";

                          return (
                            <div 
                              key={task.id} 
                              onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                              className={`p-5 rounded-[1.2rem] border flex flex-col gap-3 transition-all group ${isBulkMode ? 'cursor-pointer hover:scale-[1.02]' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-sm' : 'bg-white/80 border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 hover:bg-white shadow-sm'}`}
                            >
                              <div className="flex justify-between items-start">
                                 <div className="flex gap-3">
                                   {isBulkMode && (
                                     <div className="shrink-0 text-[var(--color-atelier-terracota)] mt-0.5">
                                       {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300"/>}
                                     </div>
                                   )}
                                   <span className={`text-[13px] font-bold leading-tight pr-4 transition-colors group-hover:text-[var(--color-atelier-terracota)] ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>{task.title}</span>
                                 </div>
                                 {!isBulkMode && <button onClick={() => setEditingTask(task)} className="opacity-0 group-hover:opacity-100 text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] transition-opacity"><Edit3 size={14}/></button>}
                              </div>
                              <div className="flex justify-between items-end border-t border-[var(--color-atelier-grafite)]/5 pt-3 mt-1">
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-white shadow-inner flex items-center justify-center text-xs font-bold text-gray-400">
                                      {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={10} className="text-gray-300"/>}
                                    </div>
                                    <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">
                                      {executorName}
                                    </span>
                                 </div>
                                 <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-[var(--color-atelier-grafite)]/40'}`}>
                                   {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem Prazo'}
                                 </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                 ))
               )}
            </div>
          </>
        )}
      </div>

      {/* ==========================================
          MODAL GERAL: AD HOC DEMAND (Para projetos diretos sem trello)
          ========================================== */}
      <AnimatePresence>
        {isAdHocModalOpen && !isTrelloModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 md:px-8 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeAdHocModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-2 shrink-0">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <Flame size={24} className="text-[var(--color-atelier-terracota)]"/> Demanda Pontual
                  </h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Adicionar tarefa para: {displayData?.name || displayData?.profiles?.nome}
                  </p>
                </div>
                <button onClick={closeAdHocModal} className="text-gray-400 hover:text-black transition-colors bg-gray-50 p-2 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Tarefa <span className="text-red-500">*</span></span>
                  <input 
                    type="text" placeholder="Ex: Criar banner para o site..." 
                    value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors shadow-sm" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                    <AlignLeft size={12}/> Instruções para a Equipe
                  </span>
                  <textarea 
                    placeholder="Detalhes para o executor, links de referência, etc..."
                    value={adHocDemand.description || ""} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar transition-colors shadow-sm" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                    <MessageSquare size={12}/> Legenda do Post (Aprovação Cliente)
                  </span>
                  <textarea 
                    placeholder="Escreva a legenda que ficará visível no Cockpit..."
                    value={adHocDemand.caption || ""} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, caption: e.target.value})} 
                    className="w-full bg-white border border-[var(--color-atelier-terracota)]/30 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar transition-colors shadow-sm" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                    <ExternalLink size={12}/> Links Externos (Download/Referência)
                  </span>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={newLinkInput}
                      onChange={(e) => setNewLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLinkInput.trim()) {
                          e.preventDefault();
                          setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), newLinkInput.trim()]});
                          setNewLinkInput("");
                        }
                      }}
                      className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm"
                    />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (newLinkInput.trim()) {
                          setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), newLinkInput.trim()]});
                          setNewLinkInput("");
                        }
                      }}
                      className="bg-[var(--color-atelier-grafite)] text-white px-4 rounded-xl flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm"
                    >
                      <PlusCircle size={16} />
                    </button>
                  </div>
                  {adHocDemand.external_links && adHocDemand.external_links.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {adHocDemand.external_links.map((link: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[11px] font-medium">
                          <span className="max-w-[150px] truncate">{link}</span>
                          <button onClick={() => setAdHocDemand({...adHocDemand, external_links: adHocDemand.external_links.filter((_: string, idx: number) => idx !== i)})} className="hover:text-red-500">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                  <select 
                    value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                  >
                    <option value="">Definir Escopo...</option>
                    {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                  <select 
                    value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                  >
                    <option value="">Escolher Membro da Equipe...</option>
                    {team.map(t => {
                      const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                      return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                    })}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Deadline</span>
                    <input type="datetime-local" value={adHocDemand.deadline} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Tempo Est. (Min)</span>
                    <input type="number" value={adHocDemand.estTime} onChange={(e) => setAdHocDemand({...adHocDemand, estTime: parseInt(e.target.value) || 0})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors mt-2">
                  <input type="checkbox" className="hidden" checked={adHocDemand.urgency || false} onChange={(e) => setAdHocDemand({...adHocDemand, urgency: e.target.checked})} />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${adHocDemand.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>
                    {adHocDemand.urgency && <Check size={12} strokeWidth={3}/>}
                  </div>
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1">Classificar como Urgente</span>
                </label>
              </div>

              <button 
                onClick={executeAdHocSubmit} 
                disabled={isProcessing || !adHocDemand.title.trim() || !adHocDemand.assigneeId} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Despachar Tarefa
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          🟢 O MÁGICO MODAL TRELLO (NATIVO API + SPLIT-SCREEN)
          ========================================== */}
      <AnimatePresence>
        {isTrelloModalOpen && activeTrelloEntity && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 md:px-10 py-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrelloModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full h-full max-w-[1600px] bg-white rounded-[2.5rem] shadow-2xl relative z-10 flex overflow-hidden border border-white/20"
            >
              
              {/* LADO ESQUERDO: TRELLO NATIVO VIA API */}
              <motion.div 
                animate={{ width: isTrelloSidebarOpen ? '80%' : '100%' }} 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className="h-full flex flex-col bg-gray-50 border-r border-gray-200 shadow-inner overflow-hidden"
              >
                <div className="bg-[#0079BF] px-5 py-3 flex items-center justify-between text-white shrink-0 z-20 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm shadow-inner">
                      <Trello size={20} /> 
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[14px] leading-none">{activeTrelloEntity.profiles?.nome || activeTrelloEntity.name}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/70 mt-1">Integração Nativa Atelier</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => window.open(activeTrelloEntity.trello_url, '_blank')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-white/10">
                      <ExternalLink size={14}/> Abrir no Trello
                    </button>
                    
                    <button 
                      onClick={() => setIsTrelloSidebarOpen(!isTrelloSidebarOpen)} 
                      className="px-4 py-2 bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-inner border border-white/10"
                    >
                      {isTrelloSidebarOpen ? <PanelRightClose size={14}/> : <PanelRightOpen size={14}/>} {isTrelloSidebarOpen ? 'Ocultar Formulário' : 'Nova Demanda'}
                    </button>
                    
                    <button onClick={() => setIsTrelloModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-red-500 transition-colors border border-white/10 ml-2">
                      <X size={18}/>
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full bg-[#f4f5f7] relative z-10 overflow-hidden">
                  <NativeTrelloBoard 
                    boardUrl={activeTrelloEntity.trello_url} 
                    onCardClick={handleTrelloCardClick}
                  />
                </div>
              </motion.div>

              {/* LADO DIREITO: FORMULÁRIO DE DEMANDA RECOLHÍVEL (20%) */}
              <AnimatePresence initial={false}>
                {isTrelloSidebarOpen && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }} 
                    animate={{ width: '20%', minWidth: '340px', opacity: 1 }} 
                    exit={{ width: 0, opacity: 0 }} 
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className="h-full bg-white flex flex-col shrink-0 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20"
                  >
                    <div className="flex-1 flex flex-col h-full w-full overflow-y-auto custom-scrollbar p-6">
                      
                      <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0">
                        <div>
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                            <Flame size={24} className="text-[var(--color-atelier-terracota)]"/> Despacho
                          </h3>
                          <p className="font-roboto text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Clique em um card ao lado para auto-preencher.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">

                        {/* DROP-DOWN MÁGICO: Autopreencher com Tarefas Pendentes da Entidade */}
                        {pendingTasksForActiveTrello.length > 0 && (
                          <div className="flex flex-col gap-1.5 mb-2">
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1"><ListTodo size={12}/> Demandas Planejadas</span>
                            <select 
                              onChange={(e) => {
                                const selectedTask = pendingTasksForActiveTrello.find(t => t.id === e.target.value);
                                if (selectedTask) setAdHocDemand({ ...adHocDemand, title: selectedTask.title, taskType: selectedTask.task_type || "" });
                              }} 
                              className="w-full bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-terracota)] font-bold cursor-pointer shadow-sm"
                            >
                              <option value="">-- Puxar da Fila Interna --</option>
                              {pendingTasksForActiveTrello.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Tarefa <span className="text-red-500">*</span></span>
                          <input 
                            type="text" placeholder="Título..." 
                            value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors shadow-sm" 
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                            <AlignLeft size={12}/> Instruções para a Equipe
                          </span>
                          <textarea 
                            placeholder="Copie as infos do card do Trello e cole aqui..." 
                            value={adHocDemand.description || ""} 
                            onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar transition-colors shadow-sm" 
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                            <MessageSquare size={12}/> Legenda do Post (Aprovação Cliente)
                          </span>
                          <textarea 
                            placeholder="Escreva a legenda que ficará visível no Cockpit..."
                            value={adHocDemand.caption || ""} 
                            onChange={(e) => setAdHocDemand({...adHocDemand, caption: e.target.value})} 
                            className="w-full bg-white border border-[var(--color-atelier-terracota)]/30 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar transition-colors shadow-sm" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1">
                            <ExternalLink size={12}/> Links Externos (Download/Referência)
                          </span>
                          <div className="flex gap-2">
                            <input 
                              type="url"
                              placeholder="https://..."
                              value={newLinkInput}
                              onChange={(e) => setNewLinkInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newLinkInput.trim()) {
                                  e.preventDefault();
                                  setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), newLinkInput.trim()]});
                                  setNewLinkInput("");
                                }
                              }}
                              className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm"
                            />
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                if (newLinkInput.trim()) {
                                  setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), newLinkInput.trim()]});
                                  setNewLinkInput("");
                                }
                              }}
                              className="bg-[var(--color-atelier-grafite)] text-white px-4 rounded-xl flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm"
                            >
                              <PlusCircle size={16} />
                            </button>
                          </div>
                          {adHocDemand.external_links && adHocDemand.external_links.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {adHocDemand.external_links.map((link: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[11px] font-medium">
                                  <span className="max-w-[150px] truncate">{link}</span>
                                  <button onClick={() => setAdHocDemand({...adHocDemand, external_links: adHocDemand.external_links.filter((_: string, idx: number) => idx !== i)})} className="hover:text-red-500">
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                          <select 
                            value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Definir Escopo...</option>
                            {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                          <select 
                            value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Escolher Membro da Equipe...</option>
                            {team.map(t => {
                              const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                              return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                            })}
                          </select>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex flex-col gap-1.5 w-1/2">
                            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Deadline Trello</span>
                            <input type="datetime-local" value={adHocDemand.deadline} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                          </div>
                          <div className="flex flex-col gap-1.5 w-1/2">
                            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Est. (Min)</span>
                            <input type="number" value={adHocDemand.estTime} onChange={(e) => setAdHocDemand({...adHocDemand, estTime: parseInt(e.target.value) || 0})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                          </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors mt-2">
                          <input type="checkbox" className="hidden" checked={adHocDemand.urgency || false} onChange={(e) => setAdHocDemand({...adHocDemand, urgency: e.target.checked})} />
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${adHocDemand.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>
                            {adHocDemand.urgency && <Check size={12} strokeWidth={3}/>}
                          </div>
                          <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1">Urgência Máxima</span>
                        </label>
                      </div>

                      <button 
                        onClick={executeTrelloAdHocSubmit} 
                        disabled={isProcessing || !adHocDemand.title.trim() || !adHocDemand.assigneeId} 
                        className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Despachar
                      </button>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CRIAR PERFIL WHITE-LABEL (MANTIDO DO SEU CÓDIGO) */}
      <AnimatePresence>
        {isSubclientModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSubclientModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-blue-500/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-blue-600 flex items-center gap-2"><Briefcase size={24} /> Novo Perfil</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cliente Delegado (White-Label)</p>
                </div>
                <button onClick={() => setIsSubclientModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Nome do Cliente/Marca <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Clínica Odonto..." 
                    value={subclientForm.name} 
                    onChange={(e) => setSubclientForm({...subclientForm, name: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-blue-500 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Volume Mensal Contratado (Posts)</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 12" 
                    value={subclientForm.count || ""} 
                    onChange={(e) => setSubclientForm({...subclientForm, count: parseInt(e.target.value) || 0})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-blue-500 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
                    <Trello size={12}/> Link do Quadro Trello (Opcional)
                  </span>
                  <input 
                    type="url" 
                    placeholder="https://trello.com/b/..." 
                    value={subclientForm.trello_url} 
                    onChange={(e) => setSubclientForm({...subclientForm, trello_url: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[#0079BF] focus:bg-[#0079BF]/5 text-[#0079BF] font-medium transition-colors placeholder:text-gray-400" 
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateSubclient} 
                disabled={isCreatingSubclient || !subclientForm.name.trim()} 
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isCreatingSubclient ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Criar Perfil
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}