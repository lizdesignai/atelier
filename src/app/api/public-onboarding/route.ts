// src/app/api/public-onboarding/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 🛡️ CABEÇALHOS CORS: Permitem que o seu HTML externo se comunique com esta API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, mude o '*' para 'https://lizdesign.com.br' para segurança máxima
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 🛡️ O GUARDA DE FRONTEIRA: Responde à requisição "Preflight" do navegador
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      nome, email, whatsapp, instagram, 
      produto_ancora, cliente_ideal, gatilho_compra, gatilho_compra_outro, inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada,
      tilt_technical, tilt_culture, tilt_status, tilt_community, semiotics_choices, voice_scenarios 
    } = data;

    if (!email || !instagram) {
      return NextResponse.json({ error: 'Email e Instagram são obrigatórios.' }, { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},instagram.eq.${instagram}`)
      .limit(1)
      .maybeSingle();

    let clientId = profile?.id || null;
    let projectId = null;

    if (clientId) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      projectId = project?.id || null;
    }

    const briefingAnswers = {
      nome, whatsapp, email, instagram,
      produto_ancora, cliente_ideal,
      gatilho_compra: gatilho_compra === 'Outro' ? gatilho_compra_outro : gatilho_compra,
      inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada
    };

    const [briefingRes, labRes] = await Promise.all([
      supabaseAdmin.from('instagram_briefings').insert({
        client_id: clientId,
        project_id: projectId,
        answers: briefingAnswers,
        status: 'submitted'
      }),
      supabaseAdmin.from('brandbook_laboratory').insert({
        client_id: clientId,
        project_id: projectId,
        tilt_technical, tilt_culture, tilt_status, tilt_community,
        semiotics_choices,
        voice_scenarios
      })
    ]);

    if (briefingRes.error) throw new Error(`Erro DB Briefing: ${briefingRes.error.message}`);
    if (labRes.error) throw new Error(`Erro DB Brandbook: ${labRes.error.message}`);

    // Sucesso com cabeçalhos CORS
    return NextResponse.json({ success: true, message: 'Dossiê processado com segurança.' }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("[Public Onboarding Error]:", error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500, headers: corsHeaders });
  }
}