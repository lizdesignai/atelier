// src/app/api/ai/command/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// INICIALIZAÇÃO DE INFRAESTRUTURA
// ============================================================================
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Payload inválido. Prompt obrigatório." }, { status: 400 });
    }

    if (!apiKey) {
      console.error("[Atelier Oracle] ERRO FATAL: GEMINI_API_KEY não configurada.");
      return NextResponse.json({ error: "Serviço de Inteligência temporariamente indisponível." }, { status: 503 });
    }

    const pLower = prompt.toLowerCase();

    // ============================================================================
    // 1. SMART INTENT PARSER (Classificação de Intenção)
    // ============================================================================
    const isProjectIntent = /projeto|tarefa|equipa|cliente|jtbd|prazo|atraso|quem|fazer/i.test(pLower);
    const isFinanceIntent = /faturamento|caixa|dinheiro|mrr|lucro|financeiro|orçamento/i.test(pLower);

    // ============================================================================
    // 2. RETRIEVAL-AUGMENTED GENERATION (RAG) OTIMIZADO
    // ============================================================================
    let contextPayload: any = {};
    const fetchPromises = [];

    // Busca Otimizada: Apenas Projetos Ativos e Tarefas Pendentes
    if (isProjectIntent || isFinanceIntent) { // Financeiro também precisa de projetos para ver LTV
      fetchPromises.push(
        supabase.from('projects')
          .select('id, status, type, data_limite, financial_value, profiles!inner(nome)')
          .in('status', ['active', 'delivered'])
          .limit(50) // Proteção contra saturação de RAM
      );
      
      fetchPromises.push(
        supabase.from('tasks')
          .select('id, title, status, estimated_time, deadline, profiles!assigned_to(nome)')
          .in('status', ['pending', 'in_progress', 'review'])
          .limit(100)
      );
    }

    const results = await Promise.all(fetchPromises);

    if (results.length > 0) {
      // 2.1 Extração e tratamento de erros dos resultados
      const projectsData = results[0]?.data || [];
      const tasksData = results[1]?.data || [];

      // 2.2 Lean Mapping (Minificação): Remove dados inúteis para poupar TOKENS da IA
      contextPayload.projetosAtivos = projectsData.map((p: any) => ({
        cliente: Array.isArray(p.profiles) ? p.profiles[0]?.nome : p.profiles?.nome,
        tipo: p.type,
        prazo: p.data_limite,
        status: p.status,
        valor: p.financial_value || 0
      }));

      contextPayload.tarefasPendentes = tasksData.map((t: any) => ({
        tarefa: t.title,
        responsavel: Array.isArray(t.profiles) ? t.profiles[0]?.nome : t.profiles?.nome,
        status: t.status,
        minutosEstimados: t.estimated_time || 60,
        prazo: t.deadline
      }));

      // 2.3 Resumo Analítico Pré-Calculado (Alivia o raciocínio do LLM)
      contextPayload.dashboard = {
        totalProjetos: projectsData.length,
        totalTarefasAbertas: tasksData.length,
        valorTotalEmAndamento: projectsData.reduce((acc: number, p: any) => acc + (p.financial_value || 0), 0)
      };
    }

    // ============================================================================
    // 3. CONFIGURAÇÃO DA IA (GEMINI 1.5 NATIVE SYSTEM INSTRUCTION)
    // ============================================================================
    const systemInstruction = `
      Você é a IA central do "Atelier OS", um sistema de gestão de agências de elite (nível Wall Street).
      O seu tom é estritamente profissional, hiper-direto, analítico e acionável. NUNCA use saudações amigáveis ou robóticas ("Olá", "Como posso ajudar"). Responda diretamente ao ponto.
      
      Regras de Resposta:
      1. Se a pergunta for sobre dados, use a seção [DADOS DO SISTEMA] abaixo para responder com precisão cirúrgica.
      2. Formate a resposta de forma escaneável: use bullet points curtos, negrito para números/nomes importantes.
      3. Se o utilizador pedir para EXECUTAR uma ação (ex: "cria uma tarefa para o João", "arquiva o projeto"), responda: 
         "Intenção compreendida. A capacidade de 'Function Calling' (Escrita na BD) está em fase de implantação pela engenharia. Por enquanto, atuo apenas como analista de leitura."
      4. Se os dados fornecidos não contiverem a resposta exata, não invente. Diga "Dados insuficientes no buffer de contexto atual."

      [DADOS DO SISTEMA (FORMATO LEAN JSON)]
      ${Object.keys(contextPayload).length > 0 ? JSON.stringify(contextPayload) : "Nenhum dado ativo no momento."}
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });

    // ============================================================================
    // 4. PROCESSAMENTO DA RESPOSTA
    // ============================================================================
    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    const executionTime = Date.now() - startTime;
    console.log(`[Atelier Oracle] Prompt processado em ${executionTime}ms`);

    return NextResponse.json({ reply: aiText });

  } catch (error) {
    console.error("[Atelier Oracle] Falha Crítica:", error);
    return NextResponse.json(
      { error: "Falha na comunicação com o motor de Inteligência Artificial. Verifique os logs." }, 
      { status: 500 }
    );
  }
}