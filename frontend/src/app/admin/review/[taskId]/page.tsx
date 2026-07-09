"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import TaskCard from "../../../jtbd/components/TaskCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { NotificationEngine } from "../../../../../lib/NotificationEngine";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ReviewTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let profile = null;
      if (session) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        profile = data;
      } else {
        // Mock admin profile for email link access without login
        profile = { id: 'admin-guest', nome: 'Gestão (Via Email)', role: 'admin' };
      }
      
      setCurrentUser(profile);

      // Fetch task with full relations exactly like JTBDPage
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            id,
            title,
            client_id,
            type,
            profiles:client_id (
              id,
              nome,
              avatar_url
            )
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao carregar a tarefa.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, finalStatus: string, updatedTask?: any) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://atelier-zwlt.onrender.com";
      
      const payload: any = { 
        requestedStatus: finalStatus, 
        task: updatedTask || task,
        collaboratorName: currentUser?.nome?.split(' ')[0] || 'Desconhecido'
      };

      const response = await fetch(`${backendUrl}/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      const { data } = await response.json();
      setTask(data);
      
      if (finalStatus === 'in_progress') {
         showToast("Feedback enviado com sucesso!");
         NotificationEngine.notifyManagement("📝 Ajuste Solicitado", `O Gestor solicitou ajustes na tarefa "${data.title}".`, "action");
         router.push("/admin/jtbd");
      } else if (finalStatus === 'completed' || finalStatus === 'pending_client_approval') {
         showToast("Tarefa Aprovada com sucesso!");
         NotificationEngine.notifyManagement("✅ Tarefa Aprovada", `O Gestor aprovou a tarefa "${data.title}".`, "success");
         router.push("/admin/jtbd");
      }

    } catch (error) {
      console.error(error);
      showToast("Erro de comunicação com o servidor.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-atelier-bg)]">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={40} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[var(--color-atelier-bg)] p-6 text-center">
        <p className="text-gray-500 mb-4">Tarefa não encontrada.</p>
        <button onClick={() => router.push("/admin/jtbd")} className="px-4 py-2 bg-black text-white rounded-lg">Voltar ao Cockpit</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-atelier-bg)] flex justify-center pb-20">
      <div className="w-full max-w-md p-4">
        <button onClick={() => router.push("/admin/jtbd")} className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 font-bold mb-6 mt-4 uppercase text-[10px] tracking-widest hover:text-black transition-colors">
          <ArrowLeft size={14} /> Voltar ao Cockpit
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-atelier-grafite)]/10 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h1 className="text-sm font-bold text-gray-800">Revisão de Tarefa</h1>
            <p className="text-[10px] text-gray-500 mt-1">Aplique feedback ou aprove a entrega.</p>
          </div>
          
          <div className="p-4">
            <TaskCard
              task={task}
              forceStaticMode={false}
              currentUser={currentUser}
              onUpdateStatus={handleTaskStatusUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
