// src/app/admin/gestao/components/ProfitabilityScatter.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Star, Skull, TrendingUp, Coffee } from "lucide-react";

interface ProfitabilityScatterProps {
  projectsData: any[];
}

export default function ProfitabilityScatter({ projectsData }: ProfitabilityScatterProps) {
  const [hoveredProject, setHoveredProject] = useState<any | null>(null);

  // ==========================================================================
  // MOTOR DE CÁLCULO DE ESCALA (Ajuste dinâmico baseado nos dados reais)
  // ==========================================================================
  // Encontra o projeto com mais horas e o projeto com maior fee para ajustar o gráfico.
  // Colocamos limites mínimos (40h e R$ 4000) para o gráfico não ficar distorcido se os dados forem baixos.
  const maxHours = Math.max(40, ...projectsData.map(p => p.totalHours)) * 1.1; // +10% de respiro
  const maxFee = Math.max(4000, ...projectsData.map(p => p.fee)) * 1.1; // +10% de respiro

  // Funções de Plotagem (Conversão para %)
  const getXPos = (hours: number) => Math.min((hours / maxHours) * 100, 100);
  const getYPos = (fee: number) => Math.min((fee / maxFee) * 100, 100);

  // Linhas Medianas para dividir os 4 quadrantes (Baseado nos critérios de classificação do Dashboard)
  const medianHoursPercentage = getXPos(20); // 20h é o ponto de virada de esforço
  const medianFeePercentage = getYPos(1750); // R$ 1750 é o ponto de virada de receita

  return (
    <div className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-[450px] relative overflow-hidden">
      
      {/* HEADER DA MATRIZ */}
      <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--color-atelier-terracota)]" /> Matriz BCG de Rentabilidade
          </h3>
          <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
            Receita (Fee Mensal) vs. Esforço Operacional (Horas)
          </p>
        </div>
        <div className="group relative cursor-pointer text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors">
          <Info size={18} />
          {/* Tooltip de Explicação */}
          <div className="absolute right-0 top-6 w-72 bg-[var(--color-atelier-grafite)] text-white p-4 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <p className="font-roboto text-[11px] leading-relaxed">
              Posicionamento dinâmico: o quadrante <strong>Superior Esquerdo</strong> abriga seus clientes mais lucrativos (Estrelas). O <strong>Inferior Direito</strong> revela contas tóxicas com alta carga de horas e baixo fee.
            </p>
          </div>
        </div>
      </div>

      {/* ÁREA DO GRÁFICO (SCATTER PLOT) */}
      <div className="flex-1 relative border-l-2 border-b-2 border-[var(--color-atelier-grafite)]/20 ml-8 mb-8 mt-2">
        
        {/* Marcadores dos Eixos */}
        <span className="absolute -left-10 bottom-1/2 translate-y-1/2 -rotate-90 font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400 origin-center whitespace-nowrap">
          Receita / Fee (Y)
        </span>
        <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
          Horas Consumidas (X)
        </span>

        {/* Linhas de Divisão dos Quadrantes (A Cruz Dinâmica) */}
        <div className="absolute top-0 bottom-0 w-px bg-[var(--color-atelier-grafite)]/10 border-r border-dashed" style={{ left: `${medianHoursPercentage}%` }}></div>
        <div className="absolute left-0 right-0 h-px bg-[var(--color-atelier-grafite)]/10 border-b border-dashed" style={{ bottom: `${medianFeePercentage}%` }}></div>

        {/* Labels de Fundo (Marca d'água dos Quadrantes) */}
        <div className="absolute top-4 left-4 flex flex-col items-start opacity-20 pointer-events-none">
          <Star size={24} className="text-green-500 mb-1" fill="currentColor" />
          <span className="font-elegant text-xl text-green-600">Estrelas</span>
        </div>
        <div className="absolute bottom-4 right-4 flex flex-col items-end opacity-20 pointer-events-none">
          <Skull size={24} className="text-red-500 mb-1" />
          <span className="font-elegant text-xl text-red-600">Vampiros</span>
        </div>
        <div className="absolute top-4 right-4 flex flex-col items-end opacity-20 pointer-events-none">
          <TrendingUp size={24} className="text-blue-500 mb-1" />
          <span className="font-elegant text-xl text-blue-600">Cobiçados</span>
        </div>
        <div className="absolute bottom-4 left-4 flex flex-col items-start opacity-20 pointer-events-none">
          <Coffee size={24} className="text-gray-500 mb-1" />
          <span className="font-elegant text-xl text-gray-600">Potenciais</span>
        </div>

        {/* OS PONTOS DE DADOS (Projetos / Clientes) */}
        {projectsData.map((proj, index) => {
          const xPos = getXPos(proj.totalHours);
          const yPos = getYPos(proj.fee);
          const isHovered = hoveredProject?.id === proj.id;

          // Definir o tamanho do ponto baseado na Margem Real (Projetos com maior margem ficam ligeiramente maiores)
          // Isso adiciona uma 3ª dimensão de dados ao gráfico.
          const dotSize = Math.max(1.5, Math.min(3, 1 + (proj.marginPercentage / 50)));

          return (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, scale: 0, x: "-50%", y: "50%" }}
              animate={{ opacity: 1, scale: 1, left: `${xPos}%`, bottom: `${yPos}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.05 }}
              className="absolute cursor-pointer z-20 group"
              onMouseEnter={() => setHoveredProject(proj)}
              onMouseLeave={() => setHoveredProject(null)}
              style={{ width: `${dotSize}rem`, height: `${dotSize}rem`, marginLeft: `-${dotSize / 2}rem`, marginBottom: `-${dotSize / 2}rem` }}
            >
              {/* O Ponto (Avatar da Marca) */}
              <div className={`w-full h-full rounded-full shadow-md overflow-hidden border-2 border-white ring-4 transition-all duration-300 flex items-center justify-center bg-gray-50 ${isHovered ? 'ring-[var(--color-atelier-terracota)]/40 scale-125 z-50' : 'ring-transparent hover:ring-[var(--color-atelier-terracota)]/20 hover:scale-110'}`}>
                 {proj.avatar ? (
                   <img src={proj.avatar} alt={proj.clientName} className="w-full h-full object-cover" />
                 ) : (
                   <span className="font-elegant text-[10px] text-[var(--color-atelier-grafite)] font-bold">{proj.clientName.charAt(0)}</span>
                 )}
              </div>

              {/* Tooltip do Projeto (Hover) */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[var(--color-atelier-grafite)] text-white p-4 rounded-2xl shadow-xl w-56 pointer-events-none z-[100] flex flex-col gap-3"
                  >
                    <div className="flex flex-col border-b border-white/10 pb-3">
                      <span className="font-bold text-[14px] truncate leading-tight mb-1">{proj.clientName}</span>
                      <div className={`inline-flex self-start px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                        proj.classification.includes("Estrela") ? 'bg-green-500/20 text-green-300' : 
                        proj.classification.includes("Vampiro") ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/70'
                      }`}>
                        {proj.classification}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-white/50">Fee Mensal</span>
                        <span className="font-elegant text-lg leading-none mt-1">R$ {proj.fee}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-white/50">Tempo Gasto</span>
                        <span className="font-elegant text-lg leading-none mt-1 text-orange-300">{proj.totalHours.toFixed(1)}h</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mt-1 border border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Lucro Real:</span>
                      <span className={`font-bold text-[12px] ${proj.grossMargin > 0 ? "text-green-400" : "text-red-400"}`}>
                        R$ {proj.grossMargin.toLocaleString('pt-BR')}
                      </span>
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