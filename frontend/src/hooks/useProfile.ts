// src/hooks/useProfile.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useSession } from "./useSession";

export function useProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId, // Executa apenas se houver userId válido
    staleTime: 1000 * 60 * 10, // Perfil muda raramente, cache de 10 min
  });
}
