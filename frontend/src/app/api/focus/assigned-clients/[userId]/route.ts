import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const sql = getDb();
    const { userId } = await params;

    // We do a raw query to join collaborator_assignments with projects and profiles
    const assignments = await (sql as any).query(`
      SELECT 
        ca.id,
        ca.project_id,
        ca.subclient_id,
        p.id as project_id_ref,
        p.type as project_type,
        p.service_type,
        prof.nome as profile_nome,
        prof.avatar_url as profile_avatar,
        subc.name as subclient_name
      FROM collaborator_assignments ca
      LEFT JOIN projects p ON ca.project_id = p.id
      LEFT JOIN profiles prof ON p.client_id = prof.id
      LEFT JOIN agency_subclients subc ON ca.subclient_id = subc.id
      WHERE ca.collaborator_id = $1
    `, [userId]);

    let assignedList: any[] = [];
    if (assignments && assignments.length > 0) {
      assignedList = assignments.map((a: any) => {
        if (a.project_id) {
          return {
            assignment_id: a.id,
            id: a.project_id,
            name: a.profile_nome || 'Projeto Sem Cliente',
            avatar_url: a.profile_avatar,
            type: 'project',
            serviceType: a.service_type || 'N/A'
          };
        } else if (a.subclient_id) {
          return {
            assignment_id: a.id,
            id: a.subclient_id,
            name: a.subclient_name || 'Subcliente',
            avatar_url: null,
            type: 'subclient',
            serviceType: 'Agência'
          };
        }
        return null;
      }).filter(Boolean);
    }

    return NextResponse.json({ data: assignedList });
  } catch (error: any) {
    console.error('[api/focus/assigned-clients] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}