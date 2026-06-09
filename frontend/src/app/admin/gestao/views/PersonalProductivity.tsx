// src/app/admin/gestao/views/PersonalProductivity.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { Target, Activity, CheckCircle2, Clock, Zap, Loader2 } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

interface PersonalProductivityProps {
  currentUser: any;
}

export default function PersonalProductivity({ currentUser }: PersonalProductivityProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const fetchPersonalData = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();

      const { data: mySessions } = await supabase
        .from('work_sessions')
        .select('*, tasks(title, projects(profiles(nome)))')
        .eq('user_id', currentUser.id)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('start_time', { ascending: false });

      if (mySessions) {
        setSessions(mySessions);
        const total = mySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        setDailyMinutes(total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const SLA_MINUTES = 360; // 6 horas
  const percentage = Math.min((dailyMinutes / SLA_MINUTES) * 100, 100);
  const strokeDashoffset = 283 - (283 * percentage) / 100; // Circunferência do SVG = 283

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row h-full gap-6">
      
      {/* O ANEL DE FOCO (ESQUERDA) */}
      <div className="w-full lg:w-1/3 glass-panel bg-white/80 p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center text-center border border-white shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-md mb-4">
           {currentUser.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-elegant text-2xl">{currentUser.nome.charAt(0)}</div>}
        </div>
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1">Olá, {currentUser.nome.split(" ")[0]}.</h2>
        <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-10">O Seu Espelho de Produtividade Diária</p>

        {/* Gráfico SVG Customizado */}
        <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <motion.circle 
              cx="50" cy="50" r="45" fill="none" 
              stroke="var(--color-atelier-terracota)" 
              strokeWidth="8" strokeLinecap="round"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ strokeDasharray: 283 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{(dailyMinutes / 60).toFixed(1)}<span className="text-lg">h</span></span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">META: 6.0h</span>
          </div>
        </div>

        {percentage >= 100 ? (
          <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-green-200">
            <CheckCircle2 size={14} /> Meta Diária Atingida
          </div>
        ) : (
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-blue-200">
            <Activity size={14} /> Foco Ativo Recomendado
          </div>
        )}
      </div>

      {/* HISTÓRICO DE SESSÕES (DIREITA) */}
      <div className="flex-1 glass-panel bg-white/70 p-8 rounded-[2.5rem] shadow-sm flex flex-col h-full border border-white">
        <div className="shrink-0 mb-6 border-b border-gray-100 pb-4">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Clock size={20} className="text-[var(--color-atelier-terracota)]"/> Registo de Ações Hoje</h3>
          <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Transparência nas sessões de trabalho logadas</p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center opacity-40 mt-10">
              <Zap size={40} className="text-gray-400 mb-2" />
              <p className="font-elegant text-xl">Nenhuma sessão hoje</p>
              <p className="text-[10px] uppercase tracking-widest font-bold mt-1 text-gray-500">Inicie uma tarefa na Mesa de Trabalho para gravar.</p>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] text-[var(--color-atelier-grafite)]">{s.tasks?.title || "Tarefa Excluída"}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{s.tasks?.projects?.profiles?.nome || "Cliente Desconhecido"}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-gray-400">{new Date(s.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-grafite)]/10 font-elegant text-lg leading-none min-w-[60px] text-center">
                    {s.duration_minutes ? `${s.duration_minutes}m` : 'Ao Vivo'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </motion.div>
  );
}