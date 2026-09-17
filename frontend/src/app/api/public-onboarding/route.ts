// src/app/api/public-onboarding/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
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
      return NextResponse.json(
        { error: 'Email e Instagram são obrigatórios.' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    let clientId = null;
    let projectId = null;

    const sql = getDb();

    // Busca o Cliente
    try {
      const profile = await (sql as any).query(`
        SELECT id FROM profiles 
        WHERE email = $1 OR instagram = $2
        LIMIT 1
      `, [email, instagram]);

      if (profile && profile.length > 0) {
        clientId = profile[0].id;
        
        const project = await (sql as any).query(`
          SELECT id FROM projects
          WHERE client_id = $1 AND status IN ('active', 'delivered')
          ORDER BY created_at DESC
          LIMIT 1
        `, [clientId]);
        
        if (project && project.length > 0) {
          projectId = project[0].id;
        }
      }
    } catch (err) {
      console.error("[API Onboarding] Erro ao buscar perfil/projeto:", err);
    }

    const briefingAnswers = {
      nome, whatsapp, email, instagram,
      produto_ancora, cliente_ideal,
      gatilho_compra: gatilho_compra === 'Outro' ? gatilho_compra_outro : gatilho_compra,
      inimigo_comum, padrao_excelencia, persona_marca, arsenal_visual, ponto_chegada
    };

    // Inserção Dupla
    try {
      await (sql as any).query(`
        INSERT INTO instagram_briefings (client_id, project_id, answers, status, created_by_email)
        VALUES ($1, $2, $3, $4, $5)
      `, [clientId, projectId, briefingAnswers, 'submitted', email]);
    } catch (err: any) {
      console.error("[API Onboarding] Erro Briefing:", err);
      throw new Error(`Falha ao gravar núcleo do negócio: ${err.message}`);
    }

    try {
      await (sql as any).query(`
        INSERT INTO brandbook_laboratory (
          client_id, project_id, tilt_technical, tilt_culture, tilt_status, tilt_community,
          semiotics_choices, voice_scenarios, created_by_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [clientId, projectId, tilt_technical, tilt_culture, tilt_status, tilt_community, semiotics_choices, voice_scenarios, email]);
    } catch (err: any) {
      console.error("[API Onboarding] Erro Brandbook:", err);
      throw new Error(`Falha ao gravar escolhas visuais: ${err.message}`);
    }

    return NextResponse.json(
      { success: true, message: 'Briefing processado com sucesso.' }, 
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[Public Onboarding API Error]:", error);
    
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor ao processar o Briefing.' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
