"use client";
import { dbSelect } from "../../../lib/dbClient";
import { useState, useEffect } from "react";
import { Loader2, Package, Download } from "lucide-react";
import { ActivationChecklist } from "../../../components/brand/ActivationChecklist";

import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function AtivarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const data = await dbSelect('activation_checklist', { project_id: proj.id });
          if (data.length) setChecklist(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchPageData();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#E2ECF3]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-6 md:p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">ATIVAR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Entregáveis e ativação da marca</p>
      </header>
      
      <div className="flex flex-col md:flex-row gap-6">
        {project.presentation_url && (
          <a href={project.presentation_url} target="_blank" rel="noopener noreferrer" className="flex-1 glass-panel p-5 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 group hover:bg-white/40 transition-colors">
            <div>
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Apresentação Final</h3>
              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70">Baixar o PDF da apresentação</p>
            </div>
            <Download size={24} className="text-[var(--color-atelier-terracota)] opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
        
        {project.brand_os_url && (
          <a href={project.brand_os_url} target="_blank" rel="noopener noreferrer" className="flex-1 glass-panel p-5 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 group hover:bg-white/40 transition-colors">
            <div>
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Brand OS</h3>
              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70">Acessar os ativos da marca</p>
            </div>
            <Download size={24} className="text-[var(--color-atelier-terracota)] opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
      </div>

      <div className="mt-4">
        <ActivationChecklist 
          items={checklist} 
          onToggleItem={async () => {}} 
          isClient={true} 
        />
      </div>
    </div>
  );
}
