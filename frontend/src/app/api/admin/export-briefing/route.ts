import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    const sql = getDb();
    
    const projects = await sql`
      SELECT p.id, pr.email, pr.nome 
      FROM projects p 
      LEFT JOIN profiles pr ON p.client_id = pr.id 
      WHERE p.id = ${projectId}
    `;
    if (!projects.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    
    const clientEmail = projects[0].email;
    const clientNome = projects[0].nome;
    
    let briefings = [];
    if (clientEmail) {
      briefings = await sql`SELECT * FROM briefings_identidade_visual WHERE "Email" ILIKE ${clientEmail} ORDER BY created_at DESC LIMIT 1`;
    }
    if (!briefings.length && clientNome) {
      briefings = await sql`SELECT * FROM briefings_identidade_visual WHERE "Nome_Cliente" ILIKE ${'%' + clientNome + '%'} ORDER BY created_at DESC LIMIT 1`;
    }

    if (!briefings.length) {
        return NextResponse.json({ error: 'Nenhum briefing preenchido por este cliente ainda.' }, { status: 404 });
    }
    
    const b = briefings[0].dados_completos || briefings[0];
    
    return NextResponse.json({ success: true, data: b });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
