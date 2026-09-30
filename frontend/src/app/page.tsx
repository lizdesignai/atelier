"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Clock, Eye, FileText, CheckCircle2, Loader2, ArrowUpRight, Sparkles, Map, Hammer, Presentation, Rocket, Package, Search, Compass, FileCheck
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import dynamic from "next/dynamic";
import { BrandSnapshot } from "../components/brand/BrandSnapshot";
import { CuradoriaStage } from "../components/brand/CuradoriaStage";
import { BrandDNACuradoria } from "../components/brand/BrandDNACuradoria";
import { Territories } from "../components/brand/Territories";
import { RevealCeremony } from "../components/brand/RevealCeremony";
import { ActivationChecklist, ChecklistItem } from "../components/brand/ActivationChecklist";
import { ClientReviewGate } from "../components/brand/ClientReviewGate";
import { NotificationEngine } from "../lib/NotificationEngine";


const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const IDV_MOVEMENTS = [
  { id: 1, name: "Preparação", dbValue: ["onboarding"], icon: FileCheck, context: "Preparando o terreno...", action: "Assinatura, Pagamento e Briefing." },
  { id: 2, name: "Imersão", dbValue: ["discover"], icon: Search, context: "Estamos imersos no seu negócio...", action: "Aguarde nossa análise ou valide o Brand Snapshot." },
  { id: 3, name: "Direção", dbValue: ["define"], icon: Compass, context: "Desenhando os caminhos possíveis.", action: "Reserve um momento para avaliar os Territórios." },
  { id: 4, name: "Construção", dbValue: ["develop", "qa"], icon: Hammer, context: "Design focado na marca.", action: "Acompanhe os snapshots no Registro de Decisões." },
  { id: 5, name: "Apresentação", dbValue: ["present"], icon: Presentation, context: "Revelação oficial da marca.", action: "Agende a Reunião Oficial." },
  { id: 6, name: "Refinamento", dbValue: ["client_review", "refine"], icon: Sparkles, context: "Momento de feedback e ajustes.", action: "Analise a marca e deixe seu feedback." },
  { id: 7, name: "Entrega", dbValue: ["deliver", "activate"], icon: Package, context: "Sua marca pronta para o mundo.", action: "Siga o Checklist de Ativação e baixe seus ativos." }
];

