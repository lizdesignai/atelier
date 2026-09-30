import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { taskId, projectId } = await req.json();
    if (!taskId || !projectId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const sql = getDb();
    
    // Get task media
    const tasks = await sql`SELECT media_assets FROM tasks WHERE id = ${taskId}`;
    if (!tasks.length) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    
    const mediaAssets = tasks[0].media_assets || [];
    if (!mediaAssets.length) return NextResponse.json({ error: 'No media assets found on this task' }, { status: 400 });

    // Insert into design_directions
    for (let i = 0; i < mediaAssets.length; i++) {
       const asset = mediaAssets[i];
       if (asset.type === 'image') {
          await sql`
            INSERT INTO design_directions (project_id, title, description, image_url)
            VALUES (${projectId}, ${'Caminho ' + (i + 1)}, 'Direção criativa aprovada internamente', ${asset.url})
          `;
       }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
