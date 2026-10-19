// src/app/tessera/workload/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, Flame, Calendar, CheckCircle2 } from 'lucide-react';

export default function TesseraWorkloadPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Buscar membros e capacidade da organização
    fetch('/api/jtbd/data')
      .then(res => res.json())
      .then(data => {
        const team = data.team || [];
        setMembers(team);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/12">
        <div>
          <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--tess-accent-text)]" />
            <span>Capacidade & Workload da Equipe</span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-1">
            Planejamento de esforço atribuído contra horas possíveis (SLA de 6.0h/dia útil) evitando sobrecarga e gargalos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--color-atelier-grafite)]/55">
            Carregando capacidade da equipe...
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--color-atelier-grafite)]/55">
            Nenhum membro ativo mapeado.
          </div>
        ) : (
          members.map(m => (
            <div key={m.id} className="p-5 tess-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-grafite)]/[0.07] border border-[var(--color-atelier-grafite)]/20 flex items-center justify-center font-medium text-xs text-[var(--color-atelier-grafite)]/85">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    m.nome?.charAt(0) || 'C'
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-atelier-grafite)]">{m.nome}</h3>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/70">{m.cargo || m.role}</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[var(--color-atelier-grafite)]/12 text-xs">
                <div className="flex justify-between text-[var(--color-atelier-grafite)]/70">
                  <span>Capacidade Semanal:</span>
                  <strong className="text-[var(--color-atelier-grafite)] font-roboto tabular-nums">30.0h (6h/dia)</strong>
                </div>
                <div className="flex justify-between text-[var(--color-atelier-grafite)]/70">
                  <span>Status Atual:</span>
                  <span className="text-[var(--tess-success)] font-medium">Disponível</span>
                </div>
              </div>

              <div className="w-full bg-[var(--color-atelier-grafite)]/[0.07] h-2 rounded-full overflow-hidden">
                <div className="bg-[var(--tess-accent)] h-full w-[45%]" />
              </div>
              <p className="text-[11px] text-[var(--color-atelier-grafite)]/55 text-right">Ocupação planejada: 45% (Carga saudável)</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
