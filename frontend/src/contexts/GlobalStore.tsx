// src/contexts/GlobalStore.tsx
"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { useProfile } from "../hooks/useProfile";
import { useProjects } from "../hooks/useProjects";

// 1. Tipagem Sênior da Memória
interface GlobalStoreContextType {
  userProfile: any | null;
  activeProjects: any[];
  isGlobalLoading: boolean;
  refreshGlobalData: () => Promise<void>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const GlobalStoreContext = createContext<GlobalStoreContextType | undefined>(undefined);

// 2. O Motor do Estado Global (Refatorado para React Query)
export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  const { data: userProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
  const { data: activeProjects = [], isLoading: isProjectsLoading, refetch: refetchProjects } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const isGlobalLoading = isProfileLoading || isProjectsLoading;

  const refreshGlobalData = async () => {
    await Promise.all([refetchProfile(), refetchProjects()]);
  };

  // Memoização do valor para evitar re-renders desnecessários de todos os consumidores
  const contextValue = useMemo(() => ({
    userProfile,
    activeProjects,
    isGlobalLoading,
    refreshGlobalData,
    activeProjectId,
    setActiveProjectId
  }), [userProfile, activeProjects, isGlobalLoading, activeProjectId]);

  return (
    <GlobalStoreContext.Provider value={contextValue}>
      {children}
    </GlobalStoreContext.Provider>
  );
}

// 3. Hook de Acesso Rápido
export function useGlobalStore() {
  const context = useContext(GlobalStoreContext);
  if (context === undefined) {
    throw new Error("Erro de Arquitetura: useGlobalStore deve ser instanciado dentro do GlobalStoreProvider.");
  }
  return context;
}