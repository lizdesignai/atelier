// src/hooks/useDynamicTitle.ts
"use client";

import { useEffect } from "react";

interface UseDynamicTitleProps {
  projectName?: string;
  tabName?: string;
  baseTitle?: string;
}

export function useDynamicTitle({ projectName, tabName, baseTitle = "Liz Design" }: UseDynamicTitleProps) {
  useEffect(() => {
    // Array que guardará as partes do título
    const titleParts = [];

    // 1. Adiciona o Nome do Projeto (ou o nome base da plataforma se não houver projeto)
    if (projectName) {
      titleParts.push(projectName);
    } else {
      titleParts.push(baseTitle);
    }

    // 2. Adiciona o Nome da Aba (se estiver definida)
    if (tabName) {
      titleParts.push(tabName);
    }

    // Monta o título final unindo as partes com " | "
    document.title = titleParts.join(" | ");

    // Cleanup: Quando o usuário sair da página, volta ao padrão
    return () => {
      document.title = baseTitle;
    };
  }, [projectName, tabName, baseTitle]);
}