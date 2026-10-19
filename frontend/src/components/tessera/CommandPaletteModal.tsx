// src/components/tessera/CommandPaletteModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Inbox, 
  FileCode, 
  PlusCircle, 
  ExternalLink,
  AlertTriangle,
  X
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTaskModal?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenNewTaskModal
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = useMemo(() => [
    {
      id: 'cmd-center',
      title: 'Ir para Centro de Comando',
      category: 'Navegação',
      icon: LayoutDashboard,
      shortcut: 'G C',
      run: () => router.push('/tessera')
    },
    {
      id: 'focus',
      title: 'Ir para Meu Focus (Execução)',
      category: 'Navegação',
      icon: CheckSquare,
      shortcut: 'G F',
      run: () => router.push('/tessera/focus')
    },
    {
      id: 'projects',
      title: 'Ir para Projetos & Carteira',
      category: 'Navegação',
      icon: FolderKanban,
      shortcut: 'G P',
      run: () => router.push('/tessera/projects')
    },
    {
      id: 'reviews',
      title: 'Ir para Inbox de QA & Revisão',
      category: 'Navegação',
      icon: Inbox,
      shortcut: 'G R',
      run: () => router.push('/tessera/reviews')
    },
    {
      id: 'templates',
      title: 'Explorar Templates de Fluxo (IDV, Presença 2.0, Mapa)',
      category: 'Navegação',
      icon: FileCode,
      shortcut: 'G T',
      run: () => router.push('/tessera/templates')
    },
    {
      id: 'new-item',
      title: 'Criar Novo Item de Trabalho',
      category: 'Ações Rápidas',
      icon: PlusCircle,
      shortcut: 'C',
      run: () => {
        if (onOpenNewTaskModal) onOpenNewTaskModal();
      }
    },
    {
      id: 'blocked',
      title: 'Filtrar Itens Bloqueados',
      category: 'Ações Rápidas',
      icon: AlertTriangle,
      shortcut: 'B',
      run: () => router.push('/tessera?filter=blocked')
    },
    {
      id: 'back-atelier',
      title: 'Alternar para Interface Legada (Atelier Clássico)',
      category: 'Sistema',
      icon: ExternalLink,
      shortcut: 'Alt + A',
      run: () => router.push('/admin/jtbd')
    }
  ], [router, onOpenNewTaskModal]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].run();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl tess-solid rounded-[2rem]  overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Campo de Busca */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-atelier-grafite)]/12">
          <Search className="w-5 h-5 text-[var(--color-atelier-grafite)]/70" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Digite um comando, destino ou ação..."
            className="flex-1 bg-transparent text-sm text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]/85 hover:bg-[var(--color-atelier-grafite)]/[0.10] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Comandos */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-atelier-grafite)]/55">
              Nenhum comando correspondente encontrado.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition ${
                    isSelected ? 'bg-[var(--tess-accent)]/15 text-[var(--tess-accent-text)] font-medium' : 'text-[var(--color-atelier-grafite)]/85 hover:bg-[var(--color-atelier-grafite)]/[0.10]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/70'}`} />
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-atelier-grafite)]/55 uppercase tracking-[0.18em]">{item.category}</span>
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-atelier-grafite)]/[0.07] border border-[var(--color-atelier-grafite)]/20 text-[10px] text-[var(--color-atelier-grafite)]/70 font-roboto tabular-nums">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-4 py-2 bg-[var(--color-atelier-creme)]/60 border-t border-[var(--color-atelier-grafite)]/12 flex items-center justify-between text-[11px] text-[var(--color-atelier-grafite)]/55">
          <span>Navegue com <kbd className="font-roboto tabular-nums text-[var(--color-atelier-grafite)]/70">↑</kbd> <kbd className="font-roboto tabular-nums text-[var(--color-atelier-grafite)]/70">↓</kbd> e selecione com <kbd className="font-roboto tabular-nums text-[var(--color-atelier-grafite)]/70">Enter</kbd></span>
          <span>Tessera v1.0</span>
        </div>
      </div>
    </div>
  );
};
