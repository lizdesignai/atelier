// src/app/api/insights/curadoria/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa a API com a variável de ambiente específica para a Curadoria
const apiKey = process.env.GEMINI_API_KEY_CURADORIA || process.env.GEMINI_API_KEY_BRIEFING || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY_CURADORIA não encontrada no .env.local");
      return NextResponse.json({ error: 'Chave de API não configurada no servidor.' }, { status: 500 });
    }

    const { adminRefs, clientMoodboard, clientName } = await req.json();

    if (!adminRefs || adminRefs.length === 0) {
      return NextResponse.json({ error: 'Dados de curadoria não fornecidos.' }, { status: 400 });
    }

    // Preparação dos dados para a IA entender perfeitamente o feedback do cliente
    const formattedFeedback = adminRefs.map((ref: any) => `
      Direção Visual: ${ref.title}
      Nota do Cliente: ${ref.score}/10
      Feedback Atmosfera: ${ref.feedback?.q1 || 'Sem comentário'}
      Feedback Tipografia: ${ref.feedback?.q2 || 'Sem comentário'}
      Feedback Cores: ${ref.feedback?.q3 || 'Sem comentário'}
      Feedback Elementos: ${ref.feedback?.q4 || 'Sem comentário'}
    `).join('\n\n');

    // ============================================================================
    // O CÉREBRO DA OPERAÇÃO: ENGENHARIA DE PROMPT DE ALTO NÍVEL (CCO STANDARD)
    // ============================================================================
    const systemPrompt = `
      Você é um Chief Creative Officer (CCO) e Especialista em Semiótica Visual de marcas de alto luxo, com background em Psicologia da Gestalt, Teoria das Cores (Goethe/Kandinsky) e códigos visuais de marcas premium globais.

      O seu objetivo é analisar as avaliações que o cliente fez sobre as "Direções Visuais" (Moodboards) apresentadas pelo estúdio. Baseado nas notas e nos comentários (ou na ausência deles), você deve extrair um "Relatório de Semiótica e Direção de Arte" de classe mundial.

      DADOS DA CURADORIA:
      - Nome do Cliente: ${clientName}
      - Rotas Visuais e Feedbacks do Cliente: 
      ${formattedFeedback}

      ESTRUTURA OBRIGATÓRIA DO RELATÓRIO (Em Markdown impecável):

      ### 1. A Decodificação Semiótica (O Código Oculto)
      - Qual é o "DNA Visual" que o cliente está subconscientemente a procurar, com base nas rotas que tiveram as maiores notas?
      - Explique a semiótica por trás dessa preferência: o que estas escolhas comunicam ao cérebro primitivo do consumidor (ex: poder, pureza, disrupção, tradição)?

      ### 2. Psicologia da Estética Aprovada
      - **Cromatologia:** Analise o feedback sobre as cores. Que impacto psicológico e fisiológico a paleta preferida gera?
      - **Tipografia & Formas:** Com base no feedback sobre tipografia e elementos, explique os princípios da Gestalt que a marca deve adotar (ex: formas angulares para dominância, curvas para acolhimento).

      ### 3. O Fosso Estético (Luxo & Exclusividade)
      - Como utilizar estas preferências visuais para criar um "Fosso Estético" (Aesthetic Moat)?
      - Que códigos de luxo ou de alto valor agregado (ex: uso de espaço negativo, minimalismo cromático) devem ser aplicados para que a marca justifique um ticket premium?

      ### 4. O Veredito de Direção de Arte (Regras Inegociáveis)
      - Defina 3 a 4 regras visuais estritas, em formato de bullet points, que a equipa de design deve seguir cegamente na execução final do projeto para garantir a aprovação do cliente e o sucesso no mercado.

      REGRAS DE TOM E ESTILO:
      - Não use jargões de IA (Ex: "Aqui está a sua análise", "Em conclusão").
      - O tom deve ser de profunda autoridade criativa, sofisticação, academicamente embasado em teoria do design, mas altamente acionável para a equipa.
      - Utilize formatação Markdown rica (negritos para termos-chave, *bullet points* limpos).
      - Inicie a resposta diretamente no título da primeira secção.
    `;

    // Utilizando a versão oficial e garantida no plano atual
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash', // <--- CORREÇÃO AQUI (ÚNICA MUDANÇA)
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        maxOutputTokens: 8192,
      }
    });
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const aiInsight = response.text();

    return NextResponse.json({ insight: aiInsight });

  } catch (error: any) {
    console.error('Erro Crítico na geração de IA (Curadoria):', error);
    return NextResponse.json({ error: 'Falha ao processar os insights de semiótica visual da IA.' }, { status: 500 });
  }
}