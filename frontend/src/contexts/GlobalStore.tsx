// src/contexts/GlobalStore.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useProfile } from "../hooks/useProfile";
import { useProjects } from "../hooks/useProjects";

export type TeamNavMode = "vertical" | "horizontal";
export type ThemeMode = "light" | "dark" | "veronna";

// 1. Tipagem Sênior da Memória
interface GlobalStoreContextType {
  userProfile: any | null;
  activeProjects: any[];
  isGlobalLoading: boolean;
  refreshGlobalData: () => Promise<void>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  navMode: TeamNavMode;
  setNavMode: (mode: TeamNavMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const GlobalStoreContext = createContext<GlobalStoreContextType | undefined>(undefined);

const updateFavicon = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  const isLight = mode === "light";
  const iconUrl = isLight ? "/images/Ativo 5.svg" : "/images/Ativo 2.svg";

  const dynamicFavicon = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
  if (dynamicFavicon) {
    dynamicFavicon.removeAttribute("media");
    dynamicFavicon.href = iconUrl;
  }

  const allIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  allIcons.forEach((el) => {
    el.removeAttribute("media");
    el.href = iconUrl;
  });
};

// 2. O Motor do Estado Global (Refatorado para React Query)
export function GlobalStoreProvider({ children }: { children: React.ReactNode }) {
  const { data: userProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
  const { data: activeProjects = [], isLoading: isProjectsLoading, refetch: refetchProjects } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [navMode, setNavModeState] = useState<TeamNavMode>("vertical");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Sincronização do NavMode
    const savedNav = localStorage.getItem("atelier_nav_mode");
    if (savedNav === "vertical" || savedNav === "horizontal") {
      setNavModeState(savedNav);
    }

    // Sincronização do Tema Visual Studio Veronna
    const savedTheme = (localStorage.getItem("veronna_theme") || localStorage.getItem("atelier_theme")) as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "veronna") {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
      document.documentElement.classList.remove("light", "dark", "theme-veronna");
      document.documentElement.classList.add(savedTheme === "veronna" ? "theme-veronna" : savedTheme);
      updateFavicon(savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      updateFavicon("light");
    }

    const handleNavModeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TeamNavMode>;
      if (customEvent.detail === "vertical" || customEvent.detail === "horizontal") {
        setNavModeState(customEvent.detail);
      }
    };

    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail === "light" || customEvent.detail === "dark" || customEvent.detail === "veronna") {
        setThemeState(customEvent.detail);
        updateFavicon(customEvent.detail);
      }
    };

    window.addEventListener("atelier_nav_mode_change", handleNavModeEvent);
    window.addEventListener("veronna_theme_change", handleThemeEvent);
    return () => {
      window.removeEventListener("atelier_nav_mode_change", handleNavModeEvent);
      window.removeEventListener("veronna_theme_change", handleThemeEvent);
    };
  }, []);

  const setNavMode = useCallback((mode: TeamNavMode) => {
    setNavModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("atelier_nav_mode", mode);
      window.dispatchEvent(new CustomEvent("atelier_nav_mode_change", { detail: mode }));
    }
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("veronna_theme", mode);
      localStorage.setItem("atelier_theme", mode);
      document.documentElement.setAttribute("data-theme", mode);
      document.documentElement.classList.remove("light", "dark", "theme-veronna");
      document.documentElement.classList.add(mode === "veronna" ? "theme-veronna" : mode);
      updateFavicon(mode);
      window.dispatchEvent(new CustomEvent("veronna_theme_change", { detail: mode }));
    }
  }, []);

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
    setActiveProjectId,
    navMode,
    setNavMode,
    theme,
    setTheme
  }), [userProfile, activeProjects, isGlobalLoading, activeProjectId, navMode, setNavMode, theme, setTheme]);

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