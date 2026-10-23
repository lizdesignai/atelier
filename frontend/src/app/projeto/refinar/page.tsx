"use client";
import { useState, useEffect } from "react";
import { Loader2, Gem, CheckCircle2, Clock, Circle } from "lucide-react";

import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function RefinarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);

        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const res = await fetch('/api/db/query', {
            method: 'POST',
            body: JSON.stringify({ query: "SELECT * FROM tasks WHERE project_id = $1 AND stage = 'refine'", values: [proj.id] })
          });
          const { data } = await res.json();
          if (data) setTasks(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000); // Polling 15s instead of websocket
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#E2ECF3]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-6 md:p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Gem size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">REFINAR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Ajustes e polimento final</p>
      </header>
      
      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 text-[var(--color-atelier-grafite)] mb-4">
        <Gem size={32} className="text-[var(--color-atelier-terracota)]" />
        <div>
          <h2 className="font-elegant text-2xl mb-2">Trabalho em andamento</h2>
          <p className="font-roboto text-sm opacity-80">Estamos aplicando os refinamentos baseados no seu feedback para garantir o melhor resultado.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {tasks.length > 0 ? tasks.map(task => (
          <div key={task.id} className="glass-panel p-5 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <span className="font-elegant text-lg text-[var(--color-atelier-grafite)]">{task.title}</span>
            <div className="flex items-center gap-2">
              {task.status === 'completed' && <><CheckCircle2 className="text-green-600" size={20}/><span className="text-green-600 text-sm">Concluído</span></>}
              {task.status === 'in_progress' && <><Clock className="text-amber-500" size={20}/><span className="text-amber-500 text-sm">Em andamento</span></>}
              {task.status === 'pending' && <><Circle className="text-gray-400" size={20}/><span className="text-gray-400 text-sm">Pendente</span></>}
            </div>
          </div>
        )) : (
          <div className="p-8 glass-panel rounded-[2rem] text-[var(--color-atelier-grafite)]">
            <p>Nenhuma tarefa de refinamento no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
