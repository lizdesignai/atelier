// src/app/admin/gestao/components/ActiveSessionsFeed.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Zap } from "lucide-react";

interface ActiveSessionsFeedProps {
  activeSessions: any[];
  team: any[];
  now: number; // Recebe o pulso global do Tick Engine
}

export default function ActiveSessionsFeed({ activeSessions, team, now }: ActiveSessionsFeedProps) {
  
  // ==========================================================================
  // MOTOR DE CRONÔMETRO (Calcula o tempo ao vivo baseado no pulso global)
  // ==========================================================================
  const formatLiveTime = (startTimeString: string) => {
    const start = new Date(startTimeString).getTime();
    const diffSeconds = Math.floor((now - start) / 1000);
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    
    // Formatação elegante para evitar "saltos" visuais na interface
    return `${h > 0 ? `${h}h ` : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="lg:col-span-7 glass-panel bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* HEADER DO COMPONENTE */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <Zap size={20} className="text-blue-500" /> Radar de Operação
        </h3>
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-blue-100 shadow-sm">
          {activeSessions.length} Em Execução
        </span>
      </div>

      {/* FEED DE SESSÕES (ÁREA ANIMADA) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2 relative">
        <AnimatePresence mode="popLayout">
          {activeSessions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center h-full text-center opacity-40 absolute inset-0"
            >
              <Coffee size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
              <p className="font-elegant text-2xl">Operação Silenciosa</p>
              <p className="font-roboto text-[11px] font-bold uppercase tracking-widest mt-2">Nenhum colaborador com tarefas ativas no momento.</p>
            </motion.div>
          ) : (
            activeSessions.map((session) => {
              const member = team.find(t => t.id === session.user_id);
              // Extração segura para evitar o erro de array vs objeto (Tipagem)
              const safeTask = Array.isArray(session.tasks) ? session.tasks[0] : session.tasks;
              const safeProjectProfile = safeTask?.projects?.profiles;
              const safeProfile = Array.isArray(safeProjectProfile) ? safeProjectProfile[0] : safeProjectProfile;
              
              const clientName = safeProfile?.nome || "Projeto Interno";
              const taskTitle = safeTask?.title || "Tarefa Sem Título";
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  key={session.id} 
                  className="bg-white p-4 rounded-[1.5rem] border border-blue-100 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-colors relative overflow-hidden shrink-0"
                >
                  {/* Barra de Status Lateral */}
                  <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-500"></div>
                  
                  {/* Avatar do Executor com Indicador Live */}
                  <div className="relative shrink-0 ml-2">
                    <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                      {member?.avatar_url ? (
                        <img src={member.avatar_url} className="w-full h-full object-cover" alt={member.nome} />
                      ) : (
                        <span className="font-elegant text-lg text-[var(--color-atelier-grafite)]">
                          {member?.nome?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping absolute"></div>
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full relative"></div>
                    </div>
                  </div>

                  {/* Informações da Tarefa */}
                  <div className="flex flex-col flex-1 truncate pr-4">
                    <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">
                      {member?.nome || "Colaborador"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] shrink-0">
                        {clientName}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] text-gray-500 truncate">
                        {taskTitle}
                      </span>
                    </div>
                  </div>

                  {/* Cronômetro Ao Vivo */}
                  <div className="bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 text-blue-700 font-roboto text-[13px] font-bold tracking-wider shrink-0 w-28 text-center shadow-inner">
                    {formatLiveTime(session.start_time)}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}