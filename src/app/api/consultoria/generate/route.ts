// src/app/api/consultoria/generate/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { consultoriaService } from '@/services/ConsultoriaService';

export async function POST(request: Request) {
  try {
    // Validação de Segurança (Apenas utilizadores autenticados podem rodar consultorias)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const body = await request.json();
    const { nome, nicho, instagram } = body;

    if (!nome || !nicho || !instagram) {
      return NextResponse.json({ error: 'Dados insuficientes. Nome, Nicho e Instagram são obrigatórios.' }, { status: 400 });
    }

    // Executa a máquina de extração e inteligência
    const insight = await consultoriaService.generateConsulting({ nome, nicho, instagram });

    return NextResponse.json({ success: true, insight });

  } catch (error: any) {
    console.error("[API Consultoria] Erro interno:", error);
    return NextResponse.json({ 
      error: error.message || 'Falha ao processar a auditoria estratégica.' 
    }, { status: 500 });
  }
}