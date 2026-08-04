"use server";

import { createClient } from '@supabase/supabase-js';

export async function fetchCockpitTasks(projectId: string, clientId: string | undefined, startRange: string, endRange: string, _timestamp: number) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials for server action");
      return [];
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*, profiles:assigned_to(nome, avatar_url), projects(id, client_id)')
      .gte('deadline', startRange)
      .lte('deadline', endRange)
      .order('deadline', { ascending: true });
      
    if (error) {
      console.error("Error fetching tasks in server action:", error);
      return [];
    }

    if (!data) return [];

    // Filtrar tarefas pertencentes ao projeto ou cliente, ou tarefas globais
    const filtered = data.filter((t: any) => {
      if (t.project_id && t.project_id === projectId) return true;
      if (t.client_id && clientId && t.client_id === clientId) return true;
      if (t.projects && clientId && t.projects.client_id === clientId) return true;
      // Se a tarefa não tem project_id nem client_id atrelado explicitamente, incluir também
      if (!t.project_id && !t.client_id) return true;
      return false;
    });
    
    return filtered;
  } catch (err) {
    console.error("Exception in server action:", err);
    return [];
  }
}
