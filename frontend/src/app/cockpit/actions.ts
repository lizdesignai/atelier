"use server";

import { getDb } from '@/lib/db';

export async function fetchCockpitTasks(
  projectId: string, 
  clientId: string | undefined, 
  startRange: string, 
  endRange: string, 
  _timestamp: number,
  cycleId?: string
) {
  try {
    const sql = getDb();
    
    let baseQuery = `
      SELECT t.*, json_build_object('nome', p.nome, 'avatar_url', p.avatar_url) as profiles
      FROM tasks t
      LEFT JOIN profiles p ON t.assigned_to = p.id
      WHERE (
        ($5::text IS NOT NULL AND t.cycle_id::text = $5::text)
        OR (
          ($5::text IS NULL OR t.cycle_id IS NULL OR t.cycle_id::text = $5::text)
          AND (
            (t.deadline >= $1 AND t.deadline <= $2)
            OR (t.created_at >= $1 AND t.created_at <= $2)
            OR t.deadline IS NULL
          )
        )
      )
      AND t.status != 'archived'
      AND (t.is_adhoc IS NOT TRUE)
    `;
    const params: any[] = [startRange, endRange];

    if (projectId && clientId) {
      baseQuery += ` AND (t.project_id = $3 OR t.client_id = $4)`;
      params.push(projectId, clientId);
    } else if (projectId) {
      baseQuery += ` AND t.project_id = $3`;
      params.push(projectId);
    } else if (clientId) {
      baseQuery += ` AND t.client_id = $3`;
      params.push(clientId);
    }

    baseQuery += ` ORDER BY t.deadline ASC NULLS LAST`;

    const data = await (sql as any).query(baseQuery, [...params, cycleId || null]);
    
    return data || [];
  } catch (err) {
    console.error("Exception in server action:", err);
    return [];
  }
}

