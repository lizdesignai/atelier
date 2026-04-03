// src/app/comunidade/layout.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Loader2, Award, Medal, Compass, Sparkles, MapPin, Target, Handshake, Briefcase, Users
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import LeftSidebar from "../../components/comunidade/LeftSidebar"; // IMPORTAÇÃO DO NOVO MÓDULO

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

function ComunidadeContent({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para o Leaderboard (Ranking Real)
  const [titans, setTitans] = useState<any[]>([]);
  const [isLoadingTitans, setIsLoadingTitans] = useState(true);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Deteta em que grupo estamos para alterar a UI dinamicamente
  const currentGroup = searchParams?.get('grupo') || 'global';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(data);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  // Busca os líderes no banco de dados
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
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
        setIsLoadingTitans(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  // ==========================================
  // LÓGICA DE TELA CHEIA ABSOLUTA PARA O PERFIL
  // ==========================================
  const isProfilePage = pathname.startsWith('/comunidade/perfil/');

  if (isProfilePage) {
    return (
      <div className="w-full font-roboto text-[var(--color-atelier-grafite)] relative flex flex-col items-center pb-20">
        <div className="w-full max-w-[1200px] px-4 md:px-8 py-4 flex justify-start relative z-20">
          <Link href="/comunidade" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[11px] uppercase tracking-widest font-bold">
            ← Voltar para a Comunidade
          </Link>
        </div>
        {/* O componente ProfilePage agora tem 100% de largura livre */}
        <div className="w-full">
          {children}
        </div>
      </div>
    );
  }

  const getRankName = (currentExp: number, role?: string) => {
    if (role === 'admin' || role === 'gestor') return "Fundadora";
    if (!currentExp) return "Visionário";
    if (currentExp < 1000) return "Visionário";
    if (currentExp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  return (
    <div className="flex justify-center w-full font-roboto text-[var(--color-atelier-grafite)] relative">
      
      {/* Background Elements para dar profundidade (Mantidos para charme) */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="max-w-[1200px] w-full flex gap-8 px-4 md:px-8 py-8 relative z-10">
        
        {/* ==========================================
            COLUNA ESQUERDA: PERFIL E NAVEGAÇÃO MODULAR
            ========================================== */}
        <LeftSidebar userProfile={userProfile} />

        {/* ==========================================
            COLUNA CENTRAL: O PALCO PRINCIPAL (50%)
            ========================================== */}
        <main className="flex-1 max-w-[600px] flex flex-col pb-32">
          {children}
        </main>

        {/* ==========================================
            COLUNA DIREITA: GAMIFICAÇÃO E STATUS (25%)
            ========================================== */}
        <aside className="hidden lg:flex flex-col w-[300px] shrink-0 sticky top-8 h-[calc(100vh-64px)] custom-scrollbar gap-6" id="right-sidebar-slot">
           
           {/* RENDERIZAÇÃO CONTEXTUAL DA BARRA DIREITA */}
           {currentGroup === 'networking' ? (
             /* WIDGETS EXCLUSIVOS DO NETWORKING */
             <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4 animate-[fadeInUp_0.5s_ease-out]">
               <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-3">
                 <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <Handshake size={18} className="text-[var(--color-atelier-terracota)]" /> Hub de Negócios
                 </h3>
               </div>
               <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed mb-2">
                 Encontre os parceiros certos para escalar o seu projeto, ou ofereça os serviços da sua marca para a comunidade.
               </p>
               <div className="flex flex-col gap-3">
                 <button className="bg-blue-50 hover:bg-blue-100 border border-blue-100 p-3.5 rounded-xl flex items-center gap-3 transition-colors text-left w-full">
                    <Briefcase size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-roboto text-[11px] text-blue-800 font-bold uppercase tracking-widest">Oferecer Parceria</span>
                      <span className="font-roboto text-[9px] text-blue-600/70">Divulgue os seus serviços</span>
                    </div>
                 </button>
                 <button className="bg-orange-50 hover:bg-orange-100 border border-orange-100 p-3.5 rounded-xl flex items-center gap-3 transition-colors text-left w-full">
                    <Users size={16} className="text-orange-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-roboto text-[11px] text-orange-800 font-bold uppercase tracking-widest">Procurar Talentos</span>
                      <span className="font-roboto text-[9px] text-orange-600/70">Encontre fornecedores</span>
                    </div>
                 </button>
               </div>
             </div>
           ) : (
             /* WIDGETS PADRÃO (MURAL E FEEDBACK) */
             <>
               {/* Bloco 1: A Roda do Legado (Mini-Widget) */}
               <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4 relative overflow-hidden animate-[fadeInUp_0.5s_ease-out]">
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
                   Ver Missões Disponíveis
                 </button>
               </div>

               {/* Bloco 2: Titãs do Atelier (Leaderboard Dinâmico) */}
               <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4 animate-[fadeInUp_0.6s_ease-out]">
                 <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-3">
                   <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                      <Award size={18} className="text-[var(--color-atelier-terracota)]" /> Titãs em Destaque
                   </h3>
                 </div>
                 
                 <div className="flex flex-col gap-4 mt-2">
                   {isLoadingTitans ? (
                     <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
                   ) : titans.length === 0 ? (
                     <p className="text-[11px] text-[var(--color-atelier-grafite)]/40 text-center py-4 font-roboto italic">O pódio está vazio.</p>
                   ) : (
                     titans.map((titan, index) => (
                       <Link href={`/comunidade/perfil/${titan.username || titan.id}`} key={titan.id}>
                         <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-3 group cursor-pointer hover:bg-white/50 p-2 -mx-2 rounded-xl transition-colors">
                           
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
                       </Link>
                     ))
                   )}
                 </div>
               </div>
             </>
           )}
        </aside>

      </div>
    </div>
  );
}

// O ENVOLVÓCRIO DE SUSPENSE OBRIGATÓRIO NO NEXT.JS PARA useSearchParams()
export default function ComunidadeLayoutWithSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>}>
      <ComunidadeContent>{children}</ComunidadeContent>
    </Suspense>
  );
}