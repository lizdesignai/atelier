// frontend/src/app/api/projects/[id]/briefing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedProjectBriefing } from '@/lib/unifiedBriefing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto não fornecido.' }, { status: 400 });
    }

    const result = await getUnifiedProjectBriefing(projectId);

    if (!result.briefing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum briefing preenchido por este cliente ainda.',
        clientInfo: result.clientInfo
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.briefing,
      source: result.source,
      normalizedAnswers: result.normalizedAnswers,
      competitorsData: result.competitorsData,
      clientInfo: result.clientInfo
    });
  } catch (error: any) {
    console.error('[API Project Briefing] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao buscar briefing.' }, { status: 500 });
  }
}
