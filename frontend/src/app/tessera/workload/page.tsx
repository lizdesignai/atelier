// src/app/tessera/workload/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Clock, Flame, Calendar, CheckCircle2, AlertTriangle, Briefcase, ArrowUpRight } from 'lucide-react';

export default function TesseraWorkloadPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Buscar membros e demandas da organização
    fetch('/api/jtbd/data')
      .then(res => res.json())
      .then(data => {
        setMembers(data.team || []);
        setTasks(data.tasks || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/12">
        <div>
          <span className="tess-eyebrow">Tessera Intelligence · Operações</span>
          <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3 mt-1">
            <Users className="w-6 h-6 text-[var(--tess-bordo)]" />
            <span>Capacidade &amp; Workload da Equipe</span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-1">
            Monitoramento de esforço ativo contra capacidade semanal (SLA de 6.0h/dia útil), evitando sobrecargas e desequilíbrios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="tess-card px-4 py-2 flex items-center gap-2 rounded-2xl text-xs">
            <Briefcase size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[var(--color-atelier-grafite)]/60 font-medium">Demandas Ativas:</span>
            <strong className="text-[var(--color-atelier-grafite)] font-bold">
              {tasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length}
            </strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--color-atelier-grafite)]/55">
            Carregando capacidade e distribuição de trabalho...
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--color-atelier-grafite)]/55">
            Nenhum membro ativo mapeado.
          </div>
        ) : (
          members.map(m => {
            const memberTasks = tasks.filter(
              t => t.assigned_to === m.id && t.status !== 'completed' && t.status !== 'archived'
            );
            const plannedMinutes = memberTasks.reduce(
              (acc, t) => acc + (t.estimated_minutes || t.estimated_time || 60),
              0
            );
            const plannedHours = (plannedMinutes / 60).toFixed(1);
            const capacityHours = Number(m.weekly_capacity_hours) || 30.0;
            const pct = Math.min(Math.round((plannedMinutes / (capacityHours * 60)) * 100), 100);

            const isOverloaded = pct >= 100;
            const isHigh = pct >= 75 && !isOverloaded;

            const reviewCount = memberTasks.filter(t => t.status === 'review').length;
            const inProgressCount = memberTasks.filter(t => t.status === 'pending' && t.started_at).length;

            return (
              <div key={m.id} className="p-5 tess-card space-y-4 rounded-3xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[var(--color-atelier-grafite)]/[0.07] border border-[var(--color-atelier-grafite)]/20 flex items-center justify-center font-medium text-xs text-[var(--color-atelier-grafite)] shrink-0 overflow-hidden shadow-xs">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          m.nome?.charAt(0) || 'C'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[var(--color-atelier-grafite)] truncate">{m.nome}</h3>
                        <p className="text-xs text-[var(--color-atelier-grafite)]/60 capitalize truncate">
                          {m.cargo || m.role}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                        isOverloaded
                          ? 'bg-rose-100 text-rose-700'
                          : isHigh
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOverloaded ? 'Sobrecarga' : isHigh ? 'Carga Alta' : 'Saudável'}
                    </span>
                  </div>

                  {/* Estatísticas Numéricas */}
                  <div className="space-y-2 pt-4 mt-3 border-t border-[var(--color-atelier-grafite)]/10 text-xs">
                    <div className="flex justify-between text-[var(--color-atelier-grafite)]/70">
                      <span>Capacidade Semanal:</span>
                      <strong className="text-[var(--color-atelier-grafite)] font-roboto tabular-nums">
                        {capacityHours.toFixed(1)}h
                      </strong>
                    </div>

                    <div className="flex justify-between text-[var(--color-atelier-grafite)]/70">
                      <span>Carga Alocada:</span>
                      <strong className="text-[var(--color-atelier-grafite)] font-roboto tabular-nums">
                        {plannedHours}h ({memberTasks.length} {memberTasks.length === 1 ? 'demanda' : 'demandas'})
                      </strong>
                    </div>

                    {reviewCount > 0 && (
                      <div className="flex justify-between text-amber-600 font-medium">
                        <span>Em Revisão QA:</span>
                        <strong className="font-roboto tabular-nums">{reviewCount}</strong>
                      </div>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mt-3 space-y-1">
                    <div className="w-full bg-[var(--color-atelier-grafite)]/[0.08] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverloaded
                            ? 'bg-rose-500'
                            : isHigh
                            ? 'bg-amber-500'
                            : 'bg-[var(--tess-bordo)]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--color-atelier-grafite)]/50 pt-0.5">
                      <span>Ocupação atual</span>
                      <span className="font-bold tabular-nums">{pct}%</span>
                    </div>
                  </div>
                </div>

                {/* Ação rápida para ver tarefas do membro no Quadro */}
                <Link
                  href={`/tessera/projects?owner_id=${m.id}`}
                  className="mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--color-atelier-grafite)]/[0.04] hover:bg-[var(--color-atelier-grafite)]/[0.08] text-[11px] font-bold text-[var(--color-atelier-grafite)]/75 hover:text-[var(--color-atelier-grafite)] transition-all"
                >
                  <span>Ver Demandas no Quadro</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
