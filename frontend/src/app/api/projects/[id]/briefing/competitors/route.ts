// frontend/src/app/api/projects/[id]/briefing/competitors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedProjectBriefing, saveProjectCompetitorsData } from '@/lib/unifiedBriefing';
import { competitorAnalysisService } from '@/services/CompetitorAnalysisService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto não fornecido.' }, { status: 400 });
    }

    const { briefing, competitorsData } = await getUnifiedProjectBriefing(projectId);

    return NextResponse.json({
      success: true,
      competitors: competitorsData || [],
      hasData: Array.isArray(competitorsData) && competitorsData.length > 0,
      rawCompetitorText: briefing?.concorrentes || briefing?.concorrentes_links || ''
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto não fornecido.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const customHandles = body.handles as string[] | undefined;

    const { briefing, competitorsData } = await getUnifiedProjectBriefing(projectId);

    // Se já tiver dados em cache e não for forçado refresh
    if (!body.forceRefresh && competitorsData && competitorsData.length > 0 && !customHandles) {
      return NextResponse.json({
        success: true,
        cached: true,
        competitors: competitorsData
      });
    }

    // Determinar quais handles extrair
    let handlesToScrape: string[] = [];
    if (customHandles && Array.isArray(customHandles) && customHandles.length > 0) {
      handlesToScrape = customHandles;
    } else {
      const textSources = [
        briefing?.concorrentes,
        briefing?.concorrentes_links,
        briefing?.Links_Concorrentes,
        briefing?.Concorrentes
      ].filter(Boolean).join('\n');

      handlesToScrape = competitorAnalysisService.extractInstagramHandles(textSources);
    }

    if (handlesToScrape.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum perfil ou link de concorrente do Instagram foi identificado nas respostas do cliente.',
        handlesFound: []
      }, { status: 400 });
    }

    console.log(`[Competitors API] Iniciando varredura via Apify para o projeto ${projectId} com perfis:`, handlesToScrape);

    const scrapedCompetitors = await competitorAnalysisService.scrapeCompetitors(handlesToScrape);

    if (scrapedCompetitors.length > 0) {
      await saveProjectCompetitorsData(projectId, scrapedCompetitors);
    }

    return NextResponse.json({
      success: true,
      scrapedCount: scrapedCompetitors.length,
      competitors: scrapedCompetitors
    });

  } catch (error: any) {
    console.error('[Competitors API] Erro ao sincronizar concorrentes:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar concorrentes.' }, { status: 500 });
  }
}
