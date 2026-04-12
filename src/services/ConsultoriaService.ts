// src/services/ConsultoriaService.ts
import { ApifyClient } from 'apify-client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// TIPAGENS DE ALTA COMPLEXIDADE (Dossiê Estratégico)
// ============================================================================
export interface ConsultoriaInput {
  nome: string;
  nicho: string;
  instagram: string;
}

export interface ConsultoriaOutput {
  brand_archetype: string;
  visual_diagnosis: string;
  tone_of_voice: string;
  stories_strategy: string;
  content_pillars: string[];
  strategic_justification: string; 
  market_positioning: string;      
}

interface DeepDataLake {
  profile: any;
  engagementStats: {
    realEngagementRate: string;
    retentionPower: string;
    sentimentAnalysis: string;
  };
  contentInventory: {
    type: string;
    copy: string;
    performance: number;
    visualPattern: string;
  }[];
  rawBio: string;
}

export class ConsultoriaService {
  private apify: ApifyClient;
  private ai: GoogleGenerativeAI;
  private rapidApiKey: string;

  constructor() {
    this.apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });
    this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.rapidApiKey = process.env.INSTAGRAM_SCRAPER_API_KEY || '';
  }

  public async generateConsulting(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    console.log(`[Elite Intelligence] Iniciando varredura profunda: @${input.instagram}`);

    const handle = input.instagram.replace('@', '').trim();

    try {
      // 1. DATA LAKE INGESTION (Resiliente: não quebra a aplicação se os scrapers falharem)
      const [meta, deepContent] = await Promise.all([
        this.fetchProfileMeta(handle),
        this.fetchHeavyContent(handle)
      ]);

      // 2. SEMANTIC DATA PROCESSING
      const lake = this.buildDataLake(meta, deepContent);

      // 3. AI STRATEGIC ORCHESTRATION
      const report = await this.executeStrategicAnalysis(input, lake);

      return report;

    } catch (error: any) {
      console.error(`[Critical Failure] Motor de Consultoria interrompido:`, error);
      throw new Error(`Erro na síntese estratégica: ${error.message}`);
    }
  }

  private async fetchProfileMeta(handle: string) {
    if (!this.rapidApiKey) return null; // Evita falha se não houver chave
    try {
      const response = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${handle}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.rapidApiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data;
    } catch (error) {
      console.warn(`[Scraper Warning] Falha ao obter Metadados do perfil @${handle}`);
      return null;
    }
  }

  private async fetchHeavyContent(handle: string) {
    if (!process.env.APIFY_API_TOKEN) return []; // Evita falha se não houver chave
    try {
      const run = await this.apify.actor('apify/instagram-profile-scraper').call({
        usernames: [handle],
        resultsLimit: 25 
      });
      const { items } = await this.apify.dataset(run.defaultDatasetId).listItems();
      return items || [];
    } catch (error) {
      console.warn(`[Scraper Warning] Falha ao obter Inventário de Conteúdo de @${handle}`);
      return [];
    }
  }

  private buildDataLake(meta: any, items: any[]): DeepDataLake {
    // Fallback gracioso se não houver dados
    if (!items || items.length === 0) {
       return {
         profile: meta || null,
         engagementStats: {
           realEngagementRate: "0.00",
           retentionPower: "Análise Ausente (Modo de Projeção Teórica Ativado)",
           sentimentAnalysis: "Extraída com base nos padrões industriais do nicho"
         },
         contentInventory: [],
         rawBio: meta?.biography || "Não foi possível extrair a biografia atual."
       };
    }

    const profile = items[0] || {};
    const posts = items.map(item => ({
      type: item.type || 'unknown',
      copy: item.caption || '',
      performance: (item.likesCount || 0) + (item.commentsCount || 0),
      visualPattern: item.displayUrl || ''
    }));

    // Cálculos de BI
    const totalFollowers = meta?.follower_count || profile.followersCount || 1;
    const avgInteraction = posts.length > 0 ? (posts.reduce((acc, curr) => acc + curr.performance, 0) / posts.length) : 0;
    const er = ((avgInteraction / totalFollowers) * 100).toFixed(2);

    return {
      profile: meta,
      engagementStats: {
        realEngagementRate: er,
        retentionPower: Number(er) > 2 ? "Alta Autoridade" : "Audiência Adormecida",
        sentimentAnalysis: "Extraída dinamicamente pelo oráculo"
      },
      contentInventory: posts,
      rawBio: meta?.biography || profile.biography || ""
    };
  }

  private async executeStrategicAnalysis(input: ConsultoriaInput, lake: DeepDataLake): Promise<ConsultoriaOutput> {
    if (!this.ai) throw new Error("Chave de API do Gemini não configurada.");

    const model = this.ai.getGenerativeModel({ 
      model: "gemini-1.5-pro", 
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 } 
    });

    const inventoryText = lake.contentInventory.length > 0 
      ? lake.contentInventory.map(p => `- [${p.type}] Feedback: ${p.performance} interações | Texto: ${p.copy.substring(0, 150)}...`).join('\n')
      : "Dados de conteúdo inacessíveis. Projete a estratégia assumindo que o cliente precisa de uma reestruturação absoluta a partir do zero.";

    const prompt = `
      Você é o Diretor de Estratégia (CMO) do Atelier OS, uma consultoria de Branding e Marketing de Resposta Direta de Ultra-Luxo.
      Seu objetivo é produzir um documento de intervenção estratégica para @${input.instagram}.
      Este documento deve ter o embasamento de uma consultoria de $20k dólares.

      REPERTÓRIO TÉCNICO OBRIGATÓRIO (Use para fundamentar):
      - Pirâmide de Consciência de Eugene Schwartz.
      - 16 Gatilhos Mentais de Robert Cialdini.
      - Branding Arquetípico (Mark & Pearson).
      - Design Semiótico e Teoria das Cores Aplicada ao High-Ticket.
      - Estruturas de Copy de Resposta Direta (AIDA, PAS, PPPP).

      DADOS DO DATA LAKE:
      - Nicho: ${input.nicho}
      - Bio Atual: "${lake.rawBio}"
      - Taxa de Engajamento Real: ${lake.engagementStats.realEngagementRate}% (Referência: <1% é crítico, >3% é autoridade).
      - Inventário de Conteúdo:
      ${inventoryText}

      ESTRUTURA DE SAÍDA EXIGIDA (Retorne ESTRITAMENTE o JSON abaixo):
      {
        "brand_archetype": "Defina o Arquétipo Mestre e a Sombra Arquetípica que o cliente está manifestando sem saber. Justifique com base no comportamento observado.",
        "visual_diagnosis": "Mergulho profundo na semiótica. Analise o ruído visual atual. Prescreva paleta de cores hexadecimais, família tipográfica e diretrizes de composição editorial para transacionar valor de luxo. Proíba o uso de elementos 'populares' que barateiam a marca.",
        "tone_of_voice": "Prescreva a voz da marca. Use conceitos de Linguística e Psicologia Comportamental. O tom deve ser prescritivo, soberano e magnético. Como ela deve tratar as objeções do nicho de ${input.nicho}?",
        "content_pillars": ["Pilar Autoral 1: Justificativa", "Pilar Autoral 2: Justificativa", "Pilar Autoral 3: Justificativa"],
        "stories_strategy": "Crie um protocolo de 24 horas (Manhã/Tarde/Noite). Use frameworks de 'Storytelling de Bastidor Intencional' para converter audiência em leads qualificados via Direct.",
        "strategic_justification": "Aqui reside o peso do documento. Escreva um texto longo (mínimo 400 palavras) fundamentando cientificamente por que as mudanças acima são necessárias. Cite referências de marketing e comportamento humano.",
        "market_positioning": "Defina o 'Oceano Azul' deste cliente. Como ele se torna incomparável frente aos concorrentes diretos? Qual é a Proposta Única de Valor (UVP) de elite que ele deve assumir agora?"
      }

      REGRAS DE OURO:
      - O formato de resposta DEVE ser um objeto JSON válido.
      - Proibido usar palavras como 'incrível', 'jornada', 'sonhos'. Use 'tração', 'equity', 'posicionamento dominante', 'estímulo semiótico'.
      - O texto deve ser denso, intelectualmente estimulante e autoritário.
    `;

    const result = await model.generateContent(prompt);
    
    // Extrai o texto da resposta
    let rawResponse = result.response.text();
    
    // 🛡️ Limpeza Defensiva: O Gemini por vezes envolve o JSON em backticks markdown mesmo pedindo MIME type json
    rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const response = JSON.parse(rawResponse);
    return response as ConsultoriaOutput;
  }
}

export const consultoriaService = new ConsultoriaService();