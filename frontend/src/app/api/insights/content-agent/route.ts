// src/app/api/insights/content-agent/route.ts
import { NextResponse } from 'next/server';
import { CopilotEngine } from '../../../../lib/CopilotEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Inicialização do Cliente Gemini com a chave de Branding
const apiKey = process.env.GEMINI_API_KEY_BRANDING || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    // 2. Extração dos dados enviados pelo painel de Gerenciamento
    const body = await request.json();
    const { prompt, labData, clientName, history = [] } = body;

    if (!prompt) {
      return NextResponse.json({ error: "O prompt do utilizador é obrigatório." }, { status: 400 });
    }

    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY_BRANDING não está configurada.");
      return NextResponse.json({ error: "Configuração de API ausente." }, { status: 500 });
    }

    // 3. Geração do System Prompt (As regras do CMO com Ogilvy, ERRC, Schwartz)
    const systemInstruction = CopilotEngine.buildSystemPrompt(labData, clientName || "Cliente Padrão");

    // 4. Formatação do Histórico para o padrão do Gemini
    // O Gemini usa 'user' para o utilizador e 'model' para a IA.
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // 5. Configuração do Modelo
    // Utilizamos o gemini-1.5-pro por ser o mais indicado para raciocínio complexo de copywriting
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: systemInstruction,
    });

    // 6. Inicia a sessão de chat com o contexto prévio
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.7, // Equilíbrio entre criatividade literária e rigor estratégico
        maxOutputTokens: 1000,
      },
    });

    // 7. Envia a nova mensagem do gestor e aguarda a resposta
    const result = await chat.sendMessage(prompt);
    const aiResponseText = result.response.text();

    // 8. Devolve a resposta tática para a interface
    return NextResponse.json({ insight: aiResponseText });

  } catch (error) {
    console.error("[Agente de Conteúdo] Erro na API do Gemini:", error);
    return NextResponse.json(
      { error: "Falha ao forjar o conteúdo com a Inteligência Artificial." }, 
      { status: 500 }
    );
  }
}