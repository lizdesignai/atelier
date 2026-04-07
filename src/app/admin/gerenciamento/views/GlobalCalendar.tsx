// src/app/admin/gerenciamento/views/GlobalCalendar.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BarChart3, Activity, Loader2, CheckCircle2, Clock } from "lucide-react";

interface GlobalCalendarProps {
  activeProjectId: string;
  currentProject: any;
}

export default function GlobalCalendar({ activeProjectId, currentProject }: GlobalCalendarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [plannings, setPlannings] = useState<any[]>([]);
  
  // Controle do Mês Atual no Calendário
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchMonthData();
  }, [activeProjectId, currentDate]);

  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      if (!activeProjectId) return;

      // Definimos o primeiro e o último dia do mês atual para filtrar no banco de dados
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString();
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('content_planning')
        .select('*')
        .eq('project_id', activeProjectId)
        .gte('publish_date', firstDay)
        .lte('publish_date', lastDay)
        .order('publish_date', { ascending: true });

      if (error) throw error;
      setPlannings(data || []);

    } catch (error) {
      console.error("Erro ao carregar dados do calendário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // MATEMÁTICA DO CALENDÁRIO
  // ==========================================
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Quantos dias tem o mês atual?
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Qual dia da semana o mês começa? (0 = Domingo, 6 = Sábado)
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ==========================================
  // CÁLCULO DE ANALYTICS
  // ==========================================
  const totalPosts = plannings.length;
  const approvedPosts = plannings.filter(p => ['approved', 'completed'].includes(p.status)).length;
  const pendingPosts = plannings.filter(p => ['pending', 'awaiting_approval', 'rejected'].includes(p.status)).length;
  const approvalRate = totalPosts === 0 ? 0 : Math.round((approvedPosts / totalPosts) * 100);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center glass-panel bg-white/50 rounded-2xl border border-white">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 animate-[fadeInUp_0.5s_ease-out] pb-6">
      
      {/* WIDGETS DE ANALYTICS (TOPO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        
        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-[-10%] top-[-20%] w-[150px] h-[150px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[40px] pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <BarChart3 size={18} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-white/60">Volume do Mês</span>
          </div>
          <span className="font-elegant text-4xl text-white relative z-10">{totalPosts} <span className="text-sm font-roboto text-white/50 uppercase tracking-widest">Posts</span></span>
        </div>

        <div className="glass-panel bg-white/80 p-6 rounded-2xl border border-white shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Aprovados / Feitos</span>
          </div>
          <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{approvedPosts}</span>
        </div>

        <div className="glass-panel bg-white/80 p-6 rounded-2xl border border-white shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-orange-500" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Pendentes</span>
          </div>
          <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{pendingPosts}</span>
        </div>

        <div className="glass-panel bg-white/80 p-6 rounded-2xl border border-white shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={18} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Taxa de Aprovação</span>
          </div>
          <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{approvalRate}%</span>
        </div>

      </div>

      {/* CALENDÁRIO GLOBAL (CORPO PRINCIPAL) */}
      <div className="flex-1 glass-panel bg-white/90 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col min-h-[500px]">
        
        {/* Cabeçalho do Calendário */}
        <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)]">
               <CalendarIcon size={18} />
            </div>
            <div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Mapeamento Editorial</h3>
              <p className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">Grade Mensal de Publicações</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"><ChevronLeft size={16} className="text-[var(--color-atelier-grafite)]"/></button>
            <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] uppercase tracking-widest min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"><ChevronRight size={16} className="text-[var(--color-atelier-grafite)]"/></button>
          </div>
        </div>

        {/* Grade do Calendário */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Dias da Semana (Dom, Seg...) */}
          <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
            {dayNames.map(day => (
              <div key={day} className="text-center font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 pb-2">
                {day}
              </div>
            ))}
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50/50 rounded-xl border border-transparent"></div>
            ))}
            
            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              // Filtramos os posts que caem exatamente neste dia
              const dayPlannings = plannings.filter(p => {
                if (!p.publish_date) return false;
                const postDate = new Date(p.publish_date);
                return postDate.getDate() === day && postDate.getMonth() === month && postDate.getFullYear() === year;
              });

              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div key={day} className={`rounded-xl border p-2 flex flex-col overflow-hidden transition-colors hover:border-[var(--color-atelier-terracota)]/30 
                  ${isToday ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/40' : 'bg-white border-[var(--color-atelier-grafite)]/10 shadow-sm'}
                `}>
                  <span className={`font-roboto text-[11px] font-bold mb-1 ${isToday ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                    {day}
                  </span>
                  
                  <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                    {dayPlannings.map(plan => (
                      <div 
                        key={plan.id} 
                        className={`text-[9px] font-roboto font-bold leading-tight p-1.5 rounded-lg truncate border
                          ${plan.status === 'approved' || plan.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}
                        `}
                        title={plan.hook}
                      >
                        {plan.is_avulso && <span className="font-black mr-1 text-black">[A]</span>}
                        {plan.hook || "Sem Gancho"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}