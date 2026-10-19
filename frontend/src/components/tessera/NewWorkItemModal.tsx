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
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl tess-solid rounded-[2rem]  overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-atelier-grafite)]/12 bg-[var(--color-atelier-creme)]/40">
          <div>
            <h3 className="text-base font-medium text-[var(--color-atelier-grafite)]">Criar Novo Item de Trabalho (Work Item)</h3>
            <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-0.5">Entrada canônica no fluxo operacional com critérios e responsável explícito</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]/85 hover:bg-[var(--color-atelier-grafite)]/[0.10] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[var(--tess-danger)]/10 border border-[var(--tess-danger)]/30 text-xs text-[var(--tess-danger)]">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">
              Título da Demanda <span className="text-[var(--tess-danger)]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Desenvolver Exploração Tipográfica e Paleta de Cores"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-sm text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 focus:outline-none focus:border-[var(--tess-accent)] transition"
            />
          </div>

          {/* Grid: Tipo, Prioridade e Estimativa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Tipo de Item</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as WorkItemType)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
              >
                <option value="task">Tarefa Operacional</option>
                <option value="deliverable">Entregável / Peça</option>
                <option value="gate">Portão de Decisão (Gate)</option>
                <option value="initiative">Iniciativa Interna</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as WorkItemPriority)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente (Crítica)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Estimativa (Minutos)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimateMinutes}
                onChange={e => setEstimateMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
              />
            </div>
          </div>

          {/* Grid: Responsável e Projeto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Responsável Primário</label>
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
              >
                <option value="">Não atribuído (Entrar na Inbox)</option>
                {memberList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Projeto / Cliente</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
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
            <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">Prazo Prometido (Due Date)</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--tess-accent)]"
            />
          </div>

          {/* Critérios de Aceite (Definition of Done) */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1.5">
              Critérios de Aceite (Definition of Done)
            </label>
            <textarea
              rows={2}
              value={acceptanceCriteria}
              onChange={e => setAcceptanceCriteria(e.target.value)}
              placeholder="Ex: Exportar em PNG 2x e SVG, incluir paleta HEX e guia tipográfico em PDF."
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 focus:outline-none focus:border-[var(--tess-accent)]"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-[var(--color-atelier-grafite)]/12 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)]/[0.10] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-medium text-xs shadow-lg shadow-[var(--tess-accent)]/20 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Item de Trabalho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
