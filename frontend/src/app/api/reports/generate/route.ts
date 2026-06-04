// src/app/api/reports/generate/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { instagramReportService } from '@/services/InstagramReportService';

export async function POST(request: Request) {
  try {
    // 1. Validar Autenticação e Permissões
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida.' }, { status: 401 });
    }

    // Verifica se o utilizador é Admin ou Gestor para evitar disparos maliciosos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'gestor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Acesso negado. Privilégios insuficientes.' }, { status: 403 });
    }

    // 2. Extrair payload do Frontend
    const body = await request.json();
    const { projectId, instagramHandle } = body;

    if (!projectId || !instagramHandle) {
      return NextResponse.json({ error: 'Dados insuficientes (projectId e handle são obrigatórios).' }, { status: 400 });
    }

    // 3. Executar o Motor Estratégico
    // Este método já lida com: Scraping Apify -> Contexto Supabase -> Gemini AI -> Save Draft
    const message = await instagramReportService.generateMonthlyReport(projectId, instagramHandle);

    // 4. Retorno de Sucesso
    return NextResponse.json({ 
      success: true, 
      message 
    });

  } catch (error: any) {
    console.error("[API Relatórios] Erro na orquestração:", error);
    return NextResponse.json({ 
      error: 'Falha interna no processamento do relatório estratégico.',
      details: error.message 
    }, { status: 500 });
  }
}