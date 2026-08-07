import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  currentWeek: Date[];
  weekOffset: number;
  setWeekOffset: (offset: number | ((prev: number) => number)) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  allUserTasks: any[];
}

const getLocalDateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getTaskDotColorClass = (status: string, isSelected: boolean) => {
  switch (status) {
    case 'completed':
    case 'pending_client_approval':
      return isSelected ? 'bg-emerald-300' : 'bg-emerald-500';
    case 'review':
      return isSelected ? 'bg-amber-300' : 'bg-amber-500';
    case 'in_progress':
      return isSelected ? 'bg-sky-300' : 'bg-sky-500';
    case 'pending':
    case 'draft':
    default:
      return isSelected ? 'bg-gray-400' : 'bg-slate-300';
  }
};

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

  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Offset month based on weekOffset (used as month offset)
  const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + weekOffset, 1);
  const year = targetMonthDate.getFullYear();
  const month = targetMonthDate.getMonth();

  const displayMonth = monthNames[month];
  const displayYear = year;

  // Calculate day alignment and days in month
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="shrink-0 bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white flex flex-col gap-3.5 w-full" style={{ boxShadow: 'none' }}>
      {/* 1. HEADER: Month name + Year with left/right month navigation arrows */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-atelier-grafite)]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
            <CalendarDays size={18} />
          </div>
          <div>
            <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">
              {displayMonth} <span className="text-[var(--color-atelier-terracota)] italic">{displayYear}</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-[var(--color-atelier-grafite)]/5">
          <button 
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]"
            title="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]"
            title="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 2. WEEKDAY HEADERS */}
      <div className="grid grid-cols-7 gap-1 text-center font-roboto">
        {weekdays.map((day, idx) => (
          <div key={idx} className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/40 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* 3. MONTHLY GRID */}
      <div className="grid grid-cols-7 gap-1">
        {/* Alignment padding before 1st of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[34px]" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dateObj = new Date(year, month, dayNumber);
          const dateStr = getLocalDateString(dateObj);
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;

          // 4. TASK DOTS (Heatmap)
          const dayTasks = (allUserTasks || []).filter(task => {
            const dateToUse = task.internal_deadline || task.deadline;
            if (!dateToUse) return false;
            const taskDateStr = getLocalDateString(new Date(dateToUse));
            return taskDateStr === dateStr;
          });

          const visibleTasks = dayTasks.slice(0, 3);
          const hasMoreTasks = dayTasks.length > 3;

          return (
            <motion.button
              key={dayNumber}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`min-h-[36px] flex flex-col items-center justify-between py-1 px-1 rounded-lg transition-all relative ${
                isSelected
                  ? 'bg-[var(--color-atelier-grafite)] text-white'
                  : isToday
                    ? 'bg-white text-[var(--color-atelier-grafite)] ring-2 ring-[var(--color-atelier-terracota)]'
                    : 'bg-white/80 text-[var(--color-atelier-grafite)] hover:bg-white border border-[var(--color-atelier-grafite)]/5'
              }`}
            >
              <span className={`font-roboto text-[11px] font-semibold leading-none ${
                isToday && !isSelected ? 'text-[var(--color-atelier-terracota)] font-bold' : ''
              }`}>
                {dayNumber}
              </span>

              <div className="flex items-center justify-center gap-0.5 mt-0.5 min-h-[4px] w-full">
                {visibleTasks.map((t, idx) => (
                  <span
                    key={t.id || idx}
                    className={`w-1.2 h-1.2 rounded-full shrink-0 ${getTaskDotColorClass(t.status, isSelected)}`}
                    style={{ width: '4px', height: '4px' }}
                    title={t.title || t.status}
                  />
                ))}
                {hasMoreTasks && (
                  <span className={`text-[8px] font-bold leading-none ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    ..
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 5. BOTTOM LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 border-t border-[var(--color-atelier-grafite)]/10 font-roboto text-[9px] text-[var(--color-atelier-grafite)]/70">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Revisão</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span>Em Progresso</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
          <span>Pendente</span>
        </div>
      </div>
    </div>
  );
}