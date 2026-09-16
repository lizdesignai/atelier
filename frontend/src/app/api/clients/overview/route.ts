import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    const [tasksData, profilesData, agenciesData, activeProjects] = await Promise.all([
      sql`SELECT project_id, status FROM tasks`,
      sql`SELECT id, email, nome, avatar_url, role, created_at, empresa FROM profiles WHERE role IN ('client', 'lead')`,
      sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies`,
      sql`SELECT p.*, json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url, 'empresa', pr.empresa) as profiles
          FROM projects p
          LEFT JOIN profiles pr ON p.client_id = pr.id
          WHERE p.status IN ('active', 'delivered')
          ORDER BY p.created_at DESC`
    ]);

    const enriched = (activeProjects || []).map((p: any) => {
      const pTasks = (tasksData || []).filter((t: any) => t.project_id === p.id);
      const totalTasks = pTasks.length;
      const completedTasks = pTasks.filter((t: any) => t.status === 'completed').length;
      const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      return {
        ...p,
        calculatedProgress: progress,
        isLead: false,
        isAgency: false
      };
    });

    const leadsMapped = (profilesData || [])
      .filter((p: any) => p.role === 'lead')
      .map((lead: any) => ({
        id: `lead-${lead.id}`,
        client_id: lead.id,
        isLead: true,
        isAgency: false,
        profiles: lead,
        status: 'lead',
        type: 'Lead (Prospecção)',
        calculatedProgress: 0,
        created_at: lead.created_at,
        financial_value: 0
      }));

    const agenciesMapped = (agenciesData || []).map((agency: any) => ({
      id: `agency-${agency.id}`,
      client_id: agency.id,
      isLead: false,
      isAgency: true,
      profiles: { nome: agency.name, empresa: "Agência Parceira (White-Label)", avatar_url: null },
      status: agency.status,
      type: 'Agência Parceira',
      financial_value: agency.financial_value,
      billing_date: agency.billing_date,
      calculatedProgress: 0,
      created_at: agency.created_at,
      trello_url: agency.trello_url
    }));

    const enrichedProjects = [...enriched, ...leadsMapped, ...agenciesMapped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      data: {
        enrichedProjects,
        availableClients: (profilesData || []).filter((p: any) => p.role === 'client')
      }
    });
  } catch (error: any) {
    console.error('[api/clients/overview] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao buscar overview' }, { status: 500 });
  }
}
