// GET /api/presenca?projectId=xxx[&cycleId=yyy]
// Dashboard completo do módulo Presença para um projeto de Instagram.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { CycleEngine } from '@/lib/presenca/CycleEngine';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

    const cycleId = searchParams.get('cycleId') || undefined;

    const sql = getDb();

    // 1. Dashboard do ciclo (motor central)
    const dashboard = await CycleEngine.getCycleDashboard(projectId, cycleId);

    // 2. Dados complementares do projeto
    const [project] = await sql`
      SELECT p.id, p.billing_date, p.type, p.service_type, p.posts_quantity, p.videos_quantity,
             p.financial_value, p.payment_recurrence, p.contract_start, p.contract_end,
             p.content_release_day, p.current_cycle_id, p.approval_owner_id,
             pr.nome as client_name, pr.avatar_url as client_avatar, pr.empresa as client_empresa,
             pr.instagram as client_instagram, pr.username as client_username
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;

    // 3. Planejamentos do período do ciclo
    const plannings = await sql`
      SELECT * FROM content_planning
      WHERE project_id = ${projectId}
        AND created_at >= ${dashboard.cycle.period_start}::date
        AND created_at <= (${dashboard.cycle.period_end}::date + interval '1 day')
      ORDER BY created_at DESC
    `;

    // 4. Materiais/Assets do projeto
    const assets = await sql`
      SELECT * FROM project_assets
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    // 5. Perfil do Instagram (se vinculado)
    const [igProfile] = await sql`
      SELECT * FROM instagram_profiles
      WHERE project_id = ${projectId}
      LIMIT 1
    `;

    return NextResponse.json({
      ...dashboard,
      project,
      plannings,
      assets,
      igProfile,
    });
  } catch (error: any) {
    console.error('[api/presenca] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
