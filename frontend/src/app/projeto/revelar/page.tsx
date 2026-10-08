"use client";
import { useState, useEffect } from "react";
import { Loader2, Presentation } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { RevealCeremony } from "../../../components/brand/RevealCeremony";
import { ClientReviewGate } from "../../../components/brand/ClientReviewGate";

import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function RevelarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) setProfile(prof);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
        }
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F0EBE1]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  
  const isPastMeetingDate = project.meeting_date && new Date().getTime() >= new Date(project.meeting_date).getTime();
  const isUnlocked = isPastMeetingDate || project.idv_phase === 'client_review' || project.idv_phase === 'refine' || project.idv_phase === 'deliver' || project.idv_phase === 'activate';

  const showReviewGate = (project.idv_phase === 'present' && isPastMeetingDate) || project.idv_phase === 'client_review';

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Presentation size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">REVELAR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Apresentação da sua nova marca</p>
      </header>
      
      <div className="flex flex-col gap-8">
        <RevealCeremony 
          meetingLink={project.meeting_link}
          meetingDate={project.meeting_date}
          pdfUrl={project.presentation_url}
          brandOsUrl={project.brand_os_url}
          isUnlocked={isUnlocked}
          clientName={profile?.full_name || 'Cliente'}
        />
        {showReviewGate && (
          <ClientReviewGate
            onDecision={async (decision, feedback) => {
              try {
                const { submitClientReviewAction } = await import('../../actions/clientProject');
                const result = await submitClientReviewAction(project.id, decision, feedback);
                if (result.success) {
                  window.dispatchEvent(new CustomEvent('showToast', { detail: 'Avaliação enviada com sucesso!' }));
                  setTimeout(() => window.location.href = result.nextPhase === 'deliver' ? '/projeto/ativar' : '/projeto/refinar', 1000);
                }
              } catch (e) {
                window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar avaliação.' }));
              }
            }}
            pdfUrl={project.presentation_url}
          />
        )}
      </div>
    </div>
  );
}