export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [diaryPosts, setDiaryPosts] = useState<any[]>([]);
  
  const [brandSnapshot, setBrandSnapshot] = useState<any>(null);
  const [territoryEval, setTerritoryEval] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  const [briefingData, setBriefingData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', session.user.id)
        .in('status', ['active', 'delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); 
      
      if (project) {
        setActiveProject(project);
        
        const { data: briefing } = await supabase
          .from('client_briefings')
          .select('*')
          .eq('project_id', project.id)
          .maybeSingle(); 

        if (briefing) setBriefingData(briefing);

        const { data: snapshot } = await supabase
          .from('brand_snapshots')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (snapshot) setBrandSnapshot(snapshot);

        const { data: tEval } = await supabase
          .from('territory_evaluations')
          .select('*, territories(*)')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tEval) setTerritoryEval(tEval);

        const { data: cItems } = await supabase
          .from('activation_checklist')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });
        if (cItems) setChecklistItems(cItems);

        const { data: diary } = await supabase
          .from('studio_diary')
          .select('*, profiles(nome, avatar_url, role)')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
        if (diary) setDiaryPosts(diary);
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  const handleApproveSnapshot = async () => {
    if (!brandSnapshot) return;
    await supabase.from('brand_snapshots').update({ status: 'approved' }).eq('id', brandSnapshot.id);
    setBrandSnapshot({ ...brandSnapshot, status: 'approved' });
    showToast("Brand Snapshot aprovado! Avançando para a próxima etapa.");
    if (activeProject) {
      await NotificationEngine.notifyManagement(
        `Brand Snapshot Aprovado (${clientProfile?.nome || 'Cliente'})`,
        `O cliente aprovou o Brand Snapshot. O projeto pode avançar para a fase Brand DNA.`,
        'info'
      );
    }
  };

  const handleRejectSnapshot = async () => {
    if (!brandSnapshot) return;
    await supabase.from('brand_snapshots').update({ status: 'revision' }).eq('id', brandSnapshot.id);
    setBrandSnapshot({ ...brandSnapshot, status: 'revision' });
    showToast("Solicitação de ajuste enviada ao Studio Veronna.");
    if (activeProject) {
      await NotificationEngine.notifyManagement(
        `Revisão no Brand Snapshot (${clientProfile?.nome || 'Cliente'})`,
        `O cliente solicitou ajustes no Brand Snapshot da fase Descobrir.`,
        'warning'
      );
    }
  };

  const handleEvaluateTerritory = async (chosenId: string, feedback: string) => {
    if (!territoryEval) return;
    await supabase.from('territory_evaluations').update({ 
      chosen_territory_id: chosenId, 
      client_feedback: feedback, 
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', territoryEval.id);
    
    setTerritoryEval({ 
      ...territoryEval, 
      chosen_territory_id: chosenId, 
      client_feedback: feedback, 
      status: 'completed' 
    });
    showToast("Avaliação enviada com sucesso!");
    if (activeProject) {
      await NotificationEngine.notifyManagement(
        `Território Escolhido (${clientProfile?.nome || 'Cliente'})`,
        `O cliente escolheu um Território Visual. O projeto avançou para a fase de Construção.`,
        'info'
      );
    }
  };

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    await supabase.from('activation_checklist').update({ is_completed: isCompleted }).eq('id', itemId);
    setChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, is_completed: isCompleted } : item));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0EBE1]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" />
      </div>
    );
  }

  
  const currentStageIndex = activeProject ? IDV_MOVEMENTS.findIndex(s => s.dbValue.includes(activeProject.idv_phase)) : 0;
  const currentMovement = IDV_MOVEMENTS[currentStageIndex !== -1 ? currentStageIndex : 0];

  // Cálculo de progresso de tempo para o banner dinâmico
  const now = new Date();
  const start = activeProject?.created_at ? new Date(activeProject.created_at) : now;
  const end = activeProject?.data_limite ? new Date(activeProject.data_limite) : now;
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  let timeProgress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0.1), 1) : 0.1; // mínimo de 10%
  if (currentStageIndex === IDV_MOVEMENTS.length - 1) timeProgress = 1; // Se chegou no fim, 100%


  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-8 overflow-hidden flex flex-col">
      
      

      <header className="pt-4 flex flex-col gap-6 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <motion.svg 
                width="48" height="48" viewBox="0 0 457 461" fill="none" xmlns="http://www.w3.org/2000/svg"
              >
                <motion.path 
                  d="M99.3527 460.899C93.9446 438.243 91.9158 414.912 93.3322 391.663C94.5186 373.958 97.5451 356.424 102.363 339.345C108.669 316.384 117.271 294.116 128.04 272.879C136.8 255.329 144.386 243.679 158.143 222.487C167.354 208.309 176.565 195.395 188.637 179.892C184.611 173.206 180.209 166.754 175.452 160.567C166.304 148.657 155.932 137.74 144.506 127.996C128.518 113.753 111.404 100.827 93.3322 89.3441C80.1404 80.9073 67.4647 71.6896 55.3729 61.7402C39.9877 48.8563 25.7463 34.6653 12.8081 19.3258C9.77201 32.6358 8.56682 46.298 9.22588 59.934C10.2498 76.9881 13.9684 93.7725 20.2434 109.663C34.6152 144.665 55.749 176.488 82.4351 203.312C98.6904 219.537 112.959 228.628 124.849 230.254L123.615 239.284C109.527 237.358 93.9643 227.695 76.0533 209.784C48.2983 182.098 26.4272 149.087 11.7545 112.734C5.15857 95.9946 1.25707 78.3159 0.195136 60.3554C-0.673275 42.8132 1.36092 25.2479 6.21563 8.36848L8.68403 0L14.1627 6.77305C28.2232 24.3366 43.983 40.4695 61.2128 54.937C73.0459 64.7111 85.4608 73.7584 98.3894 82.0292C116.794 93.6821 134.229 106.799 150.527 121.253C162.409 131.438 173.203 142.827 182.736 155.238C186.048 159.724 190.292 165.383 194.597 172.337C203.026 161.53 212.839 149.248 224.699 134.257C238.667 116.767 251.792 100.211 272.231 96.8396C282.381 95.2394 292.774 96.3826 302.334 100.151C307.295 102.383 311.844 105.436 315.789 109.182L317.294 110.506C326.777 118.694 339.691 124.293 355.675 127.213L456.368 120.41L457 129.441L355.224 136.424H354.682C336.831 133.233 322.261 126.912 311.424 117.55L309.799 116.135C306.598 112.935 302.872 110.308 298.781 108.369C290.813 105.334 282.193 104.421 273.766 105.72C256.819 108.519 244.687 123.781 231.834 139.856C218.98 155.931 208.354 169.296 199.473 180.735C205.075 191.188 209.314 202.317 212.086 213.848C214.645 224.564 220.666 249.67 212.086 278.899C203.507 308.129 184.994 326.16 167.143 343.65C159.393 351.379 150.994 358.429 142.038 364.721C135.944 368.653 130.551 373.578 126.084 379.291C111.273 398.346 105.313 425.348 108.383 459.604L99.3527 460.899ZM193.363 188.682C182.646 202.71 174.157 214.54 165.759 227.484C151.159 249.85 144.506 260.597 136.168 276.943C125.7 297.642 117.32 319.332 111.153 341.693C106.461 358.207 103.515 375.167 102.363 392.295C102.002 398.316 101.871 404.336 101.972 410.357C104.876 397.068 110.65 384.575 118.889 373.752C123.888 367.35 129.909 361.817 136.71 357.376C145.305 351.385 153.363 344.657 160.792 337.268C177.83 320.561 195.44 303.312 203.387 276.431C211.334 249.549 205.735 226.039 203.387 216.015C201.111 206.548 197.747 197.376 193.363 188.682Z" 
                  stroke="var(--color-atelier-terracota)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
                />
                <motion.path 
                  d="M171.087 335.733L170.334 326.702C183.977 325.602 197.354 322.309 209.949 316.949C251.671 299.158 271.237 263.637 278.613 250.272C289.259 230.854 296.057 209.563 298.631 187.569C300.079 178.545 303.215 169.875 307.872 162.012C321.147 139.736 342.671 130.855 354.32 127.544L356.789 136.214C339.724 140.786 325.022 151.648 315.639 166.617C311.573 173.459 308.836 181.006 307.571 188.863C304.844 211.939 297.689 234.272 286.499 254.637C278.733 268.755 258.083 306.232 213.501 325.287C200.016 331.025 185.694 334.552 171.087 335.733Z" 
                  stroke="var(--color-atelier-terracota)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1], delay: 0.2 }}
                />
              </motion.svg>
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Projeto de Identidade
            </span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
            Sinta-se em casa, {clientProfile?.nome?.split(' ')[0] || "Cliente"}!
          </h1>
        </div>
        
        {/* WIDGET/BANNER ANIMADO DE PROGRESSO */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/50 shadow-sm p-8 min-h-[160px] flex flex-col justify-center">
          {/* Fundo dinâmico baseado no tempo (simulado aqui com gradiente CSS que dança) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F0EBE1] via-[var(--color-atelier-terracota)] to-[#F0EBE1] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] mix-blend-multiply transition-opacity duration-1000" style={{ opacity: 0.1 + (timeProgress * 0.9) }}></div>
          
          {/* Efeito de cores ganhando contraste - simulado por divs com blur */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-atelier-terracota)] rounded-full blur-[80px] animate-[pulse_6s_ease-in-out_infinite]" style={{ opacity: timeProgress }}></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#C1A89D] rounded-full blur-[80px] animate-[pulse_8s_ease-in-out_infinite_1s]" style={{ opacity: timeProgress * 0.8 }}></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Marca</span>
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{clientProfile?.nome || "Cliente"}</span>
            </div>
            <div className="text-center">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Status Atual</span>
              <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 inline-block">
                <span className="font-elegant text-xl text-[var(--color-atelier-terracota)]">{currentMovement?.name || "Descobrir"}</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">
                {currentStageIndex < 4 ? "Apresentação Prevista" : "Entrega Final"}
              </span>
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                {currentStageIndex < 4 
                  ? (activeProject?.presentation_target_date ? new Date(activeProject.presentation_target_date).toLocaleDateString('pt-BR') : 'A calcular')
                  : (activeProject?.delivery_target_date ? new Date(activeProject.delivery_target_date).toLocaleDateString('pt-BR') : 'A calcular')
                }
              </span>
            </div>
          </div>
        {/* TIMELINE LINEAR DO PROJETO - REFORMULADA */}
        <div className="w-full relative shrink-0 mt-8 mb-2 pt-6 border-t border-[var(--color-atelier-grafite)]/10">
          <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-[var(--color-atelier-grafite)]/10 -translate-y-1/2 z-0 hidden md:block"></div>
          
          <div className="flex justify-between items-center relative z-10 w-full px-2">
            {IDV_MOVEMENTS.map((movement, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;

              return (
                <div key={movement.id} className="flex flex-col items-center gap-2 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center relative z-10 transition-all duration-700 ${
                    isCompleted ? 'bg-[var(--color-atelier-terracota)] scale-90' : 
                    isCurrent ? 'bg-white border-[3px] border-[var(--color-atelier-terracota)] shadow-[0_0_20px_rgba(182,128,104,0.4)] scale-110' : 
                    'bg-[#F0EBE1] border border-[var(--color-atelier-grafite)]/20 scale-75'
                  }`}>
                    {isCompleted && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></div>}
                  </div>
                  <span className={`font-roboto text-[9px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors duration-500 ${
                    isCompleted || isCurrent ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/30'
                  }`}>
                    {movement.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

</div>
      </header>

      <section className="flex-1 flex flex-col gap-6 animate-[fadeInUp_1s_ease-out_0.2s_both] min-h-0">
        
        {/* CONTEÚDO PRINCIPAL - ETAPA CORRENTE */}
        <div className="flex-1 w-full mt-4 relative min-h-0 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-8 lg:w-[80%] h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
            
            {/* AREA DINAMICA DE ACÃO */}

            {currentStageIndex === 0 && (
              <div className="flex flex-col gap-8 h-full items-center justify-center text-center opacity-70">
                <FileCheck size={48} className="text-[var(--color-atelier-terracota)] mb-4" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Preparando o Terreno</h3>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80 max-w-md">
                  Estamos configurando seu projeto, alinhando pagamentos, contratos e agendando nosso Kick-off. O relógio de produção começará em breve.
                </p>
              </div>
            )}

            {currentStageIndex === 1 && (
              <div className="flex flex-col gap-8">
                <CuradoriaStage 
                  projectId={activeProject?.id} 
                  clientId={userId!} 
                  projectData={activeProject} 
                  briefingData={briefingData} 
                  onComplete={async () => {
                    setBriefingData({ ...briefingData, is_completed: true });
                    showToast("Briefing enviado com sucesso!");
                    await NotificationEngine.notifyManagement(
                      `Briefing Concluído (${clientProfile?.nome || 'Cliente'})`,
                      `O cliente finalizou o briefing. O projeto pode avançar para a fase de Imersão.`,
                      'success'
                    );
                  }} 
                />
                
                {briefingData?.is_completed && brandSnapshot && (
                  <BrandSnapshot
                    data={brandSnapshot}
                    onApprove={handleApproveSnapshot}
                    onRequestRevision={handleRejectSnapshot}
                    isClient={true}
                  />
                )}
              </div>
            )}

            {currentStageIndex === 2 && (
              <div className="flex flex-col gap-8">
                <BrandDNACuradoria projectId={activeProject?.id} clientProfile={clientProfile} />
              </div>
            )}

            {currentStageIndex === 3 && (
              <div className="flex flex-col gap-8 h-full items-center justify-center text-center opacity-70">
                <Hammer size={48} className="text-[var(--color-atelier-terracota)] mb-4" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Design Focado</h3>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80 max-w-md">
                  Nossa equipe está construindo sua marca (Logo, Cores, Tipografia, Mockups). 
                  Acompanhe os estudos no Registro de Decisões!
                </p>
              </div>
            )}

            {currentStageIndex === 4 && (
              <RevealCeremony 
                meetingLink={activeProject?.meeting_link} 
                meetingDate={activeProject?.meeting_date} 
                pdfUrl={activeProject?.presentation_url} 
                brandOsUrl={activeProject?.brand_os_url} 
                isUnlocked={activeProject?.idv_phase === 'client_review' || activeProject?.status === 'delivered' || activeProject?.status === 'completed'} 
                clientName={clientProfile?.nome || 'Cliente'} 
              />
            )}

            {currentStageIndex === 5 && (
              <div className="flex flex-col gap-8">
                <RevealCeremony 
                  meetingLink={activeProject?.meeting_link} 
                  meetingDate={activeProject?.meeting_date} 
                  pdfUrl={activeProject?.presentation_url} 
                  brandOsUrl={activeProject?.brand_os_url} 
                  isUnlocked={true} 
                  clientName={clientProfile?.nome || 'Cliente'} 
                />
                
                {activeProject?.idv_phase === 'client_review' && (
                  <ClientReviewGate 
                    pdfUrl={activeProject?.presentation_url}
                    onDecision={async (decision, feedback) => {
                       // O cliente tomou a decisão
                       await supabase.from('projects').update({ 
                         idv_phase: 'refine', // avança
                       }).eq('id', activeProject.id);
                       
                       await NotificationEngine.notifyManagement(
                         `Decisão de Apresentação (${clientProfile?.nome})`,
                         `Cliente avaliou a marca com a decisão: ${decision}. Feedback: ${feedback}`,
                         'info'
                       );
                       showToast("Decisão enviada com sucesso! A equipe iniciará a próxima etapa.");
                       setTimeout(() => window.location.reload(), 2000);
                    }}
                  />
                )}
                
                {activeProject?.idv_phase === 'refine' && (
                   <div className="glass-panel p-8 rounded-[2rem] text-center opacity-70">
                     <Sparkles size={48} className="text-[var(--color-atelier-terracota)] mx-auto mb-4" />
                     <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Refinamento em Andamento</h3>
                     <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80">
                       Recebemos sua avaliação. Nossa equipe está aplicando as considerações finais para consolidar o sistema visual.
                     </p>
                   </div>
                )}
              </div>
            )}

            {currentStageIndex === 6 && (
              <ActivationChecklist
                items={checklistItems}
                onToggleItem={handleToggleChecklistItem}
                isClient={true}
              />
            )}

          </div>
{/* COLUNA LATERAL (REGISTRO DE DECISÕES) */}
          <div className="lg:w-[20%] flex flex-col h-full min-h-[500px]">
            <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative">
               <div className="px-6 py-6 border-b border-[var(--color-atelier-grafite)]/10 bg-white/50 backdrop-blur-md z-10 flex flex-col gap-1">
                 <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                   Registro de Decisões
                 </h3>
                 <p className="text-xs font-roboto text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider">Histórico de Construção</p>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                 {diaryPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center py-10">
                      <Eye size={32} className="mb-3 text-[var(--color-atelier-terracota)]" />
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)] leading-relaxed">Nenhuma decisão registrada ainda.<br/>O Studio Veronna publicará os racionais aqui.</p>
                    </div>
                 ) : (
                   diaryPosts.map((post) => (
                     <div key={post.id} className="group cursor-pointer border border-[var(--color-atelier-grafite)]/5 bg-white/50 rounded-2xl p-5 hover:bg-white transition-colors shadow-sm hover:shadow-md">
                       {post.image_url && (
                         <div className="w-full h-32 rounded-xl overflow-hidden mb-4 relative">
                           <img src={post.image_url} alt="Estudo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]" />
                         </div>
                       )}
                       <div className="flex items-center gap-2 mb-3">
                         <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></span>
                         <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                           Snapshot de Construção
                         </span>
                       </div>
                       <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)] mb-2 leading-tight">{post.title}</h4>
                       <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/70 line-clamp-3">{post.content}</p>
                       <div className="mt-4 flex items-center gap-2 text-[var(--color-atelier-grafite)]/40 text-[9px] uppercase tracking-widest font-bold pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                         <Clock size={10} />
                         {new Date(post.created_at).toLocaleDateString('pt-BR')}
                       </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}