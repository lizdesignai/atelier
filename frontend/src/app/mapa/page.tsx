"use client";

import { motion } from "framer-motion";
import { Compass, FileText, ArrowRight } from "lucide-react";
import { useGlobalStore } from "@/contexts/GlobalStore";

export default function MapaPage() {
  const { isGlobalLoading } = useGlobalStore();

  if (isGlobalLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-terracota)] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full mx-auto space-y-6"
      >
        <div className="glass-panel p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-atelier-terracota)] to-[#d27555] flex items-center justify-center text-white shadow-lg relative z-10">
            <Compass size={40} />
          </div>
          
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl font-light text-[var(--color-atelier-grafite)]">O Mapa</h1>
            <p className="text-[var(--color-atelier-grafite)]/70 max-w-lg mx-auto">
              Seu direcionamento estratégico. Aqui ficarão disponíveis as entregas, o dossiê da sua marca e os relatórios de posicionamento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-6 flex flex-col items-start gap-4 group cursor-pointer hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-atelier-grafite)]">Dossiê Estratégico</h3>
              <p className="text-sm text-[var(--color-atelier-grafite)]/60 mt-1">
                Acesse o seu relatório detalhado de posicionamento e raio-x.
              </p>
            </div>
            <button className="mt-auto pt-4 flex items-center gap-2 text-sm font-bold text-[var(--color-atelier-terracota)] group-hover:translate-x-1 transition-transform">
              Acessar Documento <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
