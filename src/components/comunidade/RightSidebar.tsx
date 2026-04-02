// src/components/comunidade/RightSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Medal, Loader2, Sparkles, Target } from "lucide-react";
import { supabase } from "../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function RightSidebar() {
  const [titans, setTitans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Traz os 5 utilizadores com mais EXP ordenados do maior para o menor
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url, exp, role, username')
          .order('exp', { ascending: false })
          .limit(5);

        if (error) throw error;
        if (data) setTitans(data);
      } catch (error) {
        console.error("Erro ao carregar o Leaderboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankName = (exp: number, role: string) => {
    if (role === 'admin' || role === 'gestor') return "Mentor VRTICE";
    if (!exp) return "Visionário";
    if (exp < 1000) return "Visionário";
    if (exp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  return (
    <aside className="hidden lg:flex flex-col w-[300px] shrink-0 sticky top-8 h-[calc(100vh-64px)] custom-scrollbar gap-6">
      
      {/* BLOCO 1: A RODA DO LEGADO */}
      <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[var(--color-atelier-terracota)]/10 blur-[30px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-3 relative z-10">
          <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
             <Medal size={18} className="text-[var(--color-atelier-terracota)]" /> Roda do Legado
          </h3>
        </div>
        
        <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed relative z-10">
          Transforme a sua marca num império. Complete missões, partilhe os resultados no Mural e ganhe XP para subir de Rank.
        </p>
        
        <div className="flex flex-col gap-2 mt-1 relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]/70">
            <Target size={14} className="text-[var(--color-atelier-terracota)]" /> Foco Atual: Tração e Expansão
          </div>
        </div>

        <button 
          onClick={() => showToast("Em breve: Painel de Missões Detalhado!")} 
          className="mt-2 w-full py-3 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors shadow-sm relative z-10"
        >
          Ver Missões
        </button>
      </div>

      {/* BLOCO 2: TITÃS DO ATELIER (LEADERBOARD REAL) */}
      <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-3">
          <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
             <Award size={18} className="text-[var(--color-atelier-terracota)]" /> Titãs em Destaque
          </h3>
        </div>
        
        <div className="flex flex-col gap-4 mt-2">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
          ) : titans.length === 0 ? (
            <p className="text-[11px] text-[var(--color-atelier-grafite)]/40 text-center py-4 font-roboto italic">O pódio está vazio.</p>
          ) : (
            titans.map((titan, index) => (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} key={titan.id} className="flex items-center gap-3 group cursor-pointer hover:bg-white/50 p-2 -mx-2 rounded-xl transition-colors">
                
                {/* Medalha / Posição */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-elegant text-sm shadow-sm border border-white shrink-0
                  ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/20' : 
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' : 
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' : 
                    'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/50'}`}
                >
                  {index < 3 ? index + 1 : <Sparkles size={12} />}
                </div>
                
                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white shadow-sm shrink-0 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-lg">
                  {titan.avatar_url ? (
                    <img src={titan.avatar_url} alt={titan.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span>{titan.nome?.charAt(0)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col truncate flex-1">
                  <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate group-hover:text-[var(--color-atelier-terracota)] transition-colors">{titan.nome}</span>
                  <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 truncate">
                    {getRankName(titan.exp, titan.role)} • {titan.exp || 0} XP
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}