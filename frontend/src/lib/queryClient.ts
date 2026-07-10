// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos padrão para dados stale
      gcTime: 1000 * 60 * 30, // 30 minutos em memória (garbarge collection)
      refetchOnWindowFocus: false, // Não re-busca ao focar a aba/janela
      refetchOnReconnect: "always", // Tenta re-buscar ao restabelecer internet
      retry: 1, // Apenas 1 retry em caso de falha silenciosa
    },
  },
});
