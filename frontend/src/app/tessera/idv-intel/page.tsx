// src/app/tessera/idv-intel/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { dbSelect } from '@/lib/dbClient';
import { Target, Clock, Loader2, Sparkles, PieChart, Activity, FolderKanban, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from 'recharts';

export default function TesseraIDVIntelPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [idvProjects, setIdvProjects] = useState<any[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const projects = await dbSelect('projects', { service_type: 'Identidade Visual' });
      const terrs = await dbSelect('territory_evaluations', {});

      if (projects) setIdvProjects(projects);
      if (terrs) setTerritories(terrs);
    } catch (e) {
      console.error('Erro ao buscar métricas IDV do Neon:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={36} />
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
    { name: '1. Descobrir', count: phaseCounts.descobrir, color: '#C5A059' },
    { name: '2. Brand Lab', count: phaseCounts.brand_lab, color: '#D4AF37' },
    { name: '3. Direcionar', count: phaseCounts.direcionar, color: '#C86D51' },
    { name: '4. Construir', count: phaseCounts.construir, color: '#8B263E' },
    { name: '5. Revelar', count: phaseCounts.revelar, color: '#4A1220' },
    { name: '6. Ativar', count: phaseCounts.ativar, color: '#142C48' }
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
  const COLORS = ['#4A1220', '#C86D51', '#C5A059', '#142C48', '#8B263E', '#2D5A4C'];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
        <div>
          <span className="tess-eyebrow">Tessera Intelligence · Metodologia</span>
          <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mt-1">
            <Target className="w-6 h-6 text-[var(--tess-bordo)]" />
            <span>IDV Intel · Atelier Method</span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/65 mt-1">
            Métricas estratégicas de identidades visuais: funil de movimentos, adesão a territórios e status das marcas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="tess-card px-4 py-2 flex items-center gap-3 rounded-2xl">
            <FolderKanban size={18} className="text-[var(--color-atelier-terracota)]" />
            <div>
              <span className="block text-[9px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 font-bold">
                Total em Carteira
              </span>
              <span className="font-elegant text-xl text-[var(--color-atelier-grafite)] font-bold leading-none">
                {idvProjects.length} {idvProjects.length === 1 ? 'projeto' : 'projetos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Funil de Movimentos */}
        <div className="tess-card p-6 rounded-3xl flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <Activity className="text-[var(--color-atelier-terracota)]" size={18} />
              Distribuição por Movimentos
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">
              Pipeline IDV
            </span>
          </div>

          <div className="flex-1 w-full min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-atelier-grafite)', fontWeight: 600 }}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid rgba(20,44,72,0.1)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    background: 'var(--color-atelier-creme)',
                    color: 'var(--color-atelier-grafite)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Territórios Estratégicos */}
        <div className="tess-card p-6 rounded-3xl flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <PieChart className="text-[var(--color-atelier-terracota)]" size={18} />
              Padrões de Decisão (Territórios)
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">
              Preferências
            </span>
          </div>

          {pieData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(20,44,72,0.1)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                        background: 'var(--color-atelier-creme)',
                        color: 'var(--color-atelier-grafite)',
                        fontSize: '12px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-3 justify-center mt-2 pt-3 border-t border-[var(--color-atelier-grafite)]/10 w-full">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/80">
                      {entry.name} <strong className="text-[var(--color-atelier-grafite)]">({entry.value})</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--color-atelier-grafite)]/40 italic text-xs">
              Nenhum território foi finalizado pelos clientes no momento.
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Clientes IDV Ativos */}
      <div className="tess-card p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Status dos Clientes em Tempo Real</h3>
          <span className="text-xs text-[var(--color-atelier-grafite)]/50">
            {idvProjects.length} {idvProjects.length === 1 ? 'cliente monitorado' : 'clientes monitorados'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-atelier-grafite)]/10 text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
                <th className="py-3 pl-3">Cliente / Marca</th>
                <th className="py-3">Movimento Atual</th>
                <th className="py-3">Data Limite</th>
                <th className="py-3 text-right pr-3">Ação Crítica Recomendada</th>
              </tr>
            </thead>
            <tbody>
              {idvProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[var(--color-atelier-grafite)]/50">
                    Nenhum projeto de Identidade Visual ativo no momento.
                  </td>
                </tr>
              ) : (
                idvProjects.map(p => {
                  const phaseObj =
                    funnelData.find(f => f.name.toLowerCase().includes((p.idv_phase || 'descobrir').replace('_', ' '))) ||
                    funnelData[0];
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--color-atelier-grafite)]/5 hover:bg-[var(--color-atelier-grafite)]/[0.02] transition-colors"
                    >
                      <td className="py-3 pl-3 font-bold text-xs text-[var(--color-atelier-grafite)]">
                        {p.profiles?.nome || 'Desconhecido'}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/80">
                          {phaseObj.name}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-[var(--color-atelier-grafite)]/65">
                        {p.data_limite ? new Date(p.data_limite).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3 pr-3 text-right text-xs italic font-medium text-[var(--tess-bordo)]">
                        {p.idv_phase === 'descobrir'
                          ? 'Criar Brand Snapshot'
                          : p.idv_phase === 'direcionar'
                          ? 'Enviar Territórios'
                          : p.idv_phase === 'revelar'
                          ? 'Agendar Cerimônia'
                          : 'Acompanhar Execução'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
