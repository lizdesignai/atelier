// src/app/admin/jtbd/views/CalendarWidget.tsx
import { motion } from "framer-motion";
import { 
  CalendarDays, ChevronLeft, ChevronRight, 
  Video, Camera, Clock, Calendar as CalendarIcon 
} from "lucide-react";

interface CalendarWidgetProps {
  currentWeek: Date[];
  weekOffset: number;
  setWeekOffset: (offset: number | ((prev: number) => number)) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  allUserTasks: any[];
}

export default function CalendarWidget({
  currentWeek,
  weekOffset,
  setWeekOffset,
  selectedDate,
  setSelectedDate,
  allUserTasks
}: CalendarWidgetProps) {
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Identifica o mês e ano com base no primeiro dia da semana visível
  const displayMonth = currentWeek.length > 0 ? monthNames[currentWeek[0].getMonth()] : "";
  const displayYear = currentWeek.length > 0 ? currentWeek[0].getFullYear() : "";

  // Filtra os compromissos importantes da semana visível para a lista inferior
  const weeklyCommitments = allUserTasks.filter(task => {
    const taskDate = new Date(task.deadline);
    return (
      ['reuniao', 'captacao'].includes(task.task_type) &&
      task.status !== 'completed' &&
      currentWeek.some(d => d.toDateString() === taskDate.toDateString())
    );
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div className="shrink-0 glass-panel bg-white/60 p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col gap-6 animate-[fadeInUp_0.6s_ease-out] w-full">
      
      {/* HEADER: MÊS/ANO E NAVEGAÇÃO (Ajustado para Sidebar) */}
      <div className="flex flex-col gap-4 px-2 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">
              {displayMonth} <span className="text-[var(--color-atelier-terracota)] italic">{displayYear}</span>
            </h3>
            <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-1">Planeamento</p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full bg-white/80 p-1.5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm">
          <button 
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-[var(--color-atelier-grafite)]/60"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setWeekOffset(0)}
            className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:text-[var(--color-atelier-terracota)] transition-colors border-x border-[var(--color-atelier-grafite)]/5"
          >
            Hoje
          </button>
          <button 
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-[var(--color-atelier-grafite)]/60"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* GRID DOS 7 DIAS (Ajustado para Sidebar - Menos Width e Padding) */}
      <div className="flex justify-between gap-1 overflow-x-auto custom-scrollbar pb-2">
        {currentWeek.map((date, i) => {
          const dateStr = date.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          
          const dayTasks = allUserTasks.filter(t => 
            t.status !== 'completed' && 
            new Date(t.deadline).toISOString().split('T')[0] === dateStr
          );

          const hasMeeting = dayTasks.some(t => t.task_type === 'reuniao');
          const hasCapture = dayTasks.some(t => t.task_type === 'captacao');

          return (
            <button 
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`flex-1 min-w-[40px] flex flex-col items-center justify-center py-3 rounded-[1rem] transition-all border ${
                isSelected 
                  ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent shadow-xl translate-y-[-2px]' 
                  : isToday 
                    ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-grafite)]' 
                    : 'bg-white border-transparent hover:border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:bg-gray-50'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'text-white/50' : isToday ? 'text-[var(--color-atelier-terracota)]' : ''}`}>
                {date.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0)}
              </span>
              <span className={`font-elegant text-xl leading-none ${isSelected ? 'text-white' : ''}`}>
                {date.getDate()}
              </span>
              
              {/* Indicadores Visuais Under-Number */}
              <div className="flex items-center gap-1 mt-2 h-1.5">
                {hasMeeting && (
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-300' : 'bg-purple-500'}`} title="Reunião Agendada" />
                )}
                {hasCapture && (
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-orange-300' : 'bg-[var(--color-atelier-terracota)]'}`} title="Captação Agendada" />
                )}
                {!hasMeeting && !hasCapture && dayTasks.length > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/30' : 'bg-gray-200'}`} />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* LISTA DE COMPROMISSOS DA SEMANA (Ajustado para Sidebar - Empilhado na Vertical) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-2">
          <Clock size={12} className="text-[var(--color-atelier-grafite)]/30" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40">Foco Semanal (Reuniões & Captações)</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {weeklyCommitments.length === 0 ? (
            <p className="text-[10px] text-[var(--color-atelier-grafite)]/30 italic px-2">Nenhum evento externo para esta semana.</p>
          ) : (
            weeklyCommitments.map(comp => (
              <div key={comp.id} className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-white shadow-sm hover:border-[var(--color-atelier-terracota)]/20 transition-all group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${comp.task_type === 'reuniao' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                  {comp.task_type === 'reuniao' ? <Video size={14}/> : <Camera size={14}/>}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-roboto font-bold text-[11px] text-[var(--color-atelier-grafite)] truncate group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                    {comp.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                    <span className="text-[var(--color-atelier-terracota)]">{new Date(comp.deadline).toLocaleDateString('pt-BR', {weekday: 'short'})}</span>
                    <span>•</span>
                    <span>{new Date(comp.deadline).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}