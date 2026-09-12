import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const startOfMonth = searchParams.get('start');
    const endOfMonth = searchParams.get('end');

    if (!projectId || !startOfMonth || !endOfMonth) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const sql = getDb();
    
    const query = `
      SELECT t.*, json_build_object('nome', p.nome, 'avatar_url', p.avatar_url) as profiles
      FROM tasks t
      LEFT JOIN profiles p ON t.assigned_to = p.id
      WHERE t.project_id = $1
      AND t.deadline >= $2
      AND t.deadline <= $3
      ORDER BY t.deadline ASC
    `;
    
    const data = await (sql as any).query(query, [projectId, startOfMonth, endOfMonth]);

    return NextResponse.json({ tasks: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
