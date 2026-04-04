// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Clock, Eye, FileText, CheckCircle2, Loader2, ArrowUpRight
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import BriefingModal from "../components/BriefingModal";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const PROJECT_STAGES = [
  { id: 1, name: "Reunião de Alinhamento", dbValue: "reuniao" },
  { id: 2, name: "Estudo e Pesquisa", dbValue: "pesquisa" },
  { id: 3, name: "Direcionamento Criativo", dbValue: "direcionamento" },
  { id: 4, name: "Processo Criativo IDV", dbValue: "processo" },
  { id: 5, name: "Apresentação Oficial", dbValue: "apresentacao" },
  { id: 6, name: "Ajustes e Fechamento", dbValue: "ajustes" }
];

export default function Home() {
  const router = useRouter();

  // ==========================================
  // ESTADOS DO SUPABASE E LÓGICA DO MOTOR
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [diaryPosts, setDiaryPosts] = useState<any[]>([]);
  
  // Status do Briefing Isolado
  const [hasBriefing, setHasBriefing] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      // 1. Puxa o Perfil (Nome e Foto)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

      // 2. Puxa o Projeto Ativo e a sua Fase Atual
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', session.user.id)
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); 
      
      if (project) {
        
        // REDIRECIONAMENTO DE SEGURANÇA: Se o cliente é de Instagram, chuta para o Cockpit.
        if (project.type === 'Gestão de Instagram') {
          router.replace('/cockpit');
          return;
        }

        setActiveProject(project);
        
        // Verifica se o briefing já foi preenchido
        const { data: briefing } = await supabase
          .from('client_briefings')
          .select('is_completed')
          .eq('project_id', project.id)
          .maybeSingle(); 

        if (briefing && briefing.is_completed) setHasBriefing(true);

        // 3. Puxa o Diário de Bordo Oficial deste projeto COM OS DADOS DO AUTOR
        const { data: diaryData } = await supabase
          .from('diary_posts')
          .select('*, profiles(nome, avatar_url, role)')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
          
        if (diaryData) setDiaryPosts(diaryData);
      }
      
      setIsLoading(false);
    };

    fetchDashboardData();
  }, [router]);

  // Lógica de Renderização do Cofre (Progresso e Desfoque)
  const currentStageIndex = activeProject?.fase ? PROJECT_STAGES.findIndex(s => s.dbValue === activeProject.fase) : 0;
  const progressPercent = hasBriefing ? ((currentStageIndex + 1) / PROJECT_STAGES.length) * 100 : 0;
  
  const currentGrayscale = 100 - progressPercent; 
  const currentBlur = hasBriefing ? 30 - (progressPercent * 0.3) : 30; // Vai de 30px até 0px
  const glowOpacity = (progressPercent / 100) * 0.8;

  // Calcula dias restantes
  const calculateDaysLeft = (deadline: string) => {
    if (!deadline) return '--';
    const diffTime = Math.abs(new Date(deadline).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = activeProject ? calculateDaysLeft(activeProject.data_limite) : '--';

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-8">
      
      {/* ==========================================
          CHAMADA DO MODAL DE BRIEFING ISOLADO
          ========================================== */}
      <BriefingModal 
        isOpen={isBriefingModalOpen} 
        onClose={() => setIsBriefingModalOpen(false)} 
        projectId={activeProject?.id} 
        clientId={userId!} 
        onSuccess={() => {
          setIsBriefingModalOpen(false);
          setHasBriefing(true);
        }} 
      />

      {/* ==========================================
          1. CABEÇALHO CONCIERGE & CONTROLES
          ========================================== */}
      <header className="pt-4 flex justify-between items-end shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-md opacity-30 animate-pulse"></div>
              <img src="/images/simbolo-rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Fase Atual: {PROJECT_STAGES[currentStageIndex]?.name || 'Aguardando Fundação'}
            </span>
          </div>
          
          <h1 className="font-elegant text-6xl md:text-7xl text-[var(--color-atelier-grafite)] tracking-wide leading-[1.1]">
            Bem-vindo de volta,<br />
            <span className="text-[var(--color-atelier-terracota)] italic pr-4">{clientProfile?.nome?.split(' ')[0] || "Cliente"}</span>.
          </h1>
        </div>
      </header>

      {/* ==========================================
          2. O GRID PRINCIPAL (Cofre + Lateral)
          ========================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 animate-[fadeInUp_1s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA (O COFRE E A LINHA DO TEMPO) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(122,116,112,0.15)] group cursor-default border border-white/60">
            
            <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')", filter: `grayscale(${currentGrayscale}%) blur(${currentBlur}px)`, transition: "filter 1.5s ease-out" }}></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-atelier-creme)]/95 via-[var(--color-atelier-creme)]/60 to-transparent backdrop-blur-sm"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-atelier-terracota)] rounded-full blur-[120px] mix-blend-overlay transition-opacity duration-[2s]" style={{ opacity: glowOpacity }}></div>

            <div className="absolute inset-0 p-10 md:p-14 flex flex-col justify-between z-10">
              
              <div className="flex justify-between items-start">
                <div className="bg-white/80 backdrop-blur-xl border border-white px-5 py-3 rounded-full flex items-center gap-3 shadow-sm">
                  <Lock size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">O Cofre de Identidade</span>
                </div>
                
                <div className="text-right">
                  <p className="micro-title text-[var(--color-atelier-grafite)]/70 mb-1">Revelação em</p>
                  <p className="font-elegant text-[2.5rem] flex items-center justify-end gap-2 drop-shadow-sm text-[var(--color-atelier-terracota)]">
                    <Clock size={20} className="opacity-40" /> {daysLeft} Dias
                  </p>
                </div>
              </div>

              <div className="max-w-3xl">
                <h2 className="font-elegant text-5xl md:text-6xl text-[var(--color-atelier-grafite)] mb-10 leading-[1.1]">
                  A sua marca está ganhando forma e alma.
                </h2>
                
                <div className="w-full mt-4">
                  <div className="flex justify-between items-center relative z-10 px-2">
                    {PROJECT_STAGES.map((stage, index) => {
                      const isCompleted = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex && hasBriefing; 
                      const isPending = index > currentStageIndex || !hasBriefing;

                      return (
                        <div key={stage.id} className="flex flex-col items-center gap-3 relative z-10 group w-32">
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10
                            ${isCompleted ? 'bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white scale-110' : ''}
                            ${isCurrent ? 'bg-white border-[var(--color-atelier-terracota)] shadow-[0_0_20px_rgba(173,111,64,0.6)] scale-125' : ''}
                            ${isPending ? 'bg-white/40 border-white/80' : ''}
                          `}>
                            {isCurrent && <div className="w-2 h-2 bg-[var(--color-atelier-terracota)] rounded-full animate-pulse"></div>}
                            {isCompleted && <CheckCircle2 size={12} strokeWidth={3} />}
                          </div>
                          
                          <span className={`
                            font-roboto text-[10px] uppercase tracking-widest font-bold text-center transition-colors duration-500
                            ${isCurrent ? 'text-[var(--color-atelier-terracota)] drop-shadow-sm' : 'text-[var(--color-atelier-grafite)]/50'}
                            ${isCompleted ? 'text-[var(--color-atelier-grafite)]' : ''}
                          `}>
                            {stage.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="relative h-1 w-[calc(100%-8rem)] mx-auto -mt-10 bg-white/40 rounded-full z-0 overflow-hidden shadow-inner">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (Briefing e Diário) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* MÓDULO DE AÇÃO: BOTÃO DE BRIEFING */}
          {!hasBriefing ? (
             <div className="glass-panel px-5 py-4 rounded-[1.5rem] flex items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-white/90 to-white/50 border border-white shadow-[0_8px_20px_rgba(173,111,64,0.05)]">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                   <FileText size={16} strokeWidth={2} />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] leading-none mb-1">Briefing Oficial</span>
                   <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 leading-tight">O guia da sua marca.</span>
                 </div>
               </div>
               <button onClick={() => setIsBriefingModalOpen(true)} className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-5 py-2.5 rounded-full font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 flex items-center gap-2">
                 Responder <ArrowUpRight size={12}/>
               </button>
             </div>
          ) : (
            <div className="px-5 py-3 rounded-[1.5rem] flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 shrink-0">
               <CheckCircle2 size={16} />
               <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.2em]">Fundação Estabelecida.</span>
            </div>
          )}

          {/* DIÁRIO DO ATELIER */}
          <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative min-h-0">
             <div className="px-6 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/30 backdrop-blur-md z-10 flex justify-between items-center shrink-0">
               <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                 <Eye size={18} className="text-[var(--color-atelier-terracota)]" /> Diário de Bordo
               </h3>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
               {diaryPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                    <Eye size={32} className="mb-2 text-[var(--color-atelier-terracota)]" />
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">O diário de bordo está em branco.<br/>O Atelier publicará as atualizações aqui.</p>
                  </div>
               ) : (
                 diaryPosts.map((post) => (
                    <div key={post.id} className="group cursor-pointer border-b border-[var(--color-atelier-grafite)]/10 pb-6 last:border-none">
                      {post.image_url && (
                        <div className="w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-4 relative shadow-sm group-hover:shadow-md transition-all">
                          <img src={post.image_url} alt="Estudo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
                          <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></span>
                            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                              Atualização
                            </span>
                          </div>
                        </div>
                      )}
                      <h4 className="font-elegant text-[22px] text-[var(--color-atelier-grafite)] mb-2 leading-tight group-hover:text-[var(--color-atelier-terracota)] transition-colors">{post.title}</h4>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      
                      {/* ASSINATURA DA POSTAGEM (AUTOR E HORA EXATA) */}
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-atelier-terracota)]/10 overflow-hidden flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 border border-[var(--color-atelier-terracota)]/20">
                            {post.profiles?.avatar_url ? (
                              <img src={post.profiles.avatar_url} alt={post.profiles.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-elegant text-xs">{post.profiles?.nome?.charAt(0) || "A"}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)] leading-none">{post.profiles?.nome || "Equipa Atelier"}</span>
                            <span className="font-roboto text-[8px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{post.profiles?.role === 'admin' ? 'Designer' : 'Diretor(a)'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/40">
                          <Clock size={12} />
                          <span className="font-roboto text-[9px] uppercase tracking-widest font-bold">
                            {new Date(post.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} às {new Date(post.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                    </div>
                 ))
               )}
             </div>
          </div>

        </div>
      </section>
    </div>
  );
}