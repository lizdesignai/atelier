// src/app/admin/gerenciamento/views/GlobalCalendar.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { NotificationEngine } from "../../../../lib/NotificationEngine";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, BarChart3, 
  Activity, Loader2, CheckCircle2, Clock, Plus, UploadCloud, 
  FileText, X, Send, PlayCircle, MessageSquare, Camera, CheckSquare, AlertTriangle
} from "lucide-react";

interface GlobalCalendarProps {
  activeProjectId: string;
  activeSubclientId?: string | null;
  currentProject: any;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function GlobalCalendar({ activeProjectId, activeSubclientId, currentProject }: GlobalCalendarProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // 🟢 ESTADOS UNIFICADOS (Estratégia + Execução)
  const [plannings, setPlannings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Controle do Mês Atual no Calendário
  const [currentDate, setCurrentDate] = useState(new Date());

  // 🟢 ESTADOS DO MODAL DE UPLOAD DE PDF
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    hook: "",
    file: null as File | null
  });

  // 🟢 ESTADO DA SIDEBAR DE DETALHES DO DIA (Substitui o antigo Modal)
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    day: number;
    fullDate: Date;
    tasks: any[];
    plannings: any[];
  } | null>(null);

  useEffect(() => {
    fetchMonthData();
  }, [activeProjectId, activeSubclientId, currentDate]);

  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      if (!activeProjectId) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString();
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      let planQuery = supabase.from('content_planning').select('*').eq('project_id', activeProjectId).gte('created_at', firstDay).lte('created_at', lastDay);
      if (activeSubclientId) planQuery = planQuery.eq('subclient_id', activeSubclientId);
      else planQuery = planQuery.is('subclient_id', null);

      let taskQuery = supabase.from('tasks').select('*').eq('project_id', activeProjectId).gte('deadline', firstDay).lte('deadline', lastDay).order('deadline', { ascending: true });
      if (activeSubclientId) taskQuery = taskQuery.eq('subclient_id', activeSubclientId);
      else taskQuery = taskQuery.is('subclient_id', null);

      const [ { data: planningsData }, { data: tasksData } ] = await Promise.all([
        planQuery,
        taskQuery
      ]);

      setPlannings(planningsData || []);
      setTasks(tasksData || []);

    } catch (error) {
      console.error("Erro ao carregar dados do calendário:", error);
      showToast("Erro ao sincronizar calendário com o Analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadPDF = async () => {
    if (!uploadForm.file || !uploadForm.hook) {
      showToast("Preencha o título e selecione um arquivo PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `planejamento_${activeProjectId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, uploadForm.file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('vault_assets').getPublicUrl(fileName);
      const pdfUrl = publicUrlData.publicUrl;

      const payload = {
        project_id: activeProjectId,
        subclient_id: activeSubclientId || null,
        client_id: currentProject?.client_id,
        hook: uploadForm.hook,
        planning_file_url: pdfUrl,
        status: 'awaiting_approval',
        is_avulso: false,
        created_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase.from('content_planning').insert(payload);
      if (dbError) throw dbError;

      await NotificationEngine.notifyUser(
        currentProject.client_id,
        "📅 Novo Planejamento Mensal (PDF)",
        `O planejamento estratégico "${uploadForm.hook}" está disponível no seu painel para aprovação.`,
        "action",
        "/cockpit"
      );

      showToast("✨ Planejamento em PDF enviado com sucesso ao cliente!");
      setIsUploadModalOpen(false);
      setUploadForm({ hook: "", file: null });
      fetchMonthData();

    } catch (error: any) {
      console.error(error);
      showToast("Erro ao enviar o PDF de planejamento.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadForm({ ...uploadForm, file });
    } else if (file) {
      showToast("Por favor, selecione apenas arquivos PDF.");
      e.target.value = '';
    }
  };

  // ==========================================
  // MATEMÁTICA DO CALENDÁRIO
  // ==========================================
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  
  const approvedPlannings = plannings.filter(p => ['approved', 'completed'].includes(p.status)).length;
  const pendingPlannings = plannings.filter(p => ['pending', 'awaiting_approval'].includes(p.status)).length;

  if (isLoading && tasks.length === 0 && plannings.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center glass-panel bg-white/40 rounded-2xl border border-white">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 animate-[fadeInUp_0.5s_ease-out] pb-6 relative overflow-hidden">
      
      {/* 🟢 BOTÃO FLUTUANTE (FAB) DE UPLOAD DE PLANEJAMENTO */}
      <button 
        onClick={() => setIsUploadModalOpen(true)}
        className="absolute bottom-6 right-6 z-40 bg-[var(--color-atelier-grafite)] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 group"
        title="Enviar Novo Planejamento PDF"
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* WIDGETS DE ANALYTICS (TOPO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-6 rounded-[1.5rem] border border-white/10 shadow-lg flex flex-col justify-center relative overflow-hidden group hover:shadow-xl transition-shadow">
          <div className="absolute right-[-10%] top-[-20%] w-[150px] h-[150px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-[var(--color-atelier-terracota)]/30 transition-colors"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <BarChart3 size={18} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-white/60">Volume de Tarefas</span>
          </div>
          <span className="font-elegant text-4xl text-white relative z-10">{totalTasks} <span className="text-sm font-roboto text-white/50 uppercase tracking-widest">Neste mês</span></span>
        </div>

        <div className="glass-panel bg-white/40 p-6 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-center hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Tarefas Concluídas</span>
          </div>
          <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{completedTasks}</span>
        </div>

        <div className="glass-panel bg-white/40 p-6 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-center hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-orange-500" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Tarefas Pendentes</span>
          </div>
          <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{pendingTasks}</span>
        </div>

        <div className="glass-panel bg-white/40 p-6 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-center hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={18} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Planejamentos (PDFs)</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{approvedPlannings}</span>
            <span className="font-roboto text-[11px] font-bold text-green-600 mb-1">Aprovados</span>
            <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]/30 leading-none">/ {pendingPlannings} pendentes</span>
          </div>
        </div>
      </div>

      {/* 🟢 CORPO PRINCIPAL: CALENDÁRIO + SIDEBAR DE ACOMPANHAMENTO LADO A LADO */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* ============================== */}
        {/* CALENDÁRIO MINIMALISTA E ELEGANTE */}
        {/* ============================== */}
        <div className="flex-1 glass-panel bg-white/50 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col min-h-0 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 gap-4 md:gap-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
                 <CalendarIcon size={20} />
              </div>
              <div>
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Calendário Operacional</h3>
                <p className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1.5">Mapeamento de Tarefas e Planejamentos</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 bg-white/80 p-2 rounded-[1.2rem] border border-white shadow-sm shrink-0">
              <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] hover:text-white rounded-lg transition-colors text-[var(--color-atelier-grafite)]"><ChevronLeft size={16} strokeWidth={2.5}/></button>
              <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] uppercase tracking-widest min-w-[120px] text-center select-none">
                {monthNames[month]} {year}
              </span>
              <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] hover:text-white rounded-lg transition-colors text-[var(--color-atelier-grafite)]"><ChevronRight size={16} strokeWidth={2.5}/></button>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
              {dayNames.map(day => (
                <div key={day} className="text-center font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 pb-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-[minmax(0,1fr)] min-h-0">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/20 rounded-2xl border border-transparent"></div>
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const fullDate = new Date(year, month, day);
                
                const dayPlannings = plannings.filter(p => {
                  if (!p.created_at) return false;
                  const postDate = new Date(p.created_at);
                  return postDate.getDate() === day && postDate.getMonth() === month && postDate.getFullYear() === year;
                });

                const dayTasks = tasks.filter(t => {
                  if (!t.deadline) return false;
                  const taskDate = new Date(t.deadline);
                  return taskDate.getDate() === day && taskDate.getMonth() === month && taskDate.getFullYear() === year;
                });

                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                const isSelected = selectedDayDetails?.day === day;
                const hasContent = dayPlannings.length > 0 || dayTasks.length > 0;
                
                // IDENTIFICAR SE É DIA DE CAPTAÇÃO
                const hasCaptacao = dayTasks.some(t => t.task_type === 'captacao' || t.title?.toLowerCase().includes('captação') || t.stage === 'Logística Externa');

                return (
                  <div 
                    key={day} 
                    onClick={() => hasContent ? setSelectedDayDetails({ day, fullDate, tasks: dayTasks, plannings: dayPlannings }) : null}
                    className={`rounded-2xl border p-2 flex flex-col transition-all relative overflow-hidden group
                      ${isToday 
                        ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/40 shadow-sm' 
                        : isSelected
                          ? 'bg-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)] shadow-lg scale-105 z-10'
                          : 'bg-white/80 border-white shadow-sm'
                      }
                      ${hasContent ? 'cursor-pointer hover:border-[var(--color-atelier-terracota)]/40 hover:shadow-md' : 'opacity-60'}
                    `}
                  >
                    {/* Imagem de Fundo para Dia de Captação */}
                    {hasCaptacao && (
                       <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                         <Camera size={40} className={isSelected ? 'text-white' : 'text-[var(--color-atelier-grafite)]'} />
                       </div>
                    )}

                    <span className={`font-roboto text-[13px] font-bold z-10 mb-auto transition-colors text-center mt-1 
                      ${isSelected ? 'text-white' : isToday ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/70'}`}
                    >
                      {day}
                    </span>
                    
                    {/* DOTS MINIMALISTAS EM VEZ DE TEXTO */}
                    <div className="flex flex-wrap justify-center gap-1 z-10 mt-2">
                      {dayPlannings.map(plan => (
                        <div key={`dot-plan-${plan.id}`} className={`w-2 h-2 rounded-full ${plan.status === 'approved' ? 'bg-purple-500' : plan.status === 'needs_revision' ? 'bg-red-500' : 'bg-orange-500'}`} title="Planejamento (PDF)" />
                      ))}
                      {dayTasks.map(task => {
                        let dotColor = "bg-gray-400";
                        if (task.status === 'completed') dotColor = "bg-green-500";
                        else if (task.status === 'in_progress') dotColor = "bg-blue-500";
                        else if (task.task_type === 'captacao' || task.title?.toLowerCase().includes('captação')) dotColor = "bg-[var(--color-atelier-terracota)]";
                        return <div key={`dot-task-${task.id}`} className={`w-2 h-2 rounded-full ${dotColor}`} title={task.title} />
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================== */}
        {/* WIDGET DE ACOMPANHAMENTO (DIREITA) COM VISUALIZAÇÃO DE FEEDBACK DE PDF */}
        {/* ============================== */}
        <div className="w-full lg:w-[400px] shrink-0 glass-panel bg-white/60 p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full min-h-0">
           {selectedDayDetails ? (
             <>
               <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex justify-between items-start">
                 <div>
                   <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                     Dia {selectedDayDetails.day}
                   </h3>
                   <p className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">
                     {selectedDayDetails.fullDate.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', year: 'numeric' })}
                   </p>
                 </div>
                 <button onClick={() => setSelectedDayDetails(null)} className="text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)]"><X size={18}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                 
                 {selectedDayDetails.plannings.length > 0 && (
                   <div className="flex flex-col gap-3">
                     <h4 className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 flex items-center gap-1.5"><FileText size={12}/> Planejamento e Estratégia</h4>
                     {selectedDayDetails.plannings.map(plan => (
                       <div key={plan.id} className={`p-4 rounded-[1.5rem] border flex flex-col gap-3 shadow-sm bg-white
                         ${plan.status === 'approved' ? 'border-green-200' : plan.status === 'needs_revision' ? 'border-red-200' : 'border-orange-200'}
                       `}>
                         <div className="flex justify-between items-start">
                           <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)]">{plan.hook || "Sem Título"}</span>
                           {plan.status === 'approved' ? <CheckCircle2 size={16} className="text-green-500 shrink-0"/> : plan.status === 'needs_revision' ? <AlertTriangle size={16} className="text-red-500 shrink-0"/> : <Clock size={16} className="text-orange-500 shrink-0"/>}
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Status do Cliente</span>
                            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg inline-block w-fit
                              ${plan.status === 'approved' ? 'bg-green-50 text-green-700' : plan.status === 'needs_revision' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}
                            `}>
                              {plan.status === 'approved' ? 'Aprovado' : plan.status === 'needs_revision' ? 'Ajuste Solicitado' : 'Aguardando Avaliação'}
                            </span>
                         </div>
                         {/* 🟢 EXIBIÇÃO DE FEEDBACK DO PDF (O CLIENTE PEDIU AJUSTE NO COCKPIT) */}
                         {plan.status === 'needs_revision' && plan.feedback && (
                           <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 mt-1">
                              <span className="text-[9px] uppercase tracking-widest font-bold text-red-500 mb-1 flex items-center gap-1"><MessageSquare size={10}/> Feedback / Ajuste</span>
                              <p className="text-[11px] text-red-900/80 font-medium italic">"{plan.feedback}"</p>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}

                 {selectedDayDetails.tasks.length > 0 && (
                   <div className="flex flex-col gap-3">
                     <h4 className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 flex items-center gap-1.5"><CheckSquare size={12}/> Fila de Produção</h4>
                     {selectedDayDetails.tasks.map(task => (
                       <div key={task.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-2">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 
                             ${task.status === 'completed' ? 'bg-green-50 text-green-600' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}
                           `}>
                             {task.status === 'completed' ? <CheckCircle2 size={14}/> : task.status === 'in_progress' ? <PlayCircle size={14}/> : <Clock size={14}/>}
                           </div>
                           <div className="flex flex-col truncate">
                             <span className={`text-[12px] font-bold truncate transition-colors ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
                               {task.title}
                             </span>
                             <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">{task.stage || "Produção"}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <CalendarIcon size={48} className="mb-4 text-[var(--color-atelier-grafite)]"/>
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Detalhes do Dia</span>
                <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] mt-2">Clique num dia com ponto colorido para ver o status dos Planejamentos e Tarefas.</span>
             </div>
           )}
        </div>

      </div>

      {/* ==========================================
          MODAL DE ENVIO DE PLANEJAMENTO PDF
          ========================================== */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><FileText size={24} className="text-[var(--color-atelier-terracota)]"/> Enviar Planejamento</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload do PDF para o cliente aprovar</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Referência / Mês (Título) <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Planejamento de Agosto..." 
                    value={uploadForm.hook} 
                    onChange={(e) => setUploadForm({...uploadForm, hook: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Arquivo PDF <span className="text-red-500">*</span></span>
                  
                  <label className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                    ${uploadForm.file ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-[var(--color-atelier-terracota)]/50'}
                  `}>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading}/>
                    {uploadForm.file ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 size={24}/></div>
                        <span className="font-bold text-[12px] text-green-700 truncate max-w-[200px]">{uploadForm.file.name}</span>
                        <span className="text-[9px] uppercase font-bold text-green-600/50 tracking-widest">Pronto a enviar</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={32} className="text-gray-300" />
                        <span className="font-bold uppercase tracking-widest text-[10px] text-[var(--color-atelier-grafite)] text-center px-4">Clique para selecionar o PDF do Planejamento</span>
                      </>
                    )}
                  </label>
                </div>

              </div>

              <button 
                onClick={handleUploadPDF} 
                disabled={isUploading || !uploadForm.hook.trim() || !uploadForm.file} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Despachar para o Cliente
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}