// src/app/api/insights/curadoria/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Lemos a chave DENTRO da função para evitar bugs de cache do Next.js (Fast Refresh)
    const apiKey = process.env.GEMINI_API_KEY_CURADORIA || process.env.GEMINI_API_KEY_BRIEFING || '';
    
    if (!apiKey) {
      console.error("ERRO: Nenhuma chave de API encontrada no ambiente.");
      return NextResponse.json({ error: 'Chave de API não configurada.' }, { status: 500 });
    }

    const { adminRefs, clientName } = await req.json();

    if (!adminRefs || adminRefs.length === 0) {
      return NextResponse.json({ error: 'Dados de curadoria não fornecidos.' }, { status: 400 });
    }

    // Preparação dos dados
    const formattedFeedback = adminRefs.map((ref: any) => `
      Direção Visual: ${ref.title}
      Nota do Cliente: ${ref.score}/10
      Feedback Atmosfera: ${ref.feedback?.q1 || 'Sem comentário'}
      Feedback Tipografia: ${ref.feedback?.q2 || 'Sem comentário'}
      Feedback Cores: ${ref.feedback?.q3 || 'Sem comentário'}
      Feedback Elementos: ${ref.feedback?.q4 || 'Sem comentário'}
    `).join('\n\n');

    // O CÉREBRO (CCO STANDARD)
    const systemPrompt = `
      Você é um Chief Creative Officer (CCO) e Especialista em Semiótica Visual de marcas de alto luxo.
      Analise as avaliações do cliente sobre as "Direções Visuais" (Moodboards) apresentadas.

      Cliente: ${clientName}
      Rotas Visuais e Feedbacks: 
      ${formattedFeedback}

      ESTRUTURA OBRIGATÓRIA DO RELATÓRIO (Em Markdown impecável):
      ### 1. A Decodificação Semiótica (O Código Oculto)
      Qual o "DNA Visual" que o cliente procura com base nas maiores notas?

      ### 2. Psicologia da Estética Aprovada
      Cromatologia e princípios da Gestalt aplicáveis.

      ### 3. O Fosso Estético (Luxo & Exclusividade)
      Como justificar um ticket premium com estas escolhas.

      ### 4. O Veredito de Direção de Arte
      3 a 4 regras visuais inegociáveis para a equipa seguir.

      REGRAS: Tom de autoridade, direto, sem introduções de IA.
    `;

    // 2. O BYPASS SENIOR: Configuração da chamada nativa (REST)
    const payload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        maxOutputTokens: 8192,
      }
    };

    // 3. A MATRIZ DE FALLBACK (Tenta o PRO, se falhar, tenta o FLASH)
    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    
    console.log("A invocar API do Google (Tentativa 1: PRO)...");
    let response = await fetch(`${baseUrl}/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 404) {
      console.warn("⚠️ Modelo PRO bloqueado ou não encontrado. A acionar fallback para o FLASH...");
      response = await fetch(`${baseUrl}/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();

    // 4. INTERCEPTAÇÃO DE ERRO REAL DA GOOGLE
    if (!response.ok) {
      console.error("🔥 ERRO FATAL DA GOOGLE (SEM FILTROS):", JSON.stringify(data, null, 2));
      throw new Error(data.error?.message || "Ocorreu um erro nos servidores da Google.");
    }

    // 5. Extração segura da resposta
    const aiInsight = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiInsight) {
      throw new Error("A API da Google não devolveu nenhum texto válido.");
    }

    return NextResponse.json({ insight: aiInsight });

  } catch (error: any) {
    console.error('Erro Crítico na geração de IA (Curadoria):', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar os insights.' }, { status: 500 });
  }
}