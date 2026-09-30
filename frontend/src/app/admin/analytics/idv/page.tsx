"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Target, Clock, ArrowRight, Loader2, Sparkles, Map, Hammer, Presentation, Rocket, PieChart, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from 'recharts';

export default function IDVMetricsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [idvProjects, setIdvProjects] = useState<any[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('*, profiles(nome)')
      .eq('service_type', 'Identidade Visual');

    const { data: terrs } = await supabase
      .from('territory_evaluations')
      .select('*');

    if (projects) setIdvProjects(projects);
    if (terrs) setTerritories(terrs);
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={40} />
      </div>
    );
  }

  // 1. Contagem de Projetos por Fase
  const phaseCounts = { descobrir: 0, brand_lab: 0, direcionar: 0, construir: 0, revelar: 0, ativar: 0 };
  idvProjects.forEach(p => {
    const phase = p.idv_phase || 'descobrir';
    if (phase in phaseCounts) phaseCounts[phase as keyof typeof phaseCounts]++;
  });

  const funnelData = [
    { name: '1. Descobrir', count: phaseCounts.descobrir, color: '#f3f4f6' },
    { name: '2. Brand Lab', count: phaseCounts.brand_lab, color: '#e5e7eb' },
    { name: '3. Direcionar', count: phaseCounts.direcionar, color: '#d1d5db' },
    { name: '4. Construir', count: phaseCounts.construir, color: '#9ca3af' },
    { name: '5. Revelar', count: phaseCounts.revelar, color: '#6b7280' },
    { name: '6. Ativar', count: phaseCounts.ativar, color: '#ad6f40' }
  ];

  // 2. Territórios Escolhidos
  const evaluatedTerritories = territories.filter(t => t.status === 'evaluated' && t.chosen_territory_id);
  const territoryDistribution = evaluatedTerritories.reduce((acc, curr) => {
    const tName = curr.territories?.find((t: any) => t.id === curr.chosen_territory_id)?.name || 'Desconhecido';
    acc[tName] = (acc[tName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(territoryDistribution).map(k => ({
    name: k,
    value: territoryDistribution[k]
  }));
  const COLORS = ['#ad6f40', '#374151', '#9ca3af', '#e5e7eb'];

  return (
    <div className="p-10 max-w-7xl mx-auto flex flex-col gap-8 text-[var(--color-atelier-grafite)]">
      
      <header className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-6">
        <div>
          <h1 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-2 flex items-center gap-4">
            <Activity className="text-[var(--color-atelier-terracota)]" size={36} />
            IDV Intelligence
          </h1>
          <p className="font-roboto text-sm uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 font-bold">
            Métricas Globais do Atelier Method (Identidade Visual)
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-[1rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center">
          <span className="block font-roboto text-[10px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 font-bold mb-1">Total de Projetos</span>
          <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{idvProjects.length}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Gráfico 1: Funil de Movimentos */}
        <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm flex flex-col">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 flex items-center gap-2">
            <Target className="text-[var(--color-atelier-terracota)]" size={20} />
            Distribuição por Movimentos
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 'bold' }} width={100} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={32}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Territórios Estratégicos */}
        <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm flex flex-col">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 flex items-center gap-2">
            <PieChart className="text-[var(--color-atelier-terracota)]" size={20} />
            Padrões de Decisão (Territórios)
          </h3>
          {pieData.length > 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[300px] text-[var(--color-atelier-grafite)]/40 italic text-sm">
              Nenhum território foi decidido ainda pelos clientes.
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 justify-center mt-4 border-t border-[var(--color-atelier-grafite)]/5 pt-6">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="font-roboto text-[11px] uppercase tracking-widest font-bold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tabela de Clientes IDV Ativos */}
      <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6">Status dos Clientes (Live)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-atelier-grafite)]/10 text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
                <th className="py-4 pl-4">Cliente</th>
                <th className="py-4">Movimento Atual</th>
                <th className="py-4">Data Limite</th>
                <th className="py-4 text-right pr-4">Ação Pendente</th>
              </tr>
            </thead>
            <tbody>
              {idvProjects.map(p => {
                const phaseObj = funnelData.find(f => f.name.toLowerCase().includes((p.idv_phase || 'descobrir').replace('_', ' '))) || funnelData[0];
                return (
                  <tr key={p.id} className="border-b border-[var(--color-atelier-grafite)]/5 hover:bg-white transition-colors">
                    <td className="py-4 pl-4 font-bold text-[14px]">{p.profiles?.nome || 'Desconhecido'}</td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-[var(--color-atelier-grafite)]/5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {phaseObj.name}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-[11px] text-[var(--color-atelier-grafite)]/60">
                      {p.data_limite ? new Date(p.data_limite).toLocaleDateString('pt-BR') : '--'}
                    </td>
                    <td className="py-4 pr-4 text-right text-[11px] italic text-[var(--color-atelier-terracota)]">
                      {p.idv_phase === 'descobrir' ? 'Criar Brand Snapshot' : 
                       p.idv_phase === 'direcionar' ? 'Enviar Territórios' : 
                       p.idv_phase === 'revelar' ? 'Agendar Cerimônia' : 'Atuar na Operação'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
