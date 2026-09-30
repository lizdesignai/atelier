import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY_BRIEFING || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Chave de API do Gemini não configurada no servidor.');

    const { briefingData, clientName, projectId } = await req.json();

    if (!briefingData) {
      return NextResponse.json({ error: 'O Dossiê do cliente está vazio.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json", 
      }
    });

    const systemPrompt = `
      Você é a inteligência estratégica do Atelier. Analise o briefing do cliente para o projeto de Identidade Visual e extraia um 'Brand Snapshot' preciso e direto.

      Cliente: ${clientName}
      Briefing: ${JSON.stringify(briefingData)}

      Retorne UMA ESTRUTURA JSON EXATA:
      {
        "essencia": "Frase curta (max 10 palavras) que resume o que a marca fundamentalmente é.",
        "publico": "Quem é, o que sente e o que busca (max 2 frases).",
        "problema": "O problema central que o negócio resolve (max 2 frases).",
        "promessa": "A promessa central da marca.",
        "personalidade": ["Adjetivo 1", "Adjetivo 2", "Adjetivo 3", "Adjetivo 4"],
        "diferenciais": "Diferenciais reais identificados.",
        "ambiente_competitivo": "Como a marca se posiciona frente aos concorrentes.",
        "anti_patterns": "O que a marca NÃO deve parecer (baseado nos adjetivos negativos/restrições)."
      }
    `;

    console.log(`[IA Estratégica] Gerando Brand Snapshot para: ${clientName}...`);
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    const aiData = JSON.parse(responseText);

    if (projectId) {
      const sql = getDb();
      // Remove any previous snapshot to keep it simple, or just insert new one
      await sql`DELETE FROM brand_snapshots WHERE project_id = ${projectId}`;
      
      // Compatibilidade retroativa para a UI atual
      const finalMarkdown = `### 1. Essência\n${aiData.essencia}\n\n### 2. A Promessa\n${aiData.promessa}\n\n### 3. O Problema que Resolve\n${aiData.problema}\n\n### 4. Personalidade\n${aiData.personalidade.join(', ')}\n\n### 5. Público\n${aiData.publico}\n\n### 6. Anti-Patterns\n${aiData.anti_patterns}`;

      await sql`
        INSERT INTO brand_snapshots (
          project_id, essencia, publico, problema, promessa, personalidade, diferenciais, ambiente_competitivo, anti_patterns, ai_raw, status
        ) VALUES (
          ${projectId}, ${aiData.essencia}, ${aiData.publico}, ${aiData.problema}, ${aiData.promessa}, 
          ${JSON.stringify(aiData.personalidade)}::jsonb, ${aiData.diferenciais}, ${aiData.ambiente_competitivo}, ${aiData.anti_patterns}, ${JSON.stringify(aiData)}::jsonb, 'draft'
        )
      `;
    } else {
      // Se não tem projectId, só precisamos retornar
    }

    const finalMarkdown = `### 1. Essência\n${aiData.essencia}\n\n### 2. A Promessa\n${aiData.promessa}\n\n### 3. O Problema que Resolve\n${aiData.problema}\n\n### 4. Personalidade\n${aiData.personalidade.join(', ')}\n\n### 5. Público\n${aiData.publico}\n\n### 6. Anti-Patterns\n${aiData.anti_patterns}`;

    return NextResponse.json({ snapshot: aiData, insight: finalMarkdown });

  } catch (error: any) {
    console.error('[IA Estratégica] Erro:', error);
    return NextResponse.json({ error: error.message || 'Falha no processamento da IA.' }, { status: 500 });
  }
}
