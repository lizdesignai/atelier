"use client";
import { dbSelectOne } from "../../../lib/dbClient";
import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { BrandDNACuradoria } from "../../../components/brand/BrandDNACuradoria";

import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function DescobrirPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [briefingData, setBriefingData] = useState<any>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const row = await dbSelectOne('client_briefings', { project_id: proj.id });
          if (row) setBriefingData(row);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchPageData();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F0EBE1]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-6 md:p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar">
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
