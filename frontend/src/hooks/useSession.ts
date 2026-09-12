// src/hooks/useSession.ts
// Hook de sessão — busca dados do usuário autenticado via cookie JWT.
// Substitui o antigo supabase.auth.getSession().

import { useQuery } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  nome: string | null;
  avatar_url: string | null;
  empresa: string | null;
  cargo: string | null;
  mfa_enabled: boolean;
  current_status?: string;
  instagram?: string;
  skills?: any;
  cover_url?: string;
  nif?: string;
  endereco?: string;
  created_at?: string;
}

interface SessionData {
  user: SessionUser;
}

export function useSession() {
  return useQuery<SessionData | null>({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Envia cookies
      });

      if (!response.ok) {
        // Sessão inválida ou expirada
        return null;
      }

      const data = await response.json();
      return data as SessionData;
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
    gcTime: 1000 * 60 * 10,
    retry: false, // Não tentar novamente em caso de 401
  });
}
