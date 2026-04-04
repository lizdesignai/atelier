// src/app/oraculo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  BrainCircuit, Flame, MousePointerClick, 
  TrendingUp, Loader2, ArrowRight, Activity, Crosshair
} from "lucide-react";

interface PostMetrics {
  id: string;
  image_url: string;
  caption: string;
  engagement_rate: number;
  link_clicks: number;
  saves: number;
}

export default function OraculoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState("Cliente");
  const [posts, setPosts] = useState<PostMetrics[]>([]);
  const [funnelData, setFunnelData] = useState({ totalEngagement: 0, totalClicks: 0, totalSaves: 0 });

  useEffect(() => {
    const fetchOracleData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.nome) setClientName(profile.nome.split(' ')[0]);

        // Busca posts aprovados/publicados para análise
        const { data: postsData, error } = await supabase
          .from('social_posts')
          .select('id, image_url, caption, engagement_rate, link_clicks, saves')
          .eq('client_id', session.user.id)
          .in('status', ['approved', 'published'])
          .order('engagement_rate', { ascending: false });

        if (error) throw error;

        const validPosts = postsData || [];
        setPosts(validPosts);

        // Agregação para o Funil de Vendas
        const agg = validPosts.reduce((acc, post) => ({
          totalEngagement: acc.totalEngagement + (post.engagement_rate || 0),
          totalClicks: acc.totalClicks + (post.link_clicks || 0),
          totalSaves: acc.totalSaves + (post.saves || 0)
        }), { totalEngagement: 0, totalClicks: 0, totalSaves: 0 });

        setFunnelData(agg);

      } catch (error) {
        console.error("Erro ao carregar o Oráculo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOracleData();
  }, []);

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  // Função que define a "Temperatura" visual do post baseada no engajamento (Adaptada para Fundo Claro)
  const getHeatmapStyle = (engagement: number) => {
    if (engagement >= 8) return "ring-4 ring-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.3)]"; // Fogo
    if (engagement >= 5) return "ring-2 ring-orange-300 shadow-[0_10px_20px_rgba(253,186,116,0.2)]"; // Quente
    return "ring-1 ring-white shadow-sm opacity-80"; // Frio
  };

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 md:px-0">
      <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-10 relative z-10">
        
        {/* CABEÇALHO DO ORÁCULO */}
        <header className="animate-[fadeInUp_0.5s_ease-out]">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
              Inteligência de Negócio
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            O Oráculo de <span className="text-[var(--color-atelier-terracota)] italic">Conversão.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-lg leading-relaxed">
            Esqueça as curtidas. Aqui analisamos o que realmente importa: retenção, intenção de compra e o comportamento do seu público perante a nossa Direção de Arte.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-[var(--color-atelier-grafite)]/5 rounded-[2.5rem] bg-white/40 shadow-sm glass-panel">
            <Activity size={48} className="text-[var(--color-atelier-terracota)] mb-4 opacity-50" />
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Calibrando Sensores</h2>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 max-w-md text-center">
              O Oráculo precisa que aprove as primeiras peças na sua Sala de Curadoria para começar a mapear o comportamento da sua audiência.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12 animate-[fadeInUp_0.6s_ease-out]">
            
            {/* 1. MÓDULO FUNIL DE VENDAS */}
            <section className="glass-panel border border-white bg-white/70 p-8 rounded-[2.5rem] shadow-[0_15px_40px_rgba(173,111,64,0.05)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl"></div>
              
              <div className="mb-8">
                <h2 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <Crosshair size={14} className="text-[var(--color-atelier-terracota)]" /> Funil de Intenção (Últimos 30 Dias)
                </h2>
              </div>

              <div className="flex flex-col md:flex-row gap-6 relative z-10">
                {/* Etapa 1: Retenção */}
                <div className="flex-1 bg-white/80 border border-[var(--color-atelier-grafite)]/5 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center group hover:border-[var(--color-atelier-terracota)]/30 transition-colors shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} className="text-[var(--color-atelier-grafite)]/60" />
                  </div>
                  <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-1">{funnelData.totalEngagement.toFixed(1)}%</span>
                  <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Taxa Média de Engajamento</span>
                </div>

                <div className="hidden md:flex items-center justify-center text-[var(--color-atelier-grafite)]/20"><ArrowRight size={24} /></div>

                {/* Etapa 2: Desejo (Salvamentos) */}
                <div className="flex-1 bg-white/80 border border-[var(--color-atelier-grafite)]/5 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center group hover:border-[var(--color-atelier-terracota)]/30 transition-colors shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Flame size={20} className="text-orange-500" />
                  </div>
                  <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-1">{funnelData.totalSaves}</span>
                  <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Intenções / Salvamentos</span>
                </div>

                <div className="hidden md:flex items-center justify-center text-[var(--color-atelier-grafite)]/20"><ArrowRight size={24} /></div>

                {/* Etapa 3: Ação (Cliques) */}
                <div className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/5 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center group hover:border-[var(--color-atelier-terracota)]/40 transition-colors relative overflow-hidden shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-atelier-terracota)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-12 h-12 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <MousePointerClick size={20} className="text-[var(--color-atelier-terracota)]" />
                  </div>
                  <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-1 relative z-10">{funnelData.totalClicks}</span>
                  <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] relative z-10">Acessos ao Site (Link Bio)</span>
                </div>
              </div>
            </section>

            {/* 2. MAPA DE CALOR (Heatmap) */}
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" /> Mapa de Calor do Conteúdo
                </h2>
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]"></div> Alta Conversão</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--color-atelier-grafite)]/20"></div> Baixa Retenção</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {posts.map((post) => (
                  <div key={post.id} className="flex flex-col gap-3 group">
                    <div className={`aspect-[4/5] rounded-[2rem] overflow-hidden bg-white relative transition-all duration-500 ${getHeatmapStyle(post.engagement_rate)}`}>
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      
                      {/* Overlay de Métricas do Card (Mantido escuro para legibilidade sobre fotos claras) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-[11px] font-bold flex items-center gap-1"><Activity size={12} className="text-orange-400"/> {post.engagement_rate}%</span>
                          <span className="text-white text-[11px] font-bold flex items-center gap-1"><MousePointerClick size={12} className="text-[#ad6f40]"/> {post.link_clicks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}