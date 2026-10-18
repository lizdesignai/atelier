import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    const [tasksData, profilesData, agenciesData, activeProjects, leadsData] = await Promise.all([
      sql`SELECT project_id, status FROM tasks WHERE title NOT ILIKE 'GATE%'`,
      sql`SELECT id, email, nome, avatar_url, role, created_at, empresa, instagram, username FROM profiles WHERE role IN ('client', 'lead')`,
      sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies`,
      sql`SELECT p.*, json_build_object(
            'id', pr.id,
            'nome', pr.nome,
            'email', pr.email,
            'avatar_url', pr.avatar_url,
            'empresa', pr.empresa,
            'instagram', pr.instagram,
            'username', pr.username,
            'telefone', pr.telefone
          ) as profiles
          FROM projects p
          LEFT JOIN profiles pr ON p.client_id = pr.id
          WHERE p.status IN ('active', 'delivered', 'completed', 'archived', 'paused')
          ORDER BY p.created_at DESC`,
      sql`SELECT id, nome, email, nicho, created_at FROM leads WHERE status = 'prospect'`
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

    const profilesLeadsMapped = (profilesData || [])
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

    const nativeLeadsMapped = (leadsData || []).map((l: any) => ({
      id: `lead-native-${l.id}`,
      client_id: l.id,
      isLead: true,
      isAgency: false,
      profiles: { nome: l.nome, email: l.email, empresa: l.nicho || 'Lead' },
      status: 'lead',
      type: 'Lead (Orçamento)',
      calculatedProgress: 0,
      created_at: l.created_at,
      financial_value: 0
    }));

    const leadsMapped = [...profilesLeadsMapped, ...nativeLeadsMapped];

    const agenciesMapped = (agenciesData || []).map((agency: any) => ({
      id: `agency-${agency.id}`,
      client_id: agency.id,
      isLead: false,
      isAgency: true,
      profiles: { nome: agency.name, empresa: "Agência Parceira (Studio Veronna)", avatar_url: null },
      status: agency.status,
      type: 'Agência Parceira',
      financial_value: agency.financial_value,
      billing_date: agency.billing_date,
      calculatedProgress: 0,
      created_at: agency.created_at,
      trello_url: agency.trello_url
    }));

    const clientIdsWithProjects = new Set((activeProjects || []).map((p: any) => p.client_id));
    const orphanClientsMapped = (profilesData || [])
      .filter((p: any) => p.role === 'client' && !clientIdsWithProjects.has(p.id))
      .map((client: any) => ({
        id: `orphan-${client.id}`,
        client_id: client.id,
        isLead: false,
        isOrphanClient: true,
        isAgency: false,
        profiles: client,
        status: 'pending',
        type: 'Aguardando Início de Projeto',
        calculatedProgress: 0,
        created_at: client.created_at,
        financial_value: 0
      }));

    const enrichedProjects = [...enriched, ...leadsMapped, ...orphanClientsMapped, ...agenciesMapped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const mappedAvailableLeads = (leadsData || []).map((l: any) => ({
      id: l.id,
      nome: l.nome,
      email: l.email,
      empresa: l.nicho || 'Lead',
      isLead: true
    }));

    return NextResponse.json({
      data: {
        enrichedProjects,
        availableClients: [
          ...(profilesData || []).filter((p: any) => p.role === 'client'),
          ...mappedAvailableLeads
        ]
      }
    });
  } catch (error: any) {
    console.error('[api/clients/overview] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao buscar overview' }, { status: 500 });
  }
}
