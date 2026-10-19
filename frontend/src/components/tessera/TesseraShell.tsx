// src/components/tessera/TesseraShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Inbox, 
  FileCode, 
  Users, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Shield,
  LogOut,
  Building2,
  Sparkles
} from 'lucide-react';
import { CommandPaletteModal } from './CommandPaletteModal';
import { NewWorkItemModal } from './NewWorkItemModal';
import VeronnaSymbol from '../brand/VeronnaSymbol';

interface TesseraShellProps {
  children: React.ReactNode;
}

export const TesseraShell: React.FC<TesseraShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [userData, setUserData] = useState<{ name: string; email: string; role: string; avatar?: string } | null>(null);

  // Escuta global para atalho Ctrl+K ou Cmd+K
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

  // Carregar dados de sessão
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUserData({
            name: data.user.nome || 'Gestor',
            email: data.user.email,
            role: data.user.role || 'gestor',
            avatar: data.user.avatar_url
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'Centro de Comando', path: '/tessera', icon: LayoutDashboard },
    { label: 'Meu Focus', path: '/tessera/focus', icon: CheckSquare },
    { label: 'Projetos & Carteira', path: '/tessera/projects', icon: FolderKanban },
    { label: 'Inbox de QA & Revisão', path: '/tessera/reviews', icon: Inbox },
    { label: 'Templates de Fluxo', path: '/tessera/templates', icon: FileCode },
    { label: 'Capacidade & Workload', path: '/tessera/workload', icon: Users },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.replace('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-100 font-sans selection:bg-amber-600 selection:text-stone-950">
      {/* 1. Barra Lateral Esquerda (Sidebar) */}
      <aside 
        className={`flex flex-col border-r border-stone-800/80 bg-stone-950/95 transition-all duration-300 relative z-30 select-none ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Topo / Marca Tessera */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-stone-800/80">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2B0912] via-[#4A1220] to-[#1A050A] ring-1 ring-[#C5A059]/45 flex items-center justify-center text-[#E5C98B] shadow-md shadow-black/40">
                <VeronnaSymbol size={18} fillColor="#E5C98B" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-[0.14em] text-stone-100">TESSERA</span>
                <span className="text-[10px] text-[#E5C98B] font-mono ml-1.5 px-1.5 py-0.2 rounded bg-[#4A1220]/50 border border-[#C5A059]/30">v1.0</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto w-8 h-8 rounded-xl bg-gradient-to-br from-[#2B0912] via-[#4A1220] to-[#1A050A] ring-1 ring-[#C5A059]/45 flex items-center justify-center text-[#E5C98B]">
              <VeronnaSymbol size={18} fillColor="#E5C98B" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-900 transition"
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Itens de Navegação Principal */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/tessera' && pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
                  isActive
                    ? 'bg-amber-600/15 text-amber-300 border border-amber-800/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/80'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-400 group-hover:text-stone-200'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-stone-800/80 space-y-2">
          {/* Alternador de Retorno ao Atelier Legado */}
          <button
            onClick={() => router.push('/admin/jtbd')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition border border-stone-800/60 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Alternar para Atelier Clássico"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
            {!isCollapsed && <span className="truncate">Atelier Clássico</span>}
          </button>

          {/* Perfil & Logout */}
          <div className={`flex items-center justify-between pt-1 ${isCollapsed ? 'flex-col gap-2' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-medium text-stone-300 shrink-0">
                {userData?.avatar ? (
                  <img src={userData.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  userData?.name?.charAt(0) || 'U'
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-200 truncate">{userData?.name || 'Carregando...'}</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider truncate">{userData?.role || 'Colaborador'}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-900 transition"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Conteúdo Central + Topbar */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar Persistente */}
        <header className="h-14 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
          {/* Seletor de Organização / Workspace */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-stone-300">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-stone-200">Studio Veronna</span>
              <span className="text-[10px] text-stone-500 font-mono">/ Operação Principal</span>
            </div>
          </div>

          {/* Busca Universal & Ações Rápidas */}
          <div className="flex items-center gap-3">
            {/* Gatilho do Command Palette */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 text-xs text-stone-400 hover:text-stone-200 transition shadow-sm w-64 justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-stone-500" />
                <span>Busca universal...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] text-stone-400 font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Botão + Criar Item de Trabalho */}
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-xs shadow-md shadow-amber-950/40 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Item</span>
            </button>
          </div>
        </header>

        {/* Área de Conteúdo Renderizada */}
        <main className="flex-1 overflow-y-auto bg-stone-950 p-6 custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Modais Globais do Tessera */}
      <CommandPaletteModal 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
      />

      <NewWorkItemModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreated={() => {
          // Dispara evento para telas recarregarem dados
          window.dispatchEvent(new CustomEvent('tessera:itemCreated'));
        }}
      />
    </div>
  );
};
