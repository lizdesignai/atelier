// src/app/api/insights/briefing/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY_BRIEFING || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Chave de API do Gemini não configurada no servidor.');

    const { briefingData, clientName } = await req.json();

    if (!briefingData) {
      return NextResponse.json({ error: 'O Dossiê do cliente está vazio.' }, { status: 400 });
    }

    // 1. Instanciação do SDK com o Modelo Moderno
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7, // Mantido 0.7 conforme o seu original para criatividade de Marketing
        responseMimeType: "application/json", 
      }
    });

    // 2. Prompt Original Fundido com o Schema JSON
    const systemPrompt = `
      Você é um Chief Marketing Officer (CMO) e Estrategista de Growth de alto nível.
      Analise o "Dossiê de Mercado" do cliente e forje uma "Estratégia de Dominação Digital".

      Cliente: ${clientName}
      Respostas do Dossiê: ${JSON.stringify(briefingData)}

      REGRAS DE TOM E ESTILO:
      - Tom executivo, sofisticado, direto ao ponto. 
      - Sem introduções genéricas ou jargões de IA.

      Retorne UMA ESTRUTURA JSON EXATA (sem blocos de código markdown \`\`\`json, apenas o objeto puro):
      {
        "posicionamento": "Descreva como transformar o 'Produto Âncora' em um objeto de desejo e como atacar o 'Inimigo Comum' de forma elegante.",
        "funil": "Mapeie o que postar no Topo, Meio e Fundo de Funil baseado na Regra de Pareto citada pelo cliente (Atelier Method).",
        "copywriting": [
          "Regra 1 de escrita e tom de voz para gerar autoridade imediata.",
          "Regra 2 de escrita e tom de voz para gerar autoridade imediata.",
          "Regra 3 de escrita e tom de voz para gerar autoridade imediata."
        ],
        "roadmap": "Plano tático para atingir o 'Ponto de Chegada' (Objetivo Principal) em 6 meses, com métricas de sucesso claras."
      }
    `;

    console.log(`[IA CMO] A invocar gemini-2.5-flash (Modo JSON) para: ${clientName}...`);
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    // 3. Adapter Pattern: Parse do JSON e conversão para o Markdown que o Frontend espera
    const aiData = JSON.parse(responseText);

    const finalMarkdown = `### 1. Posicionamento de Elite e Brand Equity
${aiData.posicionamento}

### 2. Funil de Conteúdo e Conversão (Atelier Method)
${aiData.funil}

### 3. Engenharia de Copywriting e Tom de Voz
${aiData.copywriting.map((regra: string) => `- ${regra}`).join('\n')}

### 4. Roadmap de 6 Meses (O Endgame)
${aiData.roadmap}`;

    return NextResponse.json({ insight: finalMarkdown });

  } catch (error: any) {
    console.error('[IA CMO] Erro Crítico:', error);
    return NextResponse.json({ error: error.message || 'Falha no processamento da IA.' }, { status: 500 });
  }
}