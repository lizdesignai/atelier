import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { CycleEngine } from '@/lib/presenca/CycleEngine';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (payload.type !== 'session') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Auto-sincronizar renovações de ciclo e geração de demandas
    try {
      await CycleEngine.syncAllCycles();
    } catch (syncErr) {
      console.warn('[api/presenca/projects] Erro na sincronização de ciclos:', syncErr);
    }

    const sql = getDb();
    const isClient = payload.role === 'client';

    let projects;
    if (isClient) {
      projects = await sql`
        SELECT 
          p.*,
          json_build_object(
            'id', pr.id,
            'nome', pr.nome,
            'email', pr.email,
            'avatar_url', COALESCE(pr.avatar_url, (SELECT avatar_url FROM instagram_profiles WHERE project_id = p.id LIMIT 1)),
            'empresa', pr.empresa,
            'instagram', COALESCE(pr.instagram, (SELECT username FROM instagram_profiles WHERE project_id = p.id LIMIT 1))
          ) as profiles,
          (
            SELECT json_build_object(
              'id', c.id,
              'cycle_number', c.cycle_number,
              'period_start', c.period_start,
              'period_end', c.period_end,
              'status', c.status,
              'objective', c.objective
            )
            FROM ig_cycles c
            WHERE c.project_id = p.id
            ORDER BY c.cycle_number DESC
            LIMIT 1
          ) as current_cycle
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE (
          p.service_type = 'Gestão de Instagram'
          OR p.service_type ILIKE '%Instagram%'
          OR p.type ILIKE '%Instagram%'
          OR (p.service_type IS NULL AND p.type ILIKE 'Pacote%')
        )
        AND p.status IN ('active', 'delivered', 'archived', 'completed', 'paused')
        AND p.client_id = ${payload.sub}
        ORDER BY 
          CASE WHEN p.status = 'active' THEN 0 WHEN p.status = 'paused' THEN 1 ELSE 2 END,
          COALESCE(pr.nome, pr.empresa, p.id::text) ASC,
          p.created_at DESC
      `;
    } else {
      projects = await sql`
        SELECT 
          p.*,
          json_build_object(
            'id', pr.id,
            'nome', pr.nome,
            'email', pr.email,
            'avatar_url', COALESCE(pr.avatar_url, (SELECT avatar_url FROM instagram_profiles WHERE project_id = p.id LIMIT 1)),
            'empresa', pr.empresa,
            'instagram', COALESCE(pr.instagram, (SELECT username FROM instagram_profiles WHERE project_id = p.id LIMIT 1))
          ) as profiles,
          (
            SELECT json_build_object(
              'id', c.id,
              'cycle_number', c.cycle_number,
              'period_start', c.period_start,
              'period_end', c.period_end,
              'status', c.status,
              'objective', c.objective
            )
            FROM ig_cycles c
            WHERE c.project_id = p.id
            ORDER BY c.cycle_number DESC
            LIMIT 1
          ) as current_cycle
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE (
          p.service_type = 'Gestão de Instagram'
          OR p.service_type ILIKE '%Instagram%'
          OR p.type ILIKE '%Instagram%'
          OR (p.service_type IS NULL AND p.type ILIKE 'Pacote%')
        )
        AND p.status IN ('active', 'delivered', 'archived', 'completed', 'paused')
        ORDER BY 
          CASE WHEN p.status = 'active' THEN 0 WHEN p.status = 'paused' THEN 1 ELSE 2 END,
          COALESCE(pr.nome, pr.empresa, p.id::text) ASC,
          p.created_at DESC
      `;
    }

    return NextResponse.json({ data: projects });
  } catch (error: any) {
    console.error('[api/presenca/projects] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
