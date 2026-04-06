// src/app/api/insights/curadoria/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY_CURADORIA || process.env.GEMINI_API_KEY_BRIEFING || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Chave de API do Gemini não configurada no servidor.');

    const { adminRefs, clientName } = await req.json();

    if (!adminRefs || adminRefs.length === 0) {
      return NextResponse.json({ error: 'Dados de curadoria ausentes.' }, { status: 400 });
    }

    const formattedFeedback = adminRefs.map((ref: any, idx: number) => `
      Direção Visual: ${ref.title}
      Nota do Cliente: ${ref.score}/10
      Feedback Atmosfera: ${ref.feedback?.q1 || 'Sem comentário'}
      Feedback Tipografia: ${ref.feedback?.q2 || 'Sem comentário'}
      Feedback Cores: ${ref.feedback?.q3 || 'Sem comentário'}
      Feedback Elementos: ${ref.feedback?.q4 || 'Sem comentário'}
    `).join('\n\n');

    // 1. Instanciação do SDK com o Modelo Moderno
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', 
      generationConfig: {
        temperature: 0.65, // Calibração Sênior: Frio o suficiente para ser técnico, quente para ser criativo
        responseMimeType: "application/json", 
      }
    });

    // 2. Prompt Original Fundido com Schema JSON
    const systemPrompt = `
      Você é um Chief Creative Officer (CCO) e Especialista em Semiótica Visual de marcas de alto luxo, com background em Psicologia da Gestalt, Teoria das Cores (Goethe/Kandinsky) e códigos visuais de marcas premium globais.

      O seu objetivo é analisar as avaliações que o cliente fez sobre as "Direções Visuais" (Moodboards) apresentadas pelo estúdio.

      DADOS DA CURADORIA:
      - Nome do Cliente: ${clientName}
      - Rotas Visuais e Feedbacks do Cliente: 
      ${formattedFeedback}

      REGRAS DE TOM E ESTILO:
      - ZERO jargões de IA. Sem "Aqui está a análise".
      - O tom deve ser de profunda autoridade criativa, sofisticação e academicamente embasado.
      
      Retorne UMA ESTRUTURA JSON EXATA (sem blocos markdown \`\`\`json, apenas o objeto puro):
      {
        "decodificacao": "O 'DNA Visual' que o cliente está subconscientemente a procurar (baseado nas notas altas) e a semiótica por trás disso (ex: poder, pureza, disrupção).",
        "psicologia": "Análise da Cromatologia (impacto psicológico) e Tipografia/Formas baseadas nos princípios da Gestalt.",
        "fosso_estetico": "Como utilizar estas preferências para criar um 'Aesthetic Moat' justificando um ticket premium.",
        "regras_de_ouro": [
          "Regra estrita 1 para a equipa", 
          "Regra estrita 2 para a equipa", 
          "Regra estrita 3 para a equipa"
        ]
      }
    `;

    console.log(`[IA CCO] A invocar gemini-2.5-flash (Modo JSON) para Curadoria de: ${clientName}...`);
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    const aiData = JSON.parse(responseText);

    // 3. Adapter Pattern: Mapeamento de volta para o Markdown limpo e impecável que a UI exige
    const finalMarkdown = `### 1. A Decodificação Semiótica (O Código Oculto)
${aiData.decodificacao}

### 2. Psicologia da Estética Aprovada
${aiData.psicologia}

### 3. O Fosso Estético (Luxo & Exclusividade)
${aiData.fosso_estetico}

### 4. O Veredito de Direção de Arte (Regras Inegociáveis)
${aiData.regras_de_ouro.map((regra: string) => `- ${regra}`).join('\n')}`;

    return NextResponse.json({ insight: finalMarkdown });

  } catch (error: any) {
    console.error('[IA CCO] Erro Crítico:', error);
    return NextResponse.json({ error: error.message || 'Falha no processamento da IA.' }, { status: 500 });
  }
}