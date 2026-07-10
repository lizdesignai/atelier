// src/hooks/useSession.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    staleTime: Infinity, // Sessão é estática enquanto o app estiver aberto
    gcTime: Infinity,
  });
}
