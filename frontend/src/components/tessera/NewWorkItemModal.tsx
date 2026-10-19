// src/components/tessera/NewWorkItemModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, User, Flag, Folder, FileText } from 'lucide-react';
import { WorkItemPriority, WorkItemType } from '@/lib/tessera/types';

interface NewWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  projects?: Array<{ id: string; title: string }>;
  members?: Array<{ id: string; name: string; avatar?: string }>;
}

export const NewWorkItemModal: React.FC<NewWorkItemModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  projects = [],
  members = []
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkItemType>('task');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [estimateMinutes, setEstimateMinutes] = useState(60);
  const [ownerId, setOwnerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedMembers, setFetchedMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [fetchedProjects, setFetchedProjects] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (members.length > 0 && projects.length > 0) return;
    fetch('/api/tessera/work-items?view=board&limit=1')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.members) setFetchedMembers(data.members);
        if (data?.projects) setFetchedProjects(data.projects);
      })
      .catch(() => {});
  }, [isOpen, members.length, projects.length]);

  const memberList = members.length > 0 ? members : fetchedMembers;
  const projectList = projects.length > 0 ? projects : fetchedProjects;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe um título descritivo para a demanda.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/tessera/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          priority,
          estimate_minutes: Number(estimateMinutes),
          owner_id: ownerId || undefined,
          project_id: projectId || undefined,
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          acceptance_criteria: acceptanceCriteria.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar item de trabalho.');
      }

      setTitle('');
      setDescription('');
      setAcceptanceCriteria('');
      onClose();
      if (onCreated) onCreated();
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/40">
          <div>
            <h3 className="text-base font-medium text-stone-100">Criar Novo Item de Trabalho (Work Item)</h3>
            <p className="text-xs text-stone-400 mt-0.5">Entrada canônica no fluxo operacional com critérios e responsável explícito</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Título da Demanda <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Desenvolver Exploração Tipográfica e Paleta de Cores"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-600 transition"
            />
          </div>

          {/* Grid: Tipo, Prioridade e Estimativa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Tipo de Item</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as WorkItemType)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
              >
                <option value="task">Tarefa Operacional</option>
                <option value="deliverable">Entregável / Peça</option>
                <option value="gate">Portão de Decisão (Gate)</option>
                <option value="initiative">Iniciativa Interna</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as WorkItemPriority)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente (Crítica)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Estimativa (Minutos)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimateMinutes}
                onChange={e => setEstimateMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Grid: Responsável e Projeto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Responsável Primário</label>
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
              >
                <option value="">Não atribuído (Entrar na Inbox)</option>
                {memberList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Projeto / Cliente</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
              >
                <option value="">Demanda Geral / Sem Projeto</option>
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">Prazo Prometido (Due Date)</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Critérios de Aceite (Definition of Done) */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Critérios de Aceite (Definition of Done)
            </label>
            <textarea
              rows={2}
              value={acceptanceCriteria}
              onChange={e => setAcceptanceCriteria(e.target.value)}
              placeholder="Ex: Exportar em PNG 2x e SVG, incluir paleta HEX e guia tipográfico em PDF."
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-xs shadow-lg shadow-amber-900/30 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Item de Trabalho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
