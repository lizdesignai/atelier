"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Calendar as CalendarIcon, Target, Video, Loader2, X, ChevronLeft, ChevronRight, 
  PenLine, Folder, FolderPlus, Plus, Trash2, ArrowLeft, Check, FileText, Search
} from "lucide-react";

interface NoteFolder {
  id: string;
  name: string;
}

interface NoteItem {
  id: string;
  folderId: string;
  title: string;
  content: string;
  updatedAt: string;
}

const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "geral", name: "Geral" },
  { id: "ideias", name: "Ideias & Insights" },
  { id: "reunioes", name: "Reuniões" }
];

export default function AgendaPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // ESTADOS DO BLOCO DE NOTAS AVANÇADO
  const [folders, setFolders] = useState<NoteFolder[]>(DEFAULT_FOLDERS);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notepadView, setNotepadView] = useState<"editor" | "list">("editor");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  useEffect(() => {
    fetchAgenda();
    loadNotepadData();
  }, []);

  const loadNotepadData = () => {
    // 1. Carregar Pastas
    const savedFolders = localStorage.getItem("atelier_notepad_folders_v2");
    let loadedFolders = DEFAULT_FOLDERS;
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) loadedFolders = parsed;
      } catch (e) {}
    }
    setFolders(loadedFolders);

    // 2. Carregar Notas
    const savedNotes = localStorage.getItem("atelier_notepad_notes_v2");
    let loadedNotes: NoteItem[] = [];
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed)) loadedNotes = parsed;
      } catch (e) {}
    }

    // Migração de anotações antigas (se houver e não houver notas)
    if (loadedNotes.length === 0) {
      const oldNotes = localStorage.getItem("atelier_agenda_notes");
      if (oldNotes && oldNotes.trim()) {
        loadedNotes = [{
          id: "legacy_1",
          folderId: "geral",
          title: "Minhas Anotações",
          content: oldNotes,
          updatedAt: new Date().toISOString()
        }];
      } else {
        loadedNotes = [
          {
            id: "welcome_1",
            folderId: "geral",
            title: "Primeiras Ideias",
            content: "Bem-vindo ao seu Bloco de Notas!\n\nAgora você pode criar notas organizadas por pastas específicas, registrar ideias de reuniões e lembretes do Studio Veronna.",
            updatedAt: new Date().toISOString()
          }
        ];
      }
      localStorage.setItem("atelier_notepad_notes_v2", JSON.stringify(loadedNotes));
    }

    setNotes(loadedNotes);
    if (loadedNotes.length > 0) {
      setActiveNoteId(loadedNotes[0].id);
    }
  };

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm("Cancelar este evento?")) return;
    try {
      await supabase.from('prospect_meetings').delete().eq('id', id);
      setMeetings(meetings.filter(m => m.id !== id));
    } catch (e) {}
  };

  // Funções de Gestão de Notas
  const saveNotesList = (updatedNotes: NoteItem[]) => {
    setNotes(updatedNotes);
    localStorage.setItem("atelier_notepad_notes_v2", JSON.stringify(updatedNotes));
  };

  const saveFoldersList = (updatedFolders: NoteFolder[]) => {
    setFolders(updatedFolders);
    localStorage.setItem("atelier_notepad_folders_v2", JSON.stringify(updatedFolders));
  };

  const handleCreateNote = (targetFolderId?: string) => {
    const fId = targetFolderId || (activeFolderId === "all" ? (folders[0]?.id || "geral") : activeFolderId);
    const newNote: NoteItem = {
      id: "note_" + Date.now(),
      folderId: fId,
      title: "Nova Nota",
      content: "",
      updatedAt: new Date().toISOString()
    };
    const updated = [newNote, ...notes];
    saveNotesList(updated);
    setActiveNoteId(newNote.id);
    setNotepadView("editor");
  };

  const handleUpdateActiveNote = (field: "title" | "content" | "folderId", value: string) => {
    if (!activeNoteId) return;
    const updated = notes.map(n => {
      if (n.id === activeNoteId) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    saveNotesList(updated);
  };

  const handleDeleteActiveNote = (noteIdToDelete?: string) => {
    const id = noteIdToDelete || activeNoteId;
    if (!id) return;
    if (!window.confirm("Tem certeza que deseja excluir esta nota?")) return;
    const remaining = notes.filter(n => n.id !== id);
    saveNotesList(remaining);
    if (activeNoteId === id) {
      if (remaining.length > 0) {
        setActiveNoteId(remaining[0].id);
      } else {
        setActiveNoteId(null);
        setNotepadView("list");
      }
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newF: NoteFolder = {
      id: "folder_" + Date.now(),
      name: newFolderName.trim()
    };
    const updated = [...folders, newF];
    saveFoldersList(updated);
    setActiveFolderId(newF.id);
    setNewFolderName("");
    setIsNewFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (folders.length <= 1) {
      alert("É necessário manter ao menos uma pasta.");
      return;
    }
    if (!window.confirm(`Excluir a pasta "${folderName}"? As notas serão movidas para a pasta Geral.`)) return;
    const fallbackId = folders.find(f => f.id !== folderId)?.id || "geral";
    const updatedNotes = notes.map(n => n.folderId === folderId ? { ...n, folderId: fallbackId } : n);
    saveNotesList(updatedNotes);
    const updatedFolders = folders.filter(f => f.id !== folderId);
    saveFoldersList(updatedFolders);
    if (activeFolderId === folderId) setActiveFolderId("all");
  };

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const hasEvent = (day: number) => {
    return meetings.some(m => {
      const d = new Date(m.meeting_date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const activeNote = notes.find(n => n.id === activeNoteId);
  const filteredNotes = notes.filter(n => {
    const matchesFolder = activeFolderId === "all" || n.folderId === activeFolderId;
    const matchesSearch = !noteSearch.trim() || 
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
      n.content.toLowerCase().includes(noteSearch.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="w-full min-h-screen bg-[var(--color-atelier-bg)] p-6 md:p-12 pb-32">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        
        <header>
          <h1 className="font-elegant font-bold text-4xl text-[var(--color-atelier-grafite)]">Agenda</h1>
          <p className="text-[var(--color-atelier-grafite)]/50 mt-1 uppercase tracking-widest font-bold text-xs">Visão Geral & Ferramentas</p>
        </header>

        {/* WIDGETS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* WIDGET: Calendário */}
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-8 shadow-sm border border-white flex flex-col h-[460px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{monthNames[month]}</h2>
                  <span className="text-sm font-bold text-gray-400">{year}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100"><ChevronLeft size={16} /></button>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {weekDays.map(d => (
                <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 flex-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const today = isToday(day);
                const event = hasEvent(day);
                return (
                  <div key={day} className="flex items-center justify-center relative">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                      ${today ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 cursor-pointer'}
                    `}>
                      {day}
                    </div>
                    {event && !today && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]" />}
                    {event && today && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* WIDGET: Bloco de Notas com Pastas e Múltiplas Notas */}
          <div className="bg-[#FFFAEB] rounded-[2rem] p-7 shadow-sm border border-yellow-200/60 flex flex-col h-[460px] relative overflow-hidden">
            {/* Faixa Superior Estilo Bloco Amarelo */}
            <div className="absolute top-0 left-0 w-full h-8 bg-[#fdf5d3] border-b border-yellow-200/50 flex items-center px-6 z-10">
               <div className="w-full flex justify-between items-center">
                 <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-yellow-400/50"></div>
                   <div className="w-2 h-2 rounded-full bg-yellow-400/50"></div>
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-800/60 uppercase tracking-widest">
                   <PenLine size={12} className="text-yellow-700/60" />
                   Caderno Atelier
                 </div>
               </div>
            </div>

            {/* Cabeçalho do Bloco */}
            <div className="flex items-center justify-between mt-4 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Bloco de Notas</h2>
                <span className="text-[10px] font-bold bg-yellow-200/60 text-yellow-900 px-2 py-0.5 rounded-full">
                  {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                </span>
              </div>

              {/* Botões de Ação do Cabeçalho */}
              <div className="flex items-center gap-1.5">
                {notepadView === "editor" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setNotepadView("list")}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white/70 hover:bg-white text-gray-700 border border-yellow-200 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                      title="Ver todas as notas"
                    >
                      <FileText size={12} /> Ver Notas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateNote()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                      title="Criar nova nota"
                    >
                      <Plus size={12} /> Nova
                    </button>
                  </>
                ) : (
                  <>
                    {activeNote && (
                      <button
                        type="button"
                        onClick={() => setNotepadView("editor")}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white/70 hover:bg-white text-gray-700 border border-yellow-200 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                      >
                        <ArrowLeft size={12} /> Editor
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCreateNote()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={12} /> Nova Nota
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* VISTA 1: EDITOR DA NOTA */}
            {notepadView === "editor" && activeNote ? (
              <div className="flex-1 flex flex-col min-h-0 pt-1">
                {/* Barra de Propriedades da Nota (Pasta e Ações) */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-yellow-200/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pasta:</span>
                    <select
                      value={activeNote.folderId}
                      onChange={(e) => handleUpdateActiveNote("folderId", e.target.value)}
                      className="bg-white/80 border border-yellow-200 text-gray-700 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                    >
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 font-medium">
                      Atualizado {new Date(activeNote.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteActiveNote()}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                      title="Excluir nota"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Título da Nota */}
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleUpdateActiveNote("title", e.target.value)}
                  placeholder="Título da nota..."
                  className="w-full bg-transparent font-bold text-base text-[var(--color-atelier-grafite)] placeholder-gray-400 outline-none pb-1.5 mb-1"
                />

                {/* Corpo da Nota com Linhas Pautadas */}
                <textarea
                  value={activeNote.content}
                  onChange={(e) => handleUpdateActiveNote("content", e.target.value)}
                  placeholder="Comece a escrever sua nota aqui..."
                  className="flex-1 w-full bg-transparent resize-none outline-none text-gray-700 font-medium text-sm leading-relaxed custom-scrollbar pt-1"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.04) 28px)',
                    lineHeight: '28px',
                    backgroundAttachment: 'local'
                  }}
                />
              </div>
            ) : notepadView === "editor" && !activeNote ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <FileText size={32} className="text-yellow-600/40 mb-2" />
                <p className="font-bold text-sm">Nenhuma nota selecionada</p>
                <button
                  type="button"
                  onClick={() => handleCreateNote()}
                  className="mt-3 px-4 py-2 bg-[var(--color-atelier-terracota)] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Criar Primeira Nota
                </button>
              </div>
            ) : (
              /* VISTA 2: LISTA DE PASTAS E NOTAS */
              <div className="flex-1 flex flex-col min-h-0 pt-1">
                {/* Seletor de Pastas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveFolderId("all")}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                      activeFolderId === "all"
                        ? "bg-[var(--color-atelier-terracota)] text-white shadow-xs"
                        : "bg-white/60 text-gray-600 hover:bg-white"
                    }`}
                  >
                    Todas ({notes.length})
                  </button>

                  {folders.map(f => {
                    const count = notes.filter(n => n.folderId === f.id).length;
                    return (
                      <div key={f.id} className="relative group/folder flex items-center">
                        <button
                          type="button"
                          onClick={() => setActiveFolderId(f.id)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeFolderId === f.id
                              ? "bg-[var(--color-atelier-terracota)] text-white shadow-xs"
                              : "bg-white/60 text-gray-600 hover:bg-white"
                          }`}
                        >
                          <Folder size={12} />
                          {f.name} ({count})
                        </button>
                        {folders.length > 1 && f.id !== "geral" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id, f.name); }}
                            className="hidden group-hover/folder:flex ml-0.5 text-gray-400 hover:text-red-500 p-1"
                            title="Excluir pasta"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setIsNewFolderModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-yellow-800 bg-yellow-200/50 hover:bg-yellow-200 whitespace-nowrap flex items-center gap-1 transition-all"
                    title="Criar nova pasta"
                  >
                    <FolderPlus size={12} /> + Pasta
                  </button>
                </div>

                {/* Campo de Busca Rápida */}
                <div className="relative my-2 shrink-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Pesquisar notas..."
                    className="w-full bg-white/70 border border-yellow-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-700 outline-none placeholder-gray-400"
                  />
                </div>

                {/* Lista de Notas do Filtro */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                  {filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                      <FileText size={24} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold">Nenhuma nota encontrada nesta pasta</p>
                      <button
                        type="button"
                        onClick={() => handleCreateNote(activeFolderId === "all" ? undefined : activeFolderId)}
                        className="mt-2 text-[11px] font-bold text-[var(--color-atelier-terracota)] underline"
                      >
                        + Criar uma nota agora
                      </button>
                    </div>
                  ) : (
                    filteredNotes.map(n => {
                      const folderName = folders.find(f => f.id === n.folderId)?.name || "Geral";
                      return (
                        <div
                          key={n.id}
                          onClick={() => { setActiveNoteId(n.id); setNotepadView("editor"); }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 group/card ${
                            activeNoteId === n.id
                              ? "bg-white border-[var(--color-atelier-terracota)]/40 shadow-xs"
                              : "bg-white/70 border-yellow-200/70 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate pr-2">
                              {n.title || "Sem título"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-bold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-md">
                                {folderName}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteActiveNote(n.id); }}
                                className="opacity-0 group-hover/card:opacity-100 text-gray-400 hover:text-red-500 p-0.5 transition-opacity"
                                title="Excluir nota"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">
                            {n.content || "Nota vazia..."}
                          </p>
                          <span className="text-[9px] text-gray-400 font-medium mt-1">
                            {new Date(n.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MODAL / POPUP: CRIAR NOVA PASTA */}
            {isNewFolderModalOpen && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center p-6 z-30">
                <div className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100 w-full max-w-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[var(--color-atelier-grafite)] flex items-center gap-1.5">
                      <FolderPlus size={16} className="text-[var(--color-atelier-terracota)]" />
                      Nova Pasta
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsNewFolderModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da pasta (ex: Projetos)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[var(--color-atelier-terracota)]"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsNewFolderModalOpen(false)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                      className="px-3 py-1.5 text-xs font-bold bg-[var(--color-atelier-terracota)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      Criar Pasta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LISTA DE EVENTOS */}
        <div className="mt-4">
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6 flex items-center gap-3">
            <CalendarIcon className="text-[var(--color-atelier-terracota)]" size={24} />
            Eventos Importantes
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : meetings.length === 0 ? (
            <div className="w-full p-10 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white flex flex-col items-center justify-center text-center">
              <CalendarIcon className="text-gray-300 w-12 h-12 mb-4" />
              <h2 className="text-xl font-bold font-roboto text-gray-400">Nenhum evento importante</h2>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {meetings.map((m) => {
                const isCaptacao = m.title.includes('[CAPTAÇÃO]');
                const Icon = isCaptacao ? Target : Video;
                const mDate = new Date(m.meeting_date);
                
                return (
                  <div key={m.id} className="bg-white/80 backdrop-blur-md rounded-[1.5rem] p-5 shadow-sm border border-white flex items-center gap-6 group relative">
                    <button onClick={() => deleteEvent(m.id)} className="absolute top-1/2 -translate-y-1/2 right-6 w-8 h-8 rounded-full bg-gray-50 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all">
                      <X size={14} />
                    </button>
                    
                    <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-100 pr-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{monthNames[mDate.getMonth()].slice(0,3)}</span>
                      <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{mDate.getDate().toString().padStart(2, '0')}</span>
                    </div>

                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${isCaptacao ? 'bg-orange-100 text-orange-600' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-12">
                      <h3 className="font-bold text-lg font-roboto text-[var(--color-atelier-grafite)] truncate">{m.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-md">{mDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {m.notes && <span className="truncate max-w-md">{m.notes.split('\n')[0]}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
