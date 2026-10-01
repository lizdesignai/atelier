"use client";
import { useState, useEffect } from "react";
import { Loader2, Hammer, CheckCircle2, Clock, Circle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function ConstruirPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetch = async () => {
      try {
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          
          const { data: projTasks } = await supabase.from('tasks').select('*').eq('project_id', proj.id).in('stage', ['develop', 'qa']);
          if (projTasks) setTasks(projTasks);

          subscription = supabase
            .channel('public:tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'project_id=eq.' + proj.id }, (payload) => {
              if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
              if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
              if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
            })
            .subscribe();
        }
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    fetch();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#F0EBE1]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Hammer size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">CONSTRUIR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Acompanhamento do desenvolvimento em tempo real</p>
      </header>
      
      <div className="flex flex-col gap-4">
        {tasks.length > 0 ? tasks.map(task => (
          <div key={task.id} className="glass-panel p-6 rounded-[2rem] flex items-center justify-between">
            <span className="font-elegant text-lg text-[var(--color-atelier-grafite)]">{task.title}</span>
            <div className="flex items-center gap-2">
              {task.status === 'completed' && <><CheckCircle2 className="text-green-600" size={20}/><span className="text-green-600 text-sm">Concluído</span></>}
              {task.status === 'in_progress' && <><Clock className="text-amber-500" size={20}/><span className="text-amber-500 text-sm">Em andamento</span></>}
              {task.status === 'pending' && <><Circle className="text-gray-400" size={20}/><span className="text-gray-400 text-sm">Pendente</span></>}
            </div>
          </div>
        )) : (
          <div className="p-8 glass-panel rounded-[2rem] text-[var(--color-atelier-grafite)]">
            <p>Nenhuma tarefa listada para esta fase no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
