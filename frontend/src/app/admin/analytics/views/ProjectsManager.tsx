// src/app/admin/analytics/views/ProjectsManager.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  FolderKanban, Briefcase, UserCircle2, MapPin, 
  Sparkles, Loader2, PlusCircle, Trash2, Save, 
  Layers, CheckSquare, Square, Flame, Edit3, Check, X, Search,
  ArrowRight, Trello, ExternalLink, PanelRightClose, PanelRightOpen, ListTodo,
  AlertCircle, AlignLeft, MessageSquare, ChevronLeft, ChevronRight, FolderUp,
  ChevronDown, Paperclip, UploadCloud, FileText, Image as ImageIcon, Eye, Calendar, Download
} from "lucide-react";
import { ALL_SKILLS } from "../constants";
import ClientAssetsModal from "../../../../components/ClientAssetsModal";
import { formatForDateTimeLocal, parseFromDateTimeLocal } from "../../../../lib/dateUtils";

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
    external_links?: any[];
    media_assets?: any[];
    attachment_url?: string;
  };
  setAdHocDemand: (demand: any) => void;
  team: any[];
  handleAddAdHocDemand: (payload?: any) => void;
  agencySubclients: any[];
  handleDeleteSubclient: (id: string) => void;
  handleUpdateSubclientDemand: (id: string, count: number) => void;
  handleEditSubclient?: (id: string, updates: { name: string; deliverables_count: number; trello_url?: string }) => void;
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
  mobileWidgetView?: string;
  setMobileWidgetView?: (view: string) => void;
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
                    {card.labels && card.labels.length > 0 && (
                       <div className="mt-2 flex flex-wrap gap-1">
                         {card.labels.map((lbl: any) => (
                           <span key={lbl.id} className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: lbl.color || '#9ca3af' }}>
                             {lbl.name || lbl.color || 'Tag'}
                           </span>
                         ))}
                       </div>
                    )}
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
                      <div className="mt-3 flex flex-wrap gap-1 items-center">
                        {card.attachments.map((att: any, idx: number) => {
                          const preview = att.previews && att.previews.length > 0 ? att.previews[0].url : null;
                          return preview ? (
                            <img key={idx} src={preview} alt="anexo" className="w-6 h-6 object-cover rounded shadow-sm border border-gray-200" />
                          ) : null;
                        })}
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">
                           <ExternalLink size={10} /> {card.attachments.length} Anexos
                        </div>
                      </div>
                    )}
                    {card.due && (
                      <div className={`mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${card.dueComplete ? 'text-green-500' : 'text-[var(--color-atelier-terracota)]'}`}>
                        <Calendar size={10} /> {new Date(card.due).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
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
                  {expandedCard.due && (
                    <div className={`mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest ${expandedCard.dueComplete ? 'text-green-500' : 'text-[var(--color-atelier-terracota)]'}`}>
                      <Calendar size={12} /> Prazo: {new Date(expandedCard.due).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {expandedCard.labels && expandedCard.labels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {expandedCard.labels.map((lbl: any) => (
                        <span key={lbl.id} className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: lbl.color || '#9ca3af' }}>
                          {lbl.name || lbl.color || 'Tag'}
                        </span>
                      ))}
                    </div>
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
  handleEditSubclient,
  groupTasksByStage,
  isBulkMode,
  toggleTaskSelection,
  selectedTaskIds,
  setEditingTask,
  handleCompleteTask,
  isIdvService,
  showToast,
  handleStartTask,
  routingRules = [],
  mobileWidgetView = 'carteira',
  setMobileWidgetView
}: ProjectsManagerProps) {

  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [isSubclientModalOpen, setIsSubclientModalOpen] = useState(false);
  const [isCreatingSubclient, setIsCreatingSubclient] = useState(false);
  const [subclientForm, setSubclientForm] = useState({ name: "", count: 0, trello_url: "" });

  const [editingSubclient, setEditingSubclient] = useState<any | null>(null);
  const [editSubclientForm, setEditSubclientForm] = useState({ name: "", count: 1, trello_url: "" });

  // Mobile Stacked Cards State
  const [mobileExpandedClient, setMobileExpandedClient] = useState<any>(null);
  const walletCarouselRef = useRef<HTMLDivElement>(null);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);

  const handleWalletScroll = () => {
    if (walletCarouselRef.current) {
      const scrollLeft = walletCarouselRef.current.scrollLeft;
      const cardWidth = walletCarouselRef.current.firstElementChild?.clientWidth || 260;
      const newIndex = Math.round(scrollLeft / (cardWidth + 16));
      setActiveWalletIndex(newIndex);
    }
  };


  const openEditSubclientModal = (sub: any) => {
    setEditingSubclient(sub);
    setEditSubclientForm({
      name: sub.name || "",
      count: sub.deliverables_count || 1,
      trello_url: sub.trello_url || ""
    });
  };

  const submitEditSubclient = async () => {
    if (!editingSubclient || !editSubclientForm.name.trim()) {
      showToast("O nome do cliente é obrigatório.");
      return;
    }
    if (handleEditSubclient) {
      await handleEditSubclient(editingSubclient.id, {
        name: editSubclientForm.name,
        deliverables_count: editSubclientForm.count,
        trello_url: editSubclientForm.trello_url
      });
    }
    setEditingSubclient(null);
  };

  const [isTrelloModalOpen, setIsTrelloModalOpen] = useState(false);
  const [isTrelloInputOpen, setIsTrelloInputOpen] = useState(false);
  const [trelloUrlInput, setTrelloUrlInput] = useState("");
  const [isProcessingTrello, setIsProcessingTrello] = useState(false);
  const [activeTrelloEntity, setActiveTrelloEntity] = useState<any>(null);
  const [isTrelloSidebarOpen, setIsTrelloSidebarOpen] = useState(true); 
  const [trelloImportUrl, setTrelloImportUrl] = useState("");
  const [isImportingTrelloUrl, setIsImportingTrelloUrl] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkInput, setNewLinkInput] = useState("");

  const [isUploadingAdHocFiles, setIsUploadingAdHocFiles] = useState(false);
  const [openAdHocAccordion, setOpenAdHocAccordion] = useState<{ [key: string]: boolean }>({
    instructions: false,
    caption: false,
    media: true,
    links: false
  });

  const toggleAdHocAccordion = (key: string) => {
    setOpenAdHocAccordion(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAdHocMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploadingAdHocFiles(true);
    try {
      let currentAssets = [...(adHocDemand.media_assets || [])];
      let mainUrl = adHocDemand.attachment_url;

      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const bucket = isVideo ? 'community_videos' : 'community_images';
        const fileExt = file.name.split('.').pop();
        const fileName = `adhoc_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `demands/${fileName}`;

        const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
        if (error) throw error;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        currentAssets.push({ type: isVideo ? 'video' : 'image', url: data.publicUrl, name: file.name });
        if (!mainUrl) mainUrl = data.publicUrl;
      }

      setAdHocDemand({
        ...adHocDemand,
        media_assets: currentAssets,
        attachment_url: mainUrl
      });
      showToast("Mídias anexadas à demanda!");
    } catch (err) {
      showToast("Erro ao anexar arquivos.");
    } finally {
      setIsUploadingAdHocFiles(false);
      e.target.value = "";
    }
  };

  const handleDeleteAdHocAsset = (index: number) => {
    const currentAssets = adHocDemand.media_assets || [];
    const updated = currentAssets.filter((_: any, idx: number) => idx !== index);
    const mainUrl = updated.length > 0 ? updated[0].url : null;
    setAdHocDemand({
      ...adHocDemand,
      media_assets: updated,
      attachment_url: mainUrl
    });
  };

  const [walletSearch, setWalletSearch] = useState("");

  useEffect(() => {
    setActiveWalletIndex(0);
  }, [walletSearch]);
  const [walletFilter, setWalletFilter] = useState<'all' | 'agency' | 'studio'>('all');

  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);

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
    setNewLinkTitle("");
    setNewLinkInput("");
    setAdHocDemand({
      title: "", projectId: "", assigneeId: "", taskType: "", urgency: false, subclientId: undefined, description: "", caption: "", deadline: "", estTime: 0, external_links: []
    });
  };

  const handleImportTrelloCardUrl = async () => {
    if (!trelloImportUrl.trim()) return;
    const match = trelloImportUrl.match(/trello\.com\/c\/([a-zA-Z0-9]+)/);
    const cardId = match ? match[1] : trelloImportUrl.trim();
    
    if (!cardId) {
      showToast("URL do Trello inválida. Use o formato https://trello.com/c/...");
      return;
    }

    setIsImportingTrelloUrl(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
      const apiToken = process.env.NEXT_PUBLIC_TRELLO_TOKEN;
      const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`);
      if (!response.ok) throw new Error("Card não encontrado ou sem acesso.");
      
      const card = await response.json();
      
      setAdHocDemand(prev => ({
        ...prev,
        title: card.name,
        description: card.desc || "",
        external_links: [...(prev.external_links || []), { title: "Card Trello", url: card.shortUrl || trelloImportUrl }]
      }));
      setTrelloImportUrl("");
      showToast("Card importado com sucesso!");
    } catch (e) {
      showToast("Falha ao importar o Card do Trello.");
    } finally {
      setIsImportingTrelloUrl(false);
    }
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

    const isSub = isSubclientView && Boolean(displayData);
    const isAgency = selectedEntityType === 'agency';
    
    const projId = (!isSub && !isAgency) ? selectedEntityId : "";
    const agId = isSub ? displayData?.agency_id : (isAgency ? selectedEntityId : "");
    const subId = isSub ? displayData?.id : undefined;

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
    setNewLinkTitle("");
    setNewLinkInput("");
    setAdHocDemand({ ...payloadDemand, title: "", description: "", caption: "", external_links: [] });
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
    <>
      {/* ==================================================== */}
      {/* DESKTOP VIEW */}
      {/* ==================================================== */}
      <motion.div key="projects-desktop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden lg:flex flex-col lg:flex-row gap-6 h-auto md:h-full overflow-y-auto md:overflow-hidden relative">
      
      {/* SIDEBAR UNIFICADA (Filtro Horizontal no Mobile) */}
      <div className="w-[100vw] -ml-4 px-4 lg:w-[320px] lg:ml-0 lg:px-0 lg:glass-panel lg:bg-white/40 lg:p-5 lg:rounded-[2.5rem] lg:border lg:border-white lg:shadow-sm flex flex-col h-auto lg:h-full shrink-0 transition-all lg:hover:bg-white/50 z-10">
        <div className="hidden lg:block mb-4 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
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
        
        <div className="flex overflow-x-auto lg:overflow-y-auto custom-scrollbar flex-row lg:flex-col gap-3 pb-4 lg:pb-0 snap-x snap-mandatory lg:snap-none -mx-4 px-4 lg:mx-0 lg:px-0 pr-8 lg:pr-1 flex-1 lg:flex-auto min-h-0">
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
                  className={`shrink-0 snap-center lg:snap-align-none flex items-center gap-3 px-5 py-3 lg:p-5 rounded-full lg:rounded-[2rem] text-left transition-all duration-300 border ${selectedEntityId === item.id ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md lg:scale-[1.02]' : 'bg-white/80 lg:bg-transparent border-white/50 lg:border-transparent hover:bg-white hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full lg:rounded-xl flex items-center justify-center shadow-inner border border-white/50 overflow-hidden shrink-0 ${item.type === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'agency' ? (
                      <Briefcase size={14}/>
                    ) : (
                      <span className="font-elegant text-[14px] leading-none uppercase">{item.name?.charAt(0) || "U"}</span>
                    )}
                  </div>
                  <div className="flex flex-col truncate pr-2">
                    <span className={`font-roboto font-bold text-[12px] lg:text-[13px] truncate transition-colors ${selectedEntityId === item.id ? 'text-white' : 'text-[var(--color-atelier-grafite)]'}`}>{item.name}</span>
                    <span className={`hidden lg:inline-block text-[9px] uppercase font-bold tracking-widest ${selectedEntityId === item.id ? 'text-white/80' : (item.type === 'agency' ? 'text-blue-500' : 'text-[var(--color-atelier-terracota)]/80')}`}>{item.label}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* PAINEL DINÂMICO DE GESTÃO */}
      <div className={`flex-1 glass-panel bg-white/80 p-8 flex-col rounded-[2.5rem] shadow-sm overflow-hidden h-full relative ${mobileWidgetView === 'cliente' ? 'flex' : 'hidden lg:flex'}`}>
        {!selectedEntityId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40"><FolderKanban size={48} className="mb-4 text-[var(--color-atelier-terracota)]"/><p className="font-elegant text-3xl">Selecione um Cliente ou Agência</p></div>
        ) : (
          <>
            {/* Botão Adicionar Demanda - DESKTOP */}
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
              className="hidden md:flex absolute bottom-8 right-8 z-40 bg-[var(--color-atelier-grafite)] text-white w-14 h-14 rounded-full items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 group"
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
                <div className="flex flex-col items-start">
                  {isSubclientView && (
                    <button
                      onClick={() => {
                        setSelectedEntityType('agency');
                        setSelectedEntityId(displayData?.agency_id);
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1 mb-1"
                    >
                      <ChevronLeft size={12} /> Voltar para Agência
                    </button>
                  )}
                  <h2 
                    className="font-elegant text-4xl text-[var(--color-atelier-grafite)] tracking-tight cursor-pointer hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-3 group"
                    onClick={() => setIsAssetsModalOpen(true)}
                    title="Ver Cofre de Ativos"
                  >
                    {selectedEntityType === 'agency' || isSubclientView ? displayData?.name : displayData?.profiles?.nome}
                    <FolderUp size={24} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
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
                 {isSubclientView && displayData && (
                    <>
                      <button 
                        onClick={() => openEditSubclientModal(displayData)}
                        className="bg-white text-gray-700 border border-gray-200 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5"
                        title="Editar Perfil do Subcliente"
                      >
                        <Edit3 size={14} className="text-blue-600" /> Editar Subcliente
                      </button>
                      <button 
                        onClick={() => {
                          handleDeleteSubclient(displayData.id);
                          setSelectedEntityType('agency');
                          setSelectedEntityId(displayData.agency_id);
                        }}
                        className="bg-white text-red-600 border border-red-200 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5"
                        title="Excluir Subcliente"
                      >
                        <Trash2 size={14} /> Excluir Subcliente
                      </button>
                    </>
                  )}
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
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditSubclientModal(sub)} title="Editar Subcliente" className="text-gray-400 hover:text-blue-600 transition-colors p-1"><Edit3 size={16}/></button>
                                    <button onClick={() => handleDeleteSubclient(sub.id)} title="Excluir Subcliente" className="text-red-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                                 </div>
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

      <ClientAssetsModal 
        isOpen={isAssetsModalOpen}
        onClose={() => setIsAssetsModalOpen(false)}
        projectId={isSubclientView ? displayData?.agency_id : (selectedEntityType === 'project' || selectedEntityType === 'agency' ? displayData?.id : null)}
        subclientId={isSubclientView ? displayData?.id : null}
clientName={selectedEntityType === 'agency' || isSubclientView ? displayData?.name : displayData?.profiles?.nome}
      />

      {/* Botão Mobile: Adicionar Demanda (Estilo Start Now da Imagem) */}
      {selectedEntityId && (
        <div className="md:hidden mt-auto pt-6 border-t border-[var(--color-atelier-grafite)]/5 shrink-0 z-20 pb-24">
            <button 
              onClick={() => {
                const isSub = isSubclientView && displayData;
                const isAgency = selectedEntityType === 'agency';
                const projId = (!isSub && !isAgency) ? selectedEntityId : "";
                const agId = isSub ? displayData.agency_id : (isAgency ? selectedEntityId : "");
                const subId = isSub ? displayData.id : undefined;
                
                setAdHocDemand({ 
                  ...adHocDemand, projectId: projId, agencyId: agId, subclientId: subId, 
                  title: "", description: "", caption: "", assigneeId: "", taskType: "", 
                  urgency: false, deadline: "", estTime: 0 
                });
                setIsAdHocModalOpen(true);
              }}
              className="w-full bg-[var(--color-atelier-terracota)] text-white py-4 rounded-full font-bold uppercase tracking-widest text-[12px] shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <PlusCircle size={18} /> Adicionar Demanda
            </button>
        </div>
      )}

      {/* ==========================================
          MODAL GERAL: AD HOC DEMAND (Para projetos diretos sem trello)
          ========================================== */}
      <AnimatePresence>
        {isAdHocModalOpen && !isTrelloModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center px-4 md:px-8 py-8">
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
                <div className="bg-[#f0f9ff] border border-blue-100 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Trello size={48} /></div>
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-blue-600 ml-1">Automação: Puxar do Trello</span>
                  <div className="flex gap-2 relative z-10">
                    <input 
                      type="url" 
                      placeholder="Cole o link do card (https://trello.com/c/...)"
                      value={trelloImportUrl}
                      onChange={(e) => setTrelloImportUrl(e.target.value)}
                      className="flex-1 bg-white border border-blue-200 rounded-xl p-3 text-[13px] outline-none focus:border-blue-400 shadow-sm"
                    />
                    <button 
                      onClick={(e) => { e.preventDefault(); handleImportTrelloCardUrl(); }}
                      disabled={isImportingTrelloUrl}
                      className="bg-blue-600 text-white px-4 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {isImportingTrelloUrl ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Importar
                    </button>
                  </div>
                </div>

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
                  <div className="flex gap-2 flex-wrap">
                    <input 
                      type="text"
                      placeholder="Nome do Link (Ex: Figma)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="w-1/3 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm"
                    />
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={newLinkInput}
                      onChange={(e) => setNewLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLinkInput.trim() && newLinkTitle.trim()) {
                          e.preventDefault();
                          setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), { title: newLinkTitle.trim(), url: newLinkInput.trim() }]});
                          setNewLinkTitle("");
                          setNewLinkInput("");
                        }
                      }}
                      className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm"
                    />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (newLinkInput.trim() && newLinkTitle.trim()) {
                          setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), { title: newLinkTitle.trim(), url: newLinkInput.trim() }]});
                          setNewLinkTitle("");
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
                      {adHocDemand.external_links.map((link: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[11px] font-medium">
                          <span className="max-w-[150px] truncate">{typeof link === 'string' ? link : link.title}</span>
                          <button onClick={(e) => { e.preventDefault(); setAdHocDemand({...adHocDemand, external_links: adHocDemand.external_links.filter((_: any, idx: number) => idx !== i)}); }} className="hover:text-red-500">
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
                    <input type="datetime-local" value={formatForDateTimeLocal(adHocDemand.deadline)} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value ? parseFromDateTimeLocal(e.target.value) : ""})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm font-medium" />
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

                        {/* ACORDEÃO 1: INSTRUÇÕES DA EQUIPE */}
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => toggleAdHocAccordion('instructions')}
                            className="w-full p-3.5 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
                              <AlignLeft size={14}/> Instruções da Equipe
                            </span>
                            {openAdHocAccordion.instructions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <AnimatePresence>
                            {openAdHocAccordion.instructions && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden p-3.5 bg-white border-t border-gray-100">
                                <textarea 
                                  placeholder="Copie as infos do card do Trello e cole aqui..." 
                                  value={adHocDemand.description || ""} 
                                  onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                                  className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar shadow-sm" 
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* ACORDEÃO 2: LEGENDA DO POST */}
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => toggleAdHocAccordion('caption')}
                            className="w-full p-3.5 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
                              <MessageSquare size={14}/> Legenda do Post (Aprovação)
                            </span>
                            {openAdHocAccordion.caption ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <AnimatePresence>
                            {openAdHocAccordion.caption && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden p-3.5 bg-white border-t border-gray-100">
                                <textarea 
                                  placeholder="Escreva a legenda visível para o cliente..."
                                  value={adHocDemand.caption || ""} 
                                  onChange={(e) => setAdHocDemand({...adHocDemand, caption: e.target.value})} 
                                  className="w-full bg-white border border-[var(--color-atelier-terracota)]/30 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium resize-none h-20 custom-scrollbar shadow-sm" 
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* ACORDEÃO 3: MÍDIAS & ANEXOS */}
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => toggleAdHocAccordion('media')}
                            className="w-full p-3.5 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
                              <Paperclip size={14}/> Mídias & Anexos ({(adHocDemand.media_assets?.length) || (adHocDemand.attachment_url ? 1 : 0)})
                            </span>
                            {openAdHocAccordion.media ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <AnimatePresence>
                            {openAdHocAccordion.media && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden p-3.5 bg-white border-t border-gray-100 flex flex-col gap-2">
                                {((adHocDemand.media_assets && adHocDemand.media_assets.length > 0) || adHocDemand.attachment_url) ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    {(adHocDemand.media_assets || [{ type: 'image', url: adHocDemand.attachment_url }]).map((asset: any, idx: number) => (
                                      <div key={idx} className="h-16 rounded-xl border border-gray-200 overflow-hidden relative group bg-gray-100">
                                        {asset.type === 'video' ? (
                                          <video src={asset.url} className="w-full h-full object-cover" />
                                        ) : (
                                          <img src={asset.url} alt="Mídia" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                          <a href={asset.url} target="_blank" rel="noreferrer" className="p-1 bg-white text-gray-800 rounded-full hover:bg-gray-200" title="Ver">
                                            <Eye size={10} />
                                          </a>
                                          <button type="button" onClick={() => handleDeleteAdHocAsset(idx)} className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600" title="Apagar">
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">Nenhum anexo inserido ainda.</span>
                                )}

                                <label className="flex items-center justify-center gap-2 py-2 px-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-600 transition-colors text-[9px] font-bold uppercase tracking-widest cursor-pointer mt-1">
                                  <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleAdHocMediaUpload} disabled={isUploadingAdHocFiles} />
                                  {isUploadingAdHocFiles ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                                  <span>Adicionar Anexos</span>
                                </label>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* ACORDEÃO 4: LINKS EXTERNOS */}
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => toggleAdHocAccordion('links')}
                            className="w-full p-3.5 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
                              <ExternalLink size={14}/> Links Externos
                            </span>
                            {openAdHocAccordion.links ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <AnimatePresence>
                            {openAdHocAccordion.links && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden p-3.5 bg-white border-t border-gray-100 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="Nome (Ex: Figma)"
                                    value={newLinkTitle}
                                    onChange={(e) => setNewLinkTitle(e.target.value)}
                                    className="w-1/3 bg-white border border-gray-200 rounded-xl p-2.5 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)]"
                                  />
                                  <input 
                                    type="url"
                                    placeholder="https://..."
                                    value={newLinkInput}
                                    onChange={(e) => setNewLinkInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newLinkInput.trim() && newLinkTitle.trim()) {
                                        e.preventDefault();
                                        setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), { title: newLinkTitle.trim(), url: newLinkInput.trim() }]});
                                        setNewLinkTitle("");
                                        setNewLinkInput("");
                                      }
                                    }}
                                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)]"
                                  />
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (newLinkInput.trim() && newLinkTitle.trim()) {
                                        setAdHocDemand({...adHocDemand, external_links: [...(adHocDemand.external_links || []), { title: newLinkTitle.trim(), url: newLinkInput.trim() }]});
                                        setNewLinkTitle("");
                                        setNewLinkInput("");
                                      }
                                    }}
                                    className="bg-[var(--color-atelier-grafite)] text-white px-3 rounded-xl flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-colors"
                                  >
                                    <PlusCircle size={14} />
                                  </button>
                                </div>
                                {adHocDemand.external_links && adHocDemand.external_links.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {adHocDemand.external_links.map((link: any, i: number) => (
                                      <div key={i} className="flex items-center gap-1.5 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-2.5 py-1 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[10px]">
                                        <span className="max-w-[120px] truncate">{typeof link === 'string' ? link : link.title}</span>
                                        <button type="button" onClick={(e) => { e.preventDefault(); setAdHocDemand({...adHocDemand, external_links: adHocDemand.external_links?.filter((_: any, idx: number) => idx !== i)}); }} className="hover:text-red-500">
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                          <select 
                            value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Definir Escopo...</option>
                            {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                          <select 
                            value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Escolher Membro da Equipe...</option>
                            {team.map(t => {
                              const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                              return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                            })}
                          </select>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex flex-col gap-1 w-1/2">
                            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Deadline</span>
                            <input type="datetime-local" value={formatForDateTimeLocal(adHocDemand.deadline)} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value ? parseFromDateTimeLocal(e.target.value) : ""})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-2.5 text-[11px] outline-none focus:border-orange-500 font-medium" />
                          </div>
                          <div className="flex flex-col gap-1 w-1/2">
                            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Est. (Min)</span>
                            <input type="number" value={adHocDemand.estTime} onChange={(e) => setAdHocDemand({...adHocDemand, estTime: parseInt(e.target.value) || 0})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-2.5 text-[11px] outline-none focus:border-orange-500 font-medium" />
                          </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors mt-1">
                          <input type="checkbox" className="hidden" checked={adHocDemand.urgency || false} onChange={(e) => setAdHocDemand({...adHocDemand, urgency: e.target.checked})} />
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${adHocDemand.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>
                            {adHocDemand.urgency && <Check size={10} strokeWidth={3}/>}
                          </div>
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1">Urgência Máxima</span>
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

        {editingSubclient && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingSubclient(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-blue-500/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-blue-600 flex items-center gap-2"><Edit3 size={24} /> Editar Subcliente</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Atualizar Dados do Perfil White-Label</p>
                </div>
                <button onClick={() => setEditingSubclient(null)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Nome do Cliente/Marca <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Marca X" 
                    value={editSubclientForm.name} 
                    onChange={(e) => setEditSubclientForm({...editSubclientForm, name: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-blue-500 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Volume Mensal Contratado (Posts)</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 12" 
                    value={editSubclientForm.count || ""} 
                    onChange={(e) => setEditSubclientForm({...editSubclientForm, count: parseInt(e.target.value) || 0})} 
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
                    value={editSubclientForm.trello_url} 
                    onChange={(e) => setEditSubclientForm({...editSubclientForm, trello_url: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[#0079BF] focus:bg-[#0079BF]/5 text-[#0079BF] font-medium transition-colors placeholder:text-gray-400" 
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingSubclient(null)} 
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitEditSubclient} 
                  disabled={!editSubclientForm.name.trim()} 
                  className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0"
                >
                  <Save size={16}/> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>

      {/* ==================================================== */}
      {/* MOBILE VIEW (DA CARTEIRA PARA BAIXO INLINE) */}
      {/* ==================================================== */}
      <motion.div key="projects-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex lg:hidden flex-col w-full shrink-0">
         
         <div className="flex items-center justify-between w-full mb-2 px-0.5 shrink-0">
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Carteira.</h2>
            {!mobileExpandedClient && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-terracota)]" />
                <input 
                   type="text" 
                   placeholder="Buscar cliente..." 
                   value={walletSearch}
                   onChange={(e) => setWalletSearch(e.target.value)}
                   className="w-40 bg-white/80 border border-[var(--color-atelier-terracota)]/20 rounded-full py-1.5 pl-8 pr-3 text-[11px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-bold"
                />
              </div>
            )}
         </div>

         <AnimatePresence mode="wait">
           {mobileExpandedClient ? (
             /* VISUALIZAÇÃO INLINE EXPANDIDA DO CLIENTE (DA CARTEIRA PARA BAIXO) */
             <motion.div 
               key="expanded-client-inline"
               initial={{ opacity: 0, y: 15 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 15 }} 
               className="w-full bg-white/90 backdrop-blur-md rounded-[2.2rem] border border-white p-4 flex flex-col gap-3 shrink-0"
             >
                {/* Header do Cliente com Botão Fechar */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 shrink-0">
                   <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">{mobileExpandedClient.label}</span>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight truncate">{mobileExpandedClient.name || "White-Label"}</h3>
                   </div>
                   <button onClick={() => setMobileExpandedClient(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0">
                      <X size={16} />
                   </button>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                   <button onClick={() => { setSelectedEntityId(mobileExpandedClient.id); setSelectedEntityType(mobileExpandedClient.type); setIsCaptacaoModalOpen(true); }} className="bg-[var(--color-atelier-terracota)] text-white py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-transform">
                      <Calendar size={14} />
                      <span>Reunião</span>
                   </button>
                   <button onClick={() => { setSelectedEntityId(mobileExpandedClient.id); setSelectedEntityType(mobileExpandedClient.type); setAdHocDemand({ title: "", taskType: "", assigneeId: "", urgency: false, deadline: "", estTime: 0 }); setIsAdHocModalOpen(true); }} className="bg-[var(--color-atelier-grafite)] text-white py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-transform">
                      <PlusCircle size={14} />
                      <span>Nova Demanda</span>
                   </button>
                </div>

                {/* Lista de Tarefas do Cliente */}
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1 shrink-0">
                   {tasks.filter(t => t.project_id === mobileExpandedClient.id || t.subclient_id === mobileExpandedClient.id || t.projects?.id === mobileExpandedClient.id).length === 0 ? (
                      <div className="text-center py-6 flex flex-col items-center opacity-40">
                         <FolderKanban size={24} className="mb-1 text-[var(--color-atelier-terracota)]" />
                         <span className="text-[9px] uppercase font-bold tracking-widest">Sem tarefas ativas</span>
                      </div>
                   ) : (
                      tasks.filter(t => t.project_id === mobileExpandedClient.id || t.subclient_id === mobileExpandedClient.id || t.projects?.id === mobileExpandedClient.id).map(task => (
                         <div key={task.id} onClick={() => setEditingTask(task)} className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform">
                            <div className="flex justify-between items-start gap-2">
                               <span className="font-roboto font-bold text-[11px] text-[var(--color-atelier-grafite)] leading-tight">{task.title}</span>
                               <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded-lg p-0.5 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                                 <button onClick={() => setEditingTask(task)} className="w-6 h-6 flex items-center justify-center text-gray-500 rounded-md active:bg-gray-200">
                                   <Edit3 size={12} />
                                 </button>
                                 {task.status !== 'completed' && (
                                   <button onClick={() => handleCompleteTask(task.id)} className="w-6 h-6 flex items-center justify-center text-green-600 rounded-md active:bg-green-100">
                                     <Check size={12} strokeWidth={3} />
                                   </button>
                                 )}
                               </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                               <span className="text-[9px] font-bold text-[var(--color-atelier-terracota)]">{new Date(task.deadline).toLocaleDateString('pt-BR')}</span>
                               <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-gray-400">{task.profiles?.nome?.split(" ")[0] || "Livre"}</span>
                                  <div className="w-4 h-4 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                     {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={10} className="text-gray-400"/>}
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </motion.div>
           ) : (
             /* STACKED DECK CARDS (VERSÃO DINÂMICA EMPILHADA POR BAIXO) */
             <motion.div key="stacked-deck-inline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full shrink-0">
               {(() => {
                 const searchLower = walletSearch.trim().toLowerCase();
                 const filteredWallet = unifiedWallet.filter(entity => {
                    if (!searchLower) return true;
                    const name = (entity.name || "").toLowerCase();
                    const label = (entity.label || "").toLowerCase();
                    return name.includes(searchLower) || label.includes(searchLower);
                 });
                 
                 return (
                   <div className="flex flex-col items-center w-full shrink-0">
                     {/* STACK CONTAINER */}
                     <div className="relative w-full h-[240px] flex items-center justify-center my-1">
                       {filteredWallet.map((entity, idx) => {
                          const offset = idx - activeWalletIndex;
                          if (offset < 0 || offset > 2) return null;

                          const clientName = entity.name || "White-Label";
                          const avatarUrl = entity.avatar_url;
                          const clientTasksCount = tasks.filter(t => t.project_id === entity.id || t.subclient_id === entity.id || t.projects?.id === entity.id).length;
                          
                          const isTop = offset === 0;

                          return (
                            <motion.div 
                              key={entity.id} 
                              initial={false}
                              animate={{ 
                                scale: isTop ? 1 : offset === 1 ? 0.94 : 0.88,
                                y: offset * 14,
                                opacity: isTop ? 1 : offset === 1 ? 0.75 : 0.4,
                                zIndex: 30 - offset * 10
                              }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              drag={isTop ? "x" : false}
                              dragConstraints={{ left: 0, right: 0 }}
                              onDragEnd={(e, { offset, velocity }) => {
                                const swipe = offset.x * velocity.x;
                                if (swipe < -10000 && activeWalletIndex < filteredWallet.length - 1) {
                                  setActiveWalletIndex(prev => prev + 1);
                                } else if (swipe > 10000 && activeWalletIndex > 0) {
                                  setActiveWalletIndex(prev => prev - 1);
                                }
                              }}
                              onClick={() => {
                                if (isTop) {
                                  setMobileExpandedClient(entity);
                                } else {
                                  setActiveWalletIndex(idx);
                                }
                              }}
                              className={`absolute w-full h-[220px] rounded-[2.2rem] overflow-hidden border flex flex-col justify-between p-5 cursor-pointer active:scale-95 transition-transform ${isTop ? 'border-white/60' : 'border-white/30'}`}
                            >
                              {/* Background Image or Atelier Gradient */}
                              {avatarUrl ? (
                                 <img src={avatarUrl} alt={clientName} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                 <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--color-atelier-terracota)] via-[#6E3827] to-[var(--color-atelier-grafite)]" />
                              )}
                              
                              {/* Elegant Atelier Grafite Sophisticated Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-atelier-grafite)]/90 via-[var(--color-atelier-grafite)]/40 to-transparent" />
                              
                              {/* Top Badges */}
                              <div className="relative z-10 flex items-center justify-between w-full">
                                 <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                    {entity.label}
                                 </span>
                                 <span className="bg-[var(--color-atelier-terracota)] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                                    {clientTasksCount} {clientTasksCount === 1 ? 'Tarefa' : 'Tarefas'}
                                 </span>
                              </div>

                              {/* Bottom Content */}
                              <div className="relative z-10 text-white flex flex-col gap-2.5">
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/60 mb-0.5">Cliente / Marca</span>
                                  <h3 className="font-elegant text-3xl leading-tight truncate">{clientName}</h3>
                                </div>
                                
                                {isTop && (
                                  <div className="bg-white/95 text-[var(--color-atelier-grafite)] w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm">
                                    <span>Ver Detalhes</span>
                                    <FolderKanban size={14} className="text-[var(--color-atelier-terracota)]" />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                       })}

                       {filteredWallet.length === 0 && (
                          <div className="w-full text-center py-12 bg-white/40 rounded-3xl text-gray-400 text-xs font-bold uppercase tracking-widest">
                             Nenhum cliente encontrado
                          </div>
                       )}
                     </div>

                     {/* NAV CONTROLS BELOW STACKED DECK */}
                     {filteredWallet.length > 1 && (
                       <div className="flex items-center justify-center gap-3 mt-3 shrink-0 z-40">
                         <button 
                           onClick={() => setActiveWalletIndex(prev => Math.max(0, prev - 1))}
                           disabled={activeWalletIndex === 0}
                           className="w-8 h-8 rounded-full bg-white/80 border border-white flex items-center justify-center text-[var(--color-atelier-grafite)] disabled:opacity-30 active:scale-90 transition-transform"
                         >
                           <ChevronLeft size={16} />
                         </button>

                         <div className="flex items-center gap-1.5">
                           {filteredWallet.map((_, i) => (
                             <button
                               key={i}
                               onClick={() => setActiveWalletIndex(i)}
                               className={`h-1.5 rounded-full transition-all duration-300 ${i === activeWalletIndex ? 'w-5 bg-[var(--color-atelier-terracota)]' : 'w-1.5 bg-[var(--color-atelier-grafite)]/20'}`} 
                             />
                           ))}
                         </div>

                         <button 
                           onClick={() => setActiveWalletIndex(prev => Math.min(filteredWallet.length - 1, prev + 1))}
                           disabled={activeWalletIndex === filteredWallet.length - 1}
                           className="w-8 h-8 rounded-full bg-white/80 border border-white flex items-center justify-center text-[var(--color-atelier-grafite)] disabled:opacity-30 active:scale-90 transition-transform"
                         >
                           <ChevronRight size={16} />
                         </button>
                       </div>
                     )}
                   </div>
                 );
               })()}
             </motion.div>
           )}
         </AnimatePresence>
      </motion.div>

      {/* ==========================================
          MODAL GERAL: AD HOC DEMAND (GLOBAL COM Z-INDEX ELEVADO)
          ========================================== */}
      <AnimatePresence>
        {isAdHocModalOpen && !isTrelloModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center px-4 md:px-8 py-8">
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
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Lançar no Fluxo com Distribuição Inteligente</p>
                </div>
                <button onClick={closeAdHocModal} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Projeto / Cliente Alvo</span>
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3.5 text-xs text-[var(--color-atelier-grafite)] font-bold">
                    {displayData?.name || displayData?.profiles?.nome || "Cliente Selecionado"} ({isSubclientView ? 'Marca White-Label' : 'Projeto'})
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Demanda <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Criar carrossel sobre lançamento..." 
                    value={adHocDemand.title} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Tipo de Tarefa / Etapa</span>
                  <select 
                    value={adHocDemand.taskType} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium transition-colors cursor-pointer"
                  >
                    <option value="">Selecione a etapa...</option>
                    {routingRules && routingRules.length > 0 ? (
                      routingRules.map(r => (
                        <option key={r.id} value={r.task_type}>{r.task_type}</option>
                      ))
                    ) : (
                      <>
                        <option value="Copywriting">Copywriting</option>
                        <option value="Design">Design</option>
                        <option value="Revisão">Revisão</option>
                        <option value="Agendamento">Agendamento</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Atribuir a Colaborador</span>
                  <select 
                    value={adHocDemand.assigneeId} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium transition-colors cursor-pointer"
                  >
                    <option value="">Atribuição Automática (Roteador de Regras)</option>
                    {team.map(collab => (
                      <option key={collab.id} value={collab.id}>{collab.name || collab.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data e Hora do Prazo Final <span className="text-red-500">*</span></span>
                  <input 
                    type="datetime-local" 
                    value={formatForDateTimeLocal(adHocDemand.deadline)} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, deadline: parseFromDateTimeLocal(e.target.value)})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                <button 
                  onClick={closeAdHocModal} 
                  className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { handleAddAdHocDemand(); closeAdHocModal(); }} 
                  disabled={!adHocDemand.title.trim()} 
                  className="flex-1 bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[#b05c42] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={16}/> Lançar Demanda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}