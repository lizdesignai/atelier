import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    const [teamRes, rulesRes, tasksRes, agenciesRes, subclientsRes] = await Promise.all([
      sql`
        SELECT 
          p.id, p.nome, p.role, p.avatar_url, p.skills,
          CASE WHEN tp.user_id IS NOT NULL THEN
            json_build_object('exp_points', tp.exp_points, 'level_name', tp.level_name)
          ELSE null END as team_performance
        FROM profiles p
        LEFT JOIN team_performance tp ON p.id = tp.user_id
        WHERE p.role IN ('admin', 'gestor', 'colaborador')
        ORDER BY p.nome ASC
      `,
      sql`SELECT id, project_id, task_type, assignee_id, created_at FROM routing_rules`,
      sql`
        SELECT 
          t.id, t.project_id, t.assigned_to, t.title, t.description, t.caption, 
          t.external_links, t.media_assets, t.status, t.deadline, t.created_at, 
          t.completed_at, t.actual_time, t.estimated_time, t.stage, t.task_type, 
          t.attachment_url, t.subclient_id, t.agency_id,
          CASE WHEN p.id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'type', p.type,
              'service_type', p.service_type,
              'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url) ELSE null END
            )
          ELSE null END as projects,
          CASE WHEN asb.id IS NOT NULL THEN
            json_build_object('name', asb.name)
          ELSE null END as agency_subclients
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN profiles pr ON p.client_id = pr.id
        LEFT JOIN agency_subclients asb ON t.subclient_id = asb.id
        WHERE t.status != 'archived'
        ORDER BY t.deadline ASC NULLS LAST, t.created_at DESC
      `,
      sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies WHERE status = 'active' ORDER BY name ASC`,
      sql`SELECT id, agency_id, name, deliverables_count, created_at, trello_url FROM agency_subclients ORDER BY name ASC`
    ]);

    return NextResponse.json({
      data: {
        team: teamRes || [],
        routingRules: rulesRes || [],
        tasks: tasksRes || [],
        agencies: agenciesRes || [],
        subclients: subclientsRes || []
      }
    });
  } catch (error: any) {
    console.error('[api/analytics/operational] Erro ao consultar Neon:', error);
    return NextResponse.json({ error: error.message || 'Falha ao buscar dados operacionais do Neon' }, { status: 500 });
  }
}
