// src/app/api/insights/instagram/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY_BRIEFING || '';
    const { briefingData, clientName } = await req.json();

    if (!briefingData) return NextResponse.json({ error: 'Dados não fornecidos.' }, { status: 400 });

    const systemPrompt = `
      Você é um Chief Marketing Officer (CMO) e Estrategista de Growth de alto nível.
      Analise o "Dossiê de Mercado" do cliente e forje uma "Estratégia de Dominação Digital".

      Cliente: ${clientName}
      Respostas do Dossiê: ${JSON.stringify(briefingData)}

      ESTRUTURA DO RELATÓRIO (Markdown):
      ### 1. Posicionamento de Elite e Brand Equity
      Como transformar o "Produto Âncora" em um objeto de desejo e como atacar o "Inimigo Comum" de forma elegante.

      ### 2. Funil de Conteúdo e Conversão (Atelier Method)
      Mapeie o que postar no Topo, Meio e Fundo de Funil baseado na Regra de Pareto citada pelo cliente.

      ### 3. Engenharia de Copywriting e Tom de Voz
      Baseado na "Persona da Marca", defina 3 regras de escrita para as legendas que gerem autoridade imediata.

      ### 4. Roadmap de 6 Meses (O Endgame)
      Plano tático para atingir o "Ponto de Chegada" (Objetivo Principal) com métricas de sucesso claras.

      REGRAS: Tom executivo, sofisticado, direto ao ponto. Sem introduções genéricas.
    `;

    const payload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 8192 }
    };

    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    
    // Tenta PRO, senão FLASH (Matriz de Fallback Senior)
    let response = await fetch(`${baseUrl}/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 404) {
      response = await fetch(`${baseUrl}/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();
    const aiInsight = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ insight: aiInsight });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao processar estratégia.' }, { status: 500 });
  }
}