"use client";
import { useState, useEffect } from "react";
import { Loader2, Package, Download } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { ActivationChecklist } from "../../../components/brand/ActivationChecklist";

export default function AtivarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) setProfile(prof);
      const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active','delivered','completed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (proj) {
        setProject(proj);
        const { data: items } = await supabase.from('activation_checklist').select('*').eq('project_id', proj.id);
        if (items) setChecklist(items);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F0EBE1]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">ATIVAR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Entregáveis e ativação da marca</p>
      </header>
      
      <div className="flex flex-col md:flex-row gap-6">
        {project.presentation_url && (
          <a href={project.presentation_url} target="_blank" rel="noopener noreferrer" className="flex-1 glass-panel p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white/40 transition-colors">
            <div>
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Apresentação Final</h3>
              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70">Baixar o PDF da apresentação</p>
            </div>
            <Download size={24} className="text-[var(--color-atelier-terracota)] opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
        
        {project.brand_os_url && (
          <a href={project.brand_os_url} target="_blank" rel="noopener noreferrer" className="flex-1 glass-panel p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white/40 transition-colors">
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
