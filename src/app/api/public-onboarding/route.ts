// src/app/api/public-onboarding/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🛡️ INICIALIZAÇÃO DE SERVIDOR SEGURA (Ignora RLS para escrita de sistema)
// ATENÇÃO: Certifique-se de que tem estas variáveis no seu ficheiro .env ou .env.local
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 🛡️ CABEÇALHOS CORS: Permitem que o seu HTML externo se comunique com esta API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Pode mudar para 'https://www.lizdesign.com.br' em produção para mais segurança
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Accept-Version',
};

// 🛡️ O GUARDA DE FRONTEIRA: Responde à requisição "Preflight" do navegador
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Desestruturação limpa do Payload enviado pelo frontend
    const { 
      nome, email, whatsapp, instagram, 
      produto_ancora, cliente_ideal, gatilho_compra, gatilho_compra_outro, inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada,
      tilt_technical, tilt_culture, tilt_status, tilt_community, semiotics_choices, voice_scenarios 
    } = data;

    // 1. Validação Rigorosa
    if (!email || !instagram) {
      return NextResponse.json(
        { error: 'Email e Instagram são obrigatórios.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Tentar Associar a um Cliente/Projeto Existente (Matchmaking)
    let clientId = null;
    let projectId = null;

    // Procura na tabela de profiles por email OU instagram
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},instagram.eq.${instagram}`)
      .limit(1)
      .maybeSingle();

    if (profile?.id) {
      clientId = profile.id;
      
      // Se achou o cliente, tenta achar o projeto ativo mais recente de Instagram ou IDV
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

    // 3. Preparar o JSON de Respostas do Briefing
    // (Juntamos os dados de contacto aqui para caso seja um registo órfão)
    const briefingAnswers = {
      nome, whatsapp, email, instagram,
      produto_ancora, cliente_ideal,
      gatilho_compra: gatilho_compra === 'Outro' ? gatilho_compra_outro : gatilho_compra,
      inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada
    };

    // 4. Inserção Dupla (Base de Dados)
    // O Promise.all faz as duas inserções em simultâneo para máxima performance
    const [briefingRes, labRes] = await Promise.all([
      supabaseAdmin.from('instagram_briefings').insert({
        client_id: clientId, 
        project_id: projectId,
        answers: briefingAnswers,
        status: 'submitted',
        // Adicionamos um identificador caso não haja clientId
        created_by_email: email 
      }),
      supabaseAdmin.from('brandbook_laboratory').insert({
        client_id: clientId,
        project_id: projectId,
        tilt_technical, tilt_culture, tilt_status, tilt_community,
        semiotics_choices,
        voice_scenarios,
        // Adicionamos um identificador caso não haja clientId
        created_by_email: email
      })
    ]);

    // 5. Tratamento de Erros Isolado (Ajuda muito no debug)
    if (briefingRes.error) {
      console.error("[API Onboarding] Erro ao salvar Briefing:", briefingRes.error);
      throw new Error(`Falha ao gravar núcleo do negócio: ${briefingRes.error.message}`);
    }
    
    if (labRes.error) {
      console.error("[API Onboarding] Erro ao salvar Brandbook:", labRes.error);
      throw new Error(`Falha ao gravar escolhas visuais: ${labRes.error.message}`);
    }

    // 6. Resposta de Sucesso com Cabeçalhos CORS
    return NextResponse.json(
      { success: true, message: 'Dossiê processado com segurança.' }, 
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[Public Onboarding API Error]:", error);
    
    // Garantir que devolvemos sempre JSON, mesmo no erro
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor ao processar o Dossiê.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}