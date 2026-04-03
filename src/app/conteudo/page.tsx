// src/app/conteudo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  Instagram, PlayCircle, Image as ImageIcon, Sparkles, Loader2
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ConteudoPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({ planeados: 0, pendentes: 0, aprovados: 0 });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Busca posts reais do cliente ordenados por data de agendamento
        const { data, error } = await supabase
          .from('social_posts')
          .select('*')
          .eq('client_id', session.user.id)
          .order('scheduled_date', { ascending: true });

        if (error) throw error;

        if (data) {
          setPosts(data);
          
          // Calcula métricas dinamicamente
          setMetrics({
            planeados: data.length,
            pendentes: data.filter(p => p.status === 'pending_approval').length,
            aprovados: data.filter(p => p.status === 'approved' || p.status === 'published').length
          });
        }
      } catch (error) {
        console.error("Erro ao carregar conteúdo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'approved': return <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-green-600"><CheckCircle2 size={14}/> Aprovado</div>;
      case 'published': return <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]"><Sparkles size={14}/> Publicado</div>;
      case 'pending_approval': return <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-orange-500"><AlertCircle size={14}/> Requer Aprovação</div>;
      case 'changes_requested': return <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-red-500"><AlertCircle size={14}/> Em Revisão</div>;
      default: return <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50"><Clock size={14}/> Em Produção</div>;
    }
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  return (
    <div className="flex flex-col max-w-[1200px] mx-auto w-full gap-8">
      
      <header className="animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-center gap-2 mb-3">
          <Instagram size={16} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title">Gestão de Redes Sociais</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight">
            Plano de <span className="text-[var(--color-atelier-terracota)] italic">Conteúdo.</span>
          </h1>
          <div className="glass-panel px-6 py-3 flex items-center gap-3 w-fit">
            <Calendar size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto font-bold text-[13px] uppercase tracking-widest text-[var(--color-atelier-grafite)]">Timeline Oficial</span>
          </div>
        </div>
      </header>

      {/* METRICAS REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><Clock size={20} /></div>
          <div>
            <span className="block font-elegant text-3xl text-[var(--color-atelier-grafite)]">{metrics.planeados}</span>
            <span className="micro-title">Posts no Sistema</span>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4 border-[var(--color-atelier-terracota)]/30">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center"><AlertCircle size={20} /></div>
          <div>
            <span className="block font-elegant text-3xl text-[var(--color-atelier-terracota)]">{metrics.pendentes}</span>
            <span className="micro-title">Aguardando Avaliação</span>
          </div>
        </div>
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle2 size={20} /></div>
          <div>
            <span className="block font-elegant text-3xl text-[var(--color-atelier-grafite)]">{metrics.aprovados}</span>
            <span className="micro-title">Aprovados & Agendados</span>
          </div>
        </div>
      </div>

      {/* GRID DE POSTS REAIS */}
      <div className="glass-panel p-8 flex flex-col gap-6 animate-[fadeInUp_0.7s_ease-out]">
        <h3 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          Visão Geral do Cronograma
        </h3>
        
        {posts.length === 0 ? (
           <div className="py-12 flex flex-col items-center justify-center opacity-50 text-center">
             <Calendar size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
             <h2 className="font-elegant text-2xl">O estúdio está a preparar o seu conteúdo.</h2>
             <p className="font-roboto text-[13px] mt-2">Assim que a equipa lançar o planeamento, ele aparecerá aqui.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                key={post.id} 
                className="bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/10 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] px-3 py-1 rounded-md font-roboto font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                    {post.post_type === 'reels' ? <PlayCircle size={12}/> : <ImageIcon size={12}/>}
                    {post.post_type}
                  </span>
                  <span className="font-roboto font-bold text-[11px] text-[var(--color-atelier-terracota)] uppercase tracking-widest">
                    {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString('pt-PT', {day: '2-digit', month: 'short'}) : 'Sem Data'}
                  </span>
                </div>
                
                <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-tight mb-2">{post.title}</h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 line-clamp-3 mb-6 flex-1 whitespace-pre-wrap">{post.caption}</p>
                
                <div className="mt-auto pt-4 border-t border-[var(--color-atelier-grafite)]/5">
                  {getStatusDisplay(post.status)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}