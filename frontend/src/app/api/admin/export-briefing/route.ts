// frontend/src/app/api/admin/export-briefing/route.ts
import { NextResponse } from 'next/server';
import { getUnifiedProjectBriefing } from '@/lib/unifiedBriefing';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    const result = await getUnifiedProjectBriefing(projectId);

    if (!result.briefing) {
      return NextResponse.json({ error: 'Nenhum briefing preenchido por este cliente ainda.' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: result.briefing,
      source: result.source,
      competitorsData: result.competitorsData,
      clientInfo: result.clientInfo
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
