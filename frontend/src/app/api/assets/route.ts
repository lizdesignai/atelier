import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const subclientId = searchParams.get('subclientId');

  if (!projectId && !subclientId) {
    return NextResponse.json({ error: 'Missing projectId or subclientId' }, { status: 400 });
  }

  try {
    const sql = getDb();
    let data;

    if (subclientId) {
      data = await (sql as any).query(
        `SELECT * FROM project_assets WHERE subclient_id = $1 ORDER BY created_at DESC`,
        [subclientId]
      );
    } else {
      const validProjId = searchParams.get('validProjId');
      if (validProjId) {
        data = await (sql as any).query(
          `SELECT * FROM project_assets WHERE project_id = $1 OR project_id = $2 ORDER BY created_at DESC`,
          [validProjId, projectId]
        );
      } else {
        data = await (sql as any).query(
          `SELECT * FROM project_assets WHERE project_id = $1 ORDER BY created_at DESC`,
          [projectId]
        );
      }
    }

    const targetProjId = searchParams.get('validProjId') || projectId;
    let planningAssets: any[] = [];
    if (targetProjId) {
      try {
        planningAssets = await (sql as any).query(
          `SELECT 
            id, 
            project_id, 
            subclient_id, 
            hook as file_name, 
            planning_file_url as file_url, 
            'PDF Oficial' as file_size, 
            'pdf' as file_type,
            created_at
          FROM content_planning 
          WHERE (project_id = $1 OR project_id = $2) AND planning_file_url IS NOT NULL
          ORDER BY created_at DESC`,
          [targetProjId, projectId]
        );
      } catch (err) {
        console.warn("Erro ao buscar planning assets:", err);
      }
    }

    const combined = [...(planningAssets || []), ...(data || [])];
    return NextResponse.json(combined);
  } catch (error: any) {
    console.error("API /api/assets error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
