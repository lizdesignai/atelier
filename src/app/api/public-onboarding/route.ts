// src/app/api/public-onboarding/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🛡️ CABEÇALHOS CORS OBRIGATÓRIOS E AGRESSIVOS
// Atenção: Use "*" apenas para testar se funciona. Se funcionar, troque pelo seu domínio real 'https://www.lizdesign.com.br'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Max-Age': '86400', // Faz cache do Preflight por 24h
};

// 1. O GUARDA PREFLIGHT (Trata o OPTIONS obrigatoriamente)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// 2. INICIALIZAÇÃO SEGURA DO SUPABASE ADMIN
// Se faltarem estas chaves no .env, a API quebra silenciosamente
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO CRÍTICO: Variáveis de ambiente Supabase ausentes!");
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 3. O PROCESSADOR POST
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const { 
      nome, email, whatsapp, instagram, 
      produto_ancora, cliente_ideal, gatilho_compra, gatilho_compra_outro, inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada,
      tilt_technical, tilt_culture, tilt_status, tilt_community, semiotics_choices, voice_scenarios 
    } = data;

    // Validação Mínima
    if (!email || !instagram) {
      return NextResponse.json(
        { error: 'Email e Instagram são obrigatórios.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    let clientId = null;
    let projectId = null;

    // Busca o Cliente
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},instagram.eq.${instagram}`)
      .limit(1)
      .maybeSingle();

    if (profile?.id) {
      clientId = profile.id;
      
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (project?.id) {
        projectId = project.id;
      }
    }

    const briefingAnswers = {
      nome, whatsapp, email, instagram,
      produto_ancora, cliente_ideal,
      gatilho_compra: gatilho_compra === 'Outro' ? gatilho_compra_outro : gatilho_compra,
      inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada
    };

    // Inserção Dupla
    const [briefingRes, labRes] = await Promise.all([
      supabaseAdmin.from('instagram_briefings').insert({
        client_id: clientId, 
        project_id: projectId,
        answers: briefingAnswers,
        status: 'submitted',
        created_by_email: email 
      }),
      supabaseAdmin.from('brandbook_laboratory').insert({
        client_id: clientId,
        project_id: projectId,
        tilt_technical, tilt_culture, tilt_status, tilt_community,
        semiotics_choices,
        voice_scenarios,
        created_by_email: email
      })
    ]);

    if (briefingRes.error) {
      console.error("[API Onboarding] Erro Briefing:", briefingRes.error);
      throw new Error(`Falha ao gravar núcleo do negócio: ${briefingRes.error.message}`);
    }
    
    if (labRes.error) {
      console.error("[API Onboarding] Erro Brandbook:", labRes.error);
      throw new Error(`Falha ao gravar escolhas visuais: ${labRes.error.message}`);
    }

    // SUCESSO!
    return NextResponse.json(
      { success: true, message: 'Dossiê processado com segurança.' }, 
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[Public Onboarding API Error]:", error);
    
    // ERRO! Garante que os cabeçalhos CORS vão junto com a mensagem de falha
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor ao processar o Dossiê.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}