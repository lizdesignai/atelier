import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY_BRIEFING || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Chave de API do Gemini não configurada no servidor.');

    const { projectId, clientName, tilt, semiotics, voice, synapses } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID é obrigatório.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', 
      generationConfig: {
        temperature: 0.65,
        responseMimeType: "application/json", 
      }
    });

    const systemPrompt = `
      Você é a inteligência estratégica do Atelier. Estamos forjando o "DNA da Marca" (Brand DNA) para o projeto de Identidade Visual.
      
      DADOS DO LABORATÓRIO (escolhas do cliente):
      - Cliente: ${clientName}
      - Content Tilt: ${JSON.stringify(tilt)}
      - Semiótica Visual: ${JSON.stringify(semiotics)}
      - Tom de Voz: ${JSON.stringify(voice)}
      - Razões das Referências Visuais: ${JSON.stringify(synapses.map((s: any) => s.reason))}

      Retorne UMA ESTRUTURA JSON EXATA do Brand DNA:
      {
        "propocito": "O propósito fundamental e inegociável da marca (max 2 frases).",
        "arquetipo": "O arquétipo principal da marca (ex: O Sábio, O Criador, O Mago) e uma breve justificativa.",
        "tom_de_voz": {
          "descritivo": "Como a marca soa (ex: Direta, sofisticada, sem jargões).",
          "regras": ["Regra 1 de copywriting", "Regra 2", "Regra 3"]
        },
        "diretrizes_visuais": {
          "cores": "Direcionamento cromático psicológico (ex: Tons quentes e terrosos para acolhimento).",
          "tipografia": "Direcionamento tipográfico (ex: Serifas elegantes contrastadas com grotescas).",
          "fotografia": "Como devem ser as imagens (ex: Foco macro, luz natural)."
        },
        "manifesto": "Um parágrafo curto, poderoso e poético que resume a atitude da marca perante o mundo."
      }
    `;

    console.log(`[IA Brand DNA] Sintetizando DNA para: ${clientName}...`);
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    const aiData = JSON.parse(responseText);

    const sql = getDb();
    // Atualizar no projects, ou numa tabela específica de Brand DNA. 
    // Como brandbook_laboratory já existe e guarda as choices, vamos guardar lá.
    await sql`
      UPDATE brandbook_laboratory
      SET ai_source_code = ${JSON.stringify(aiData)}::jsonb,
          updated_at = NOW()
      WHERE project_id = ${projectId}
    `;

    // Atualiza a fase se ainda estiver no brand lab
    await sql`
      UPDATE projects
      SET idv_phase = 'direcionar'
      WHERE id = ${projectId} AND idv_phase = 'brand_lab'
    `;

    return NextResponse.json({ dna: aiData });

  } catch (error: any) {
    console.error('[IA Brand DNA] Erro:', error);
    return NextResponse.json({ error: error.message || 'Falha no processamento da IA.' }, { status: 500 });
  }
}
