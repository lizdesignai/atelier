// src/app/tessera/templates/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FileCode, CheckCircle, Shield, ArrowRight, Layers, Clock, AlertCircle } from 'lucide-react';
import { TesseraWorkflowTemplate } from '@/lib/tessera/types';

export default function TesseraTemplatesPage() {
  const [templates, setTemplates] = useState<TesseraWorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TesseraWorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tessera/templates')
      .then(res => res.json())
      .then(data => {
        const tpls = data.templates || [];
        setTemplates(tpls);
        if (tpls.length > 0) setSelectedTemplate(tpls[0]);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="pb-4 border-b border-stone-800/80">
        <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2.5">
          <FileCode className="w-5 h-5 text-amber-500" />
          <span>Templates de Workflow Versionados</span>
          <span className="text-xs font-mono font-normal text-stone-400 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800">
            v1.0 Canon
          </span>
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Processos e regras declarados como modelos formais, eliminando constantes fixas espalhadas no código.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-stone-500">Carregando catálogo de templates...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Lista de Templates */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Templates Publicados ({templates.length})
            </h2>

            <div className="space-y-2">
              {templates.map(tpl => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full text-left p-4 rounded-2xl border transition ${
                      isSelected 
                        ? 'bg-amber-600/15 border-amber-800/60 shadow-lg shadow-amber-950/30' 
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                        {tpl.service_type}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                        v{tpl.version}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-stone-100 mt-1">{tpl.name}</h3>
                    <p className="text-xs text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-stone-500">
                      <span>{tpl.stages_definition?.length || 0} Fases</span>
                      <span>•</span>
                      <span>{tpl.gates_definition?.length || 0} Gates</span>
                      <span>•</span>
                      <span>{tpl.tasks_definition?.length || 0} Tarefas Base</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna 2 e 3: Detalhe do Template Selecionado */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTemplate && (
              <div className="p-6 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-amber-400 font-semibold">
                      {selectedTemplate.slug} • v{selectedTemplate.version}
                    </span>
                    <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Publicado & Ativo
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-100 mt-1">{selectedTemplate.name}</h2>
                  <p className="text-xs text-stone-300 mt-2 leading-relaxed">{selectedTemplate.description}</p>
                </div>

                {/* Fases Técnicas / Movimentos */}
                <div className="space-y-3 pt-4 border-t border-stone-800/80">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>Fases Técnicas & Movimentos Externos ({selectedTemplate.stages_definition?.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTemplate.stages_definition?.map((stage, idx) => (
                      <div key={stage.id} className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-stone-200">{stage.label}</p>
                          {stage.hint && <p className="text-[11px] text-stone-500 mt-0.5">{stage.hint}</p>}
                          {stage.externalMovement && (
                            <p className="text-[10px] font-mono text-amber-400 mt-1">
                              Portal: {stage.externalMovement}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gates Formais de Decisão */}
                <div className="space-y-3 pt-4 border-t border-stone-800/80">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>Stage-Gates de Aprovação Obrigatória ({selectedTemplate.gates_definition?.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedTemplate.gates_definition?.map((gate) => (
                      <div key={gate.id} className="p-3 rounded-xl bg-purple-950/15 border border-purple-900/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-purple-200">{gate.title}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Fase: <span className="font-mono text-stone-300">{gate.stage}</span> • Aprovador:{' '}
                            <span className="font-medium text-purple-300 capitalize">{gate.approver}</span>
                          </p>
                        </div>
                        {gate.slaHours && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/40">
                            Janela: {gate.slaHours}h
                          </span>
                        )}
                        {gate.slaBusinessDays && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/40">
                            SLA: {gate.slaBusinessDays} dias úteis
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tarefas Base Instanciadas */}
                <div className="space-y-3 pt-4 border-t border-stone-800/80">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Esteira de Tarefas Predefinidas ({selectedTemplate.tasks_definition?.length})</span>
                  </h3>
                  <div className="divide-y divide-stone-800/60 max-h-60 overflow-y-auto custom-scrollbar">
                    {selectedTemplate.tasks_definition?.map((t, i) => (
                      <div key={i} className="py-2.5 px-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-stone-500 font-mono text-[10px]">#{i + 1}</span>
                          <span className="font-medium text-stone-200 truncate">{t.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-800 text-stone-400">
                            {t.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-[11px] text-stone-400">
                          {t.dayOffset !== undefined && <span>D+{t.dayOffset}</span>}
                          <span>{t.estimateMinutes}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
