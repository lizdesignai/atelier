"use client";
import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { BrandDNACuradoria } from "../../../components/brand/BrandDNACuradoria";

export default function DescobrirPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [briefingData, setBriefingData] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) setProfile(prof);
      const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active','delivered','completed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (proj) {
        setProject(proj);
        const { data: brief } = await supabase.from('client_briefings').select('*').eq('project_id', proj.id).single();
        if (brief) setBriefingData(brief);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F0EBE1]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full px-6 lg:px-12 relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Search size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">DESCOBRIR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Imersão e compreensão do seu universo</p>
      </header>
      
      <div className="flex flex-col gap-8">
        <BrandDNACuradoria 
          projectId={project.id} 
          clientProfile={profile} 
        />
      </div>
    </div>
  );
}
