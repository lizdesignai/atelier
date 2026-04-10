// src/contexts/GlobalStore.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// 1. Tipagem Sênior da Memória
interface GlobalStoreContextType {
  userProfile: any | null;
  activeProjects: any[];
  isGlobalLoading: boolean;
  refreshGlobalData: () => Promise<void>; // Para forçar uma atualização silenciosa quando alteramos algo
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const GlobalStoreContext = createContext<GlobalStoreContextType | undefined>(undefined);

// 2. O Motor do Estado Global
export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // 🟢 CORREÇÃO: Criação do estado que faltava no Provider
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // A Lógica de Fetching Paralelo e Definitivo
  const fetchGlobalData = async () => {
    setIsGlobalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsGlobalLoading(false);
        return;
      }

      // Disparamos as requisições base do sistema ao mesmo tempo (Sem efeito Cascata)
      const profilePromise = supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const projectsPromise = supabase
        .from('projects')
        .select('*, profiles(nome, avatar_url, empresa)')
        .in('status', ['active', 'delivered', 'archived'])
        .order('created_at', { ascending: false });

      // O await aguarda que a mais lenta termine, mas rodam em paralelo
      const [ { data: profileData }, { data: projectsData } ] = await Promise.all([profilePromise, projectsPromise]);

      if (profileData) setUserProfile(profileData);
      if (projectsData) setActiveProjects(projectsData);

    } catch (error) {
      console.error("[Global Store] Falha Crítica de Sincronização:", error);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // Carrega os dados assim que o sistema é montado
  useEffect(() => {
    fetchGlobalData();
  }, []);

  return (
    // 🟢 CORREÇÃO: Exportação do activeProjectId e setActiveProjectId no value do Provider
    <GlobalStoreContext.Provider value={{ 
      userProfile, 
      activeProjects, 
      isGlobalLoading, 
      refreshGlobalData: fetchGlobalData,
      activeProjectId,
      setActiveProjectId
    }}>
      {children}
    </GlobalStoreContext.Provider>
  );
}

// 3. Hook de Acesso Rápido (O conector que as nossas abas vão usar)
export function useGlobalStore() {
  const context = useContext(GlobalStoreContext);
  if (context === undefined) {
    throw new Error("Erro de Arquitetura: useGlobalStore deve ser instanciado dentro do GlobalStoreProvider.");
  }
  return context;
}