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

    let query = supabaseAdmin
      .from('tasks')
      .select('*, profiles:assigned_to(nome, avatar_url)')
      .or(`and(deadline.gte.${startRange},deadline.lte.${endRange}),and(created_at.gte.${startRange},created_at.lte.${endRange}),deadline.is.null`)
      .not('status', 'eq', 'archived')
      .order('deadline', { ascending: true, nullsFirst: false });

    if (projectId && clientId) {
      query = query.or(`project_id.eq.${projectId},client_id.eq.${clientId}`);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
      
    if (error) {
      console.error("Error fetching tasks in server action:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception in server action:", err);
    return [];
  }
}
