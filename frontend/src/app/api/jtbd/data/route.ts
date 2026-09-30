import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from '@neondatabase/serverless';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  let pool;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = payload.sub;
    
    pool = new Pool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL });

    // 1. Fetch current profile
    const profileRes = await pool.query(`SELECT * FROM "profiles" WHERE "id" = $1 LIMIT 1`, [userId]);
    const profile = profileRes.rows[0];
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Fetch team and projects
    let teamData = [];
    let projectsData = [];

    if (profile.role === 'admin' || profile.role === 'gestor') {
      const teamQuery = await pool.query(`SELECT * FROM "profiles" WHERE "role" IN ('admin', 'gestor', 'colaborador') ORDER BY "nome" ASC`);
      teamData = teamQuery.rows;

      const projQuery = await pool.query(`
        SELECT p.id, p.type, p.client_id,
          CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END as profiles
        FROM "projects" p
        LEFT JOIN "profiles" pr ON p.client_id = pr.id
        WHERE p.status = 'active'
      `);
      projectsData = projQuery.rows;
    } else {
      teamData = [profile];
    }

    const teamIds = teamData.map((t: any) => t.id);

    // 3. Fetch Tasks
    let tasksData: any[] = [];
    if (teamIds.length > 0) {
      const ph = teamIds.map((_: any, i: number) => `$${i + 1}`).join(',');
      const tasksQuery = await pool.query(`
        SELECT 
          t.*,
          CASE WHEN p.id IS NOT NULL THEN
            json_build_object(
              'type', p.type,
              'client_id', p.client_id,
              'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END
            )
          ELSE null END as projects,
          CASE WHEN asb.id IS NOT NULL THEN
            json_build_object('id', asb.id, 'name', asb.name, 'trello_url', asb.trello_url)
          ELSE null END as agency_subclients,
          (
            SELECT json_agg(json_build_object('image_url', sp.image_url, 'status', sp.status, 'created_at', sp.created_at))
            FROM "social_posts" sp
            WHERE sp.task_id = t.id
          ) as social_posts
        FROM "tasks" t
        LEFT JOIN "projects" p ON t.project_id = p.id
        LEFT JOIN "profiles" pr ON p.client_id = pr.id
        LEFT JOIN "agency_subclients" asb ON t.subclient_id = asb.id
        WHERE t.assigned_to IN (${ph})
        ORDER BY t.priority_score DESC NULLS LAST, t.deadline ASC
      `, teamIds);
      tasksData = tasksQuery.rows;
    }

    await pool.end();

    return NextResponse.json({
      data: {
        profile,
        teamData,
        projectsData,
        tasksData
      }
    });

  } catch (error: any) {
    if (pool) await pool.end();
    console.error('Error in /api/jtbd/data:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
