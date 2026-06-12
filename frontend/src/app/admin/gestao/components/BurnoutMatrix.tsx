// src/app/admin/gestao/components/BurnoutMatrix.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, AlertTriangle, ShieldAlert, CheckCircle2, Coffee } from "lucide-react";

interface BurnoutMatrixProps {
  teamStats: any[];
}

export default function BurnoutMatrix({ teamStats }: BurnoutMatrixProps) {
  const [hoveredMember, setHoveredMember] = useState<any | null>(null);

  // Limites do Gráfico para cálculo de proporção (Plotting)
  const MAX_SLA_X = 120; // Eixo X vai de 0% a 120% do SLA
  const MAX_REWORK_Y = 50; // Eixo Y vai de 0% a 50% de Refação

  // Função para mapear o valor para a percentagem do container
  const getXPos = (sla: number) => Math.min((sla / MAX_SLA_X) * 100, 100);
  const getYPos = (rework: number) => Math.min((rework / MAX_REWORK_Y) * 100, 100);

  return (
    <div className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-[400px] relative overflow-hidden">
      
      {/* HEADER DA MATRIZ */}
      <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <ShieldAlert size={20} className="text-orange-500" /> Matriz de Burnout & Qualidade
          </h3>
          <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
            SLA (Esforço) vs. Taxa de Refação (Fadiga)
          </p>
        </div>
        <div className="group relative cursor-pointer text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors">
          <Info size={18} />
          {/* Tooltip de Explicação */}
          <div className="absolute right-0 top-6 w-64 bg-[var(--color-atelier-grafite)] text-white p-4 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <p className="font-roboto text-[11px] leading-relaxed">
              O quadrante superior direito indica <strong>Risco de Burnout</strong> (Muitas horas e muitos erros). O quadrante inferior direito é a <strong>Zona Ideal</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ÁREA DO GRÁFICO (SCATTER PLOT CUSTOMIZADO) */}
      <div className="flex-1 relative border-l-2 border-b-2 border-[var(--color-atelier-grafite)]/20 ml-6 mb-6">
        
        {/* Marcadores dos Eixos */}
        <span className="absolute -left-8 bottom-1/2 translate-y-1/2 -rotate-90 font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400 origin-center whitespace-nowrap">
          Taxa de Refação (Y)
        </span>
        <span className="absolute left-1/2 -bottom-6 -translate-x-1/2 font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
          Aderência ao SLA (X)
        </span>

        {/* Linhas de Divisão dos Quadrantes (A Cruz Central) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--color-atelier-grafite)]/10 border-r border-dashed"></div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--color-atelier-grafite)]/10 border-b border-dashed"></div>

        {/* Labels de Fundo (Marca d'água dos Quadrantes) */}
        <div className="absolute top-4 right-4 flex flex-col items-end opacity-20 pointer-events-none">
          <AlertTriangle size={24} className="text-red-500 mb-1" />
          <span className="font-elegant text-xl text-red-600">Risco Alto</span>
        </div>
        <div className="absolute bottom-4 right-4 flex flex-col items-end opacity-20 pointer-events-none">
          <CheckCircle2 size={24} className="text-green-500 mb-1" />
          <span className="font-elegant text-xl text-green-600">Alta Performance</span>
        </div>
        <div className="absolute bottom-4 left-4 flex flex-col items-start opacity-20 pointer-events-none">
          <Coffee size={24} className="text-orange-500 mb-1" />
          <span className="font-elegant text-xl text-orange-600">Capacidade Ociosa</span>
        </div>

        {/* OS PONTOS DE DADOS (Colaboradores) */}
        {teamStats.map((member, index) => {
          const xPos = getXPos(member.slaPercentage);
          const yPos = getYPos(member.reworkRate);
          const isHovered = hoveredMember?.id === member.id;

          // Definir a cor baseada no quadrante
          let dotColor = "bg-[var(--color-atelier-grafite)]";
          let ringColor = "ring-gray-200";
          if (xPos >= 50 && yPos >= 50) { dotColor = "bg-red-500"; ringColor = "ring-red-200"; } // Burnout
          else if (xPos >= 50 && yPos < 50) { dotColor = "bg-green-500"; ringColor = "ring-green-200"; } // Estrela
          else if (xPos < 50 && yPos < 50) { dotColor = "bg-orange-400"; ringColor = "ring-orange-200"; } // Ocioso

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0, x: "-50%", y: "50%" }}
              animate={{ opacity: 1, scale: 1, left: `${xPos}%`, bottom: `${yPos}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.1 }}
              className="absolute w-8 h-8 -ml-4 -mb-4 cursor-pointer z-20 group"
              onMouseEnter={() => setHoveredMember(member)}
              onMouseLeave={() => setHoveredMember(null)}
            >
              {/* O Ponto (Avatar) */}
              <div className={`w-full h-full rounded-full shadow-md overflow-hidden border-2 border-white ring-4 transition-all duration-300 ${isHovered ? ringColor : 'ring-transparent'} ${dotColor} flex items-center justify-center`}>
                 {member.avatar_url ? (
                   <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                 ) : (
                   <span className="font-elegant text-xs text-white">{member.nome.charAt(0)}</span>
                 )}
              </div>

              {/* Tooltip do Colaborador (Hover) */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[var(--color-atelier-grafite)] text-white p-3 rounded-2xl shadow-xl w-48 pointer-events-none z-50 flex flex-col gap-2"
                  >
                    <div className="flex flex-col border-b border-white/10 pb-2">
                      <span className="font-bold text-[12px] truncate">{member.nome}</span>
                      <span className="text-[9px] uppercase tracking-widest text-white/50">{member.role}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/60">SLA:</span>
                      <span className={xPos >= 50 ? "text-green-400" : "text-orange-400"}>{member.slaPercentage}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/60">Refação:</span>
                      <span className={yPos >= 50 ? "text-red-400" : "text-green-400"}>{member.reworkRate}%</span>
                    </div>
                    
                    {/* Seta do balão */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--color-atelier-grafite)] rotate-45"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}