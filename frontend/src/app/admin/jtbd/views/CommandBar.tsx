// src/app/admin/jtbd/views/CommandBar.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, Flame, ShieldAlert } from "lucide-react";

interface CommandBarProps {
  isAdminOrManager: boolean;
  team: any[];
  viewingUserId: string;
  setViewingUserId: (id: string) => void;
  setIsAdHocModalOpen: (isOpen: boolean) => void;
}

export default function CommandBar({
  isAdminOrManager,
  team,
  viewingUserId,
  setViewingUserId,
  setIsAdHocModalOpen
}: CommandBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Se não for Admin ou Gestor, este componente não existe no DOM.
  if (!isAdminOrManager) return null;

  return (
    <div className="flex flex-col items-end w-full mb-2 relative z-50">
      {/* Botão Discreto de Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-roboto text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${
          isExpanded 
            ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' 
            : 'bg-white/60 text-[var(--color-atelier-grafite)]/50 hover:bg-white border-[var(--color-atelier-grafite)]/10 hover:text-[var(--color-atelier-terracota)]'
        }`}
      >
        {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
        {isExpanded ? "Ocultar Comando" : "Visão de Comando"}
      </button>

      {/* Painel Expansível */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full mt-3 overflow-hidden"
          >
            <div className="glass-panel p-3 rounded-2xl bg-white/80 border border-[var(--color-atelier-terracota)]/20 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-2 px-3 shrink-0 md:border-r border-[var(--color-atelier-grafite)]/10 md:mr-2 w-full md:w-auto">
                <ShieldAlert size={16} className="text-[var(--color-atelier-terracota)]" />
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                  Supervisão Ativa
                </span>
              </div>

              {/* Lista de Colaboradores (Scroll Horizontal) */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-1 w-full md:w-auto pr-2 pb-1 md:pb-0">
                {team.map(member => (
                  <button 
                    key={member.id} 
                    onClick={() => setViewingUserId(member.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border shrink-0 ${
                      viewingUserId === member.id 
                        ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent shadow-md' 
                        : 'bg-white text-[var(--color-atelier-grafite)]/60 hover:bg-gray-50 border-[var(--color-atelier-grafite)]/10'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--color-atelier-creme)] overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--color-atelier-terracota)] border border-white">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover"/>
                      ) : (
                        member.nome.charAt(0)
                      )}
                    </div>
                    <span className="font-roboto text-[11px] font-bold">
                      {member.nome.split(" ")[0]}
                    </span>
                    {viewingUserId === member.id && <CheckCircle2 size={12} className="ml-1 opacity-50"/>}
                  </button>
                ))}
              </div>

              {/* Botão de Disparar Granada */}
              <button 
                onClick={() => setIsAdHocModalOpen(true)} 
                className="w-full md:w-auto shrink-0 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-[0_4px_10px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Flame size={14} className="animate-pulse" /> 
                Disparar Granada
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}