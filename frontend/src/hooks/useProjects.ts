// src/hooks/useProjects.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useSession } from "./useSession";

export function useProjects() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*, profiles(nome, avatar_url, empresa)")
        .in("status", ["active", "delivered", "archived"])
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // Projetos mudam com mais frequência, cache de 2 min
  });
}
