// src/app/api/public-onboarding/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Garanta que esta chave está no .env.local
);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      nome, email, whatsapp, instagram, 
      produto_ancora, cliente_ideal, gatilho_compra, gatilho_compra_outro, inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada,
      tilt_technical, tilt_culture, tilt_status, tilt_community, semiotics_choices, voice_scenarios 
    } = data;

    if (!email || !instagram) {
      return NextResponse.json({ error: 'Email e Instagram são obrigatórios.' }, { status: 400 });
    }

    // 1. Procurar se já existe um Cliente (Opcional, não bloqueante)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},instagram.eq.${instagram}`)
      .limit(1)
      .maybeSingle();

    let clientId = profile?.id || null;
    let projectId = null;

    // Se o cliente existir, tentamos achar o projeto ativo dele
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

    // 2. Preparar Payload do Briefing (Guardamos o email no JSON para matching futuro)
    const briefingAnswers = {
      nome, whatsapp, email, instagram,
      produto_ancora, cliente_ideal,
      gatilho_compra: gatilho_compra === 'Outro' ? gatilho_compra_outro : gatilho_compra,
      inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada
    };

    // 3. INSERÇÃO DUPLA (Com ou sem Project ID)
    // Se não houver projectId, cria o registo na mesma como "órfão"
    const [briefingRes, labRes] = await Promise.all([
      supabaseAdmin.from('instagram_briefings').insert({
        client_id: clientId, // Pode ser null
        project_id: projectId, // Pode ser null
        answers: briefingAnswers,
        status: 'submitted'
      }),
      supabaseAdmin.from('brandbook_laboratory').insert({
        client_id: clientId, // Pode ser null
        project_id: projectId, // Pode ser null
        tilt_technical, tilt_culture, tilt_status, tilt_community,
        semiotics_choices,
        voice_scenarios
      })
    ]);

    // 4. Tratamento de Erros Rígido para Depuração
    if (briefingRes.error) {
      console.error("Erro DB Briefing:", briefingRes.error);
      throw new Error(`Erro DB Briefing: ${briefingRes.error.message}`);
    }
    if (labRes.error) {
      console.error("Erro DB Brandbook:", labRes.error);
      throw new Error(`Erro DB Brandbook: ${labRes.error.message}`);
    }

    return NextResponse.json({ success: true, message: 'Dossiê processado com segurança.' });

  } catch (error: any) {
    console.error("[Public Onboarding Error]:", error);
    return NextResponse.json({ error: error.message || 'Erro interno ao processar o formulário.' }, { status: 500 });
  }
}