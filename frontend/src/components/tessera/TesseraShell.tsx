// src/components/tessera/TesseraShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Inbox,
  FileCode,
  Users,
  Search,
  Plus,
  Loader2,
  Activity,
  Target
} from 'lucide-react';
import { CommandPaletteModal } from './CommandPaletteModal';
import { NewWorkItemModal } from './NewWorkItemModal';
import VeronnaSymbol from '../brand/VeronnaSymbol';

interface TesseraShellProps {
  children: React.ReactNode;
}

const ALLOWED_ROLES = ['admin', 'gestor'];

const NAV_ITEMS = [
  { label: 'Centro de Comando', path: '/tessera', icon: LayoutDashboard },
  { label: 'Meu Focus', path: '/tessera/focus', icon: CheckSquare },
  { label: 'Projetos & Carteira', path: '/tessera/projects', icon: FolderKanban },
  { label: 'Produtividade', path: '/tessera/productivity', icon: Activity },
  { label: 'IDV Intel', path: '/tessera/idv-intel', icon: Target },
  { label: 'Revisão & QA', path: '/tessera/reviews', icon: Inbox },
  { label: 'Capacidade', path: '/tessera/workload', icon: Users },
  { label: 'Templates', path: '/tessera/templates', icon: FileCode }
];

/**
 * Casca do Tessera.
 * O Tessera vive DENTRO do Atelier: a barra lateral/superior, o fundo ambiente,
 * a tipografia (Awesome / Analog / Roboto) e os temas Light | Dark | Veronna
 * vêm da shell global. Aqui entram apenas a marca, a navegação interna e as ações.
 */
export const TesseraShell: React.FC<TesseraShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [access, setAccess] = useState<'checking' | 'granted'>('checking');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Guarda de acesso: o Tessera é restrito a gestores e administradores
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data?.authenticated && ALLOWED_ROLES.includes(data.user?.role)) {
          setAccess('granted');
        } else if (data?.authenticated) {
          if (data.user?.role === 'colaborador') {
            router.replace('/admin/jtbd');
          } else {
            router.replace('/');
          }
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const isActive = (path: string) =>
    path === '/tessera' ? pathname === '/tessera' : pathname.startsWith(path);

  if (access === 'checking') {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="tess-scope relative z-10 flex flex-col h-full w-full max-w-[1500px] mx-auto font-roboto text-[var(--color-atelier-grafite)] px-4 pt-4 md:px-8 md:pt-6">
      {/* 1. Cabeçalho editorial: marca + ações */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-12 h-12 shrink-0 rounded-full tess-surface flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(20,44,72,0.25)] ring-1 ring-[var(--color-atelier-grafite)]/10">
            <div className="absolute inset-0 rounded-full bg-[var(--color-atelier-terracota)]/10 blur-md" />
            <VeronnaSymbol
              size={26}
              fillColor="var(--color-atelier-terracota)"
              className="relative z-10 drop-shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <span className="tess-eyebrow block truncate">Studio Veronna · Sistema Operacional</span>
            <h1 className="font-elegant text-3xl md:text-4xl leading-none mt-1 text-[var(--color-atelier-grafite)]">
              Tessera <span className="italic text-xl md:text-2xl align-middle text-[var(--tess-bordo)]">gestão &amp; criação</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center justify-between gap-3 w-64 px-4 py-2.5 rounded-full tess-surface ring-1 ring-[var(--color-atelier-grafite)]/10 text-xs text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)] hover:ring-[var(--color-atelier-grafite)]/25 transition-all"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              Busca universal
            </span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--color-atelier-grafite)]/[0.07] text-[10px] font-roboto tabular-nums">
              Ctrl K
            </kbd>
          </button>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-bold text-xs tracking-wide shadow-[0_10px_24px_-8px_var(--tess-accent)] transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Novo Item</span>
          </button>
        </div>
      </header>

      {/* 2. Navegação interna (pílula magnética, mesma física da sidebar do Atelier) */}
      <nav className="shrink-0 pb-6 -mx-1 px-1 overflow-x-auto custom-scrollbar">
        <div className="inline-flex items-center gap-1 p-1.5 rounded-full tess-surface ring-1 ring-[var(--color-atelier-grafite)]/10">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-[12px] whitespace-nowrap transition-colors duration-300 outline-none ${
                  active
                    ? 'text-[var(--tess-accent-text)] font-bold'
                    : 'text-[var(--color-atelier-grafite)]/60 font-medium hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="tessera-nav-pill"
                    className="absolute inset-0 rounded-full bg-[var(--color-atelier-creme)] shadow-[0_4px_16px_rgba(20,44,72,0.12)] ring-1 ring-[var(--color-atelier-grafite)]/10 -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 3. Conteúdo da rota */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-20">
        {children}
      </main>

      {/* Modais globais do Tessera */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
      />

      <NewWorkItemModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent('tessera:itemCreated'));
        }}
      />
    </div>
  );
};
