import { useQuery } from "@tanstack/react-query";
import { getProjectsAction } from "../app/actions/projects";
import { useSession } from "./useSession";

export function useProjects() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getProjectsAction();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // Projetos mudam com mais frequência, cache de 2 min
  });
}
