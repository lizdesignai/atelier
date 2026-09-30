import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    const sql = getDb();
    
    // Get curadoria data
    const answers = await sql`SELECT moodboard_urls FROM strategic_answers WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT 1`;
    if (!answers.length || !answers[0].moodboard_urls || answers[0].moodboard_urls.length === 0) {
        return NextResponse.json({ error: 'No curadoria found for this project', data: [] }, { status: 200 }); // Return 200 with empty array to allow upload UI
    }
    
    return NextResponse.json({ success: true, data: answers[0].moodboard_urls });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
