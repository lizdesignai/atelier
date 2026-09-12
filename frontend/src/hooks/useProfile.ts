// src/hooks/useProfile.ts
// Hook de perfil — deriva dados do useSession (sem chamada extra ao Supabase).

import { useSession } from "./useSession";

export function useProfile() {
  const { data: session, isLoading, refetch, error } = useSession();

  // Extrair o perfil diretamente da sessão (o /api/auth/me já retorna tudo)
  const profile = session?.user || null;

  return {
    data: profile,
    isLoading,
    refetch,
    error,
  };
}
