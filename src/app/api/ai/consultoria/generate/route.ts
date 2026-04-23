// src/app/api/ai/consultoria/generate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { consultoriaService } from '@/services/ConsultoriaService';

// 🛡️ INICIALIZAÇÃO DE SERVIDOR SEGURA (Ignora RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, nicho, instagram, consultoriaId } = body;

    // 1. Validação Rigorosa de Payload
    if (!nome || !nicho || !instagram) {
      return NextResponse.json({ error: 'Dados insuficientes. Nome, Nicho e Instagram são obrigatórios.' }, { status: 400 });
    }

    // 2. Extração e Inteligência Artificial
    console.log(`[Consultoria] Iniciando auditoria para ${instagram}...`);
    const insight = await consultoriaService.generateConsulting({ nome, nicho, instagram });

    // 3. Atualização Segura no Banco de Dados (Se o frontend passar o ID da consultoria)
    if (consultoriaId) {
      const { error: updateError } = await supabaseAdmin
        .from('consultorias')
        .update({ 
            ai_analysis: insight,
            status: 'analisada',
            updated_at: new Date().toISOString()
        })
        .eq('id', consultoriaId);

      if (updateError) {
        console.error("[Consultoria] Erro ao salvar análise no banco:", updateError);
        // Não quebramos o fluxo aqui, apenas registamos o erro para depuração
      }
    }

    // 4. Retorno Limpo em JSON
    return NextResponse.json({ success: true, insight });

  } catch (error: any) {
    console.error("[API Consultoria] Falha Crítica:", error);
    
    // Devolvemos um JSON válido mesmo no erro, para evitar o "Unexpected token '<'"
    return NextResponse.json({ 
      error: error.message || 'Falha ao processar a auditoria estratégica pelo motor de IA.' 
    }, { status: 500 });
  }
}