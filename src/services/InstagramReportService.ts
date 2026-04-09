// src/services/InstagramReportService.ts
import { ApifyClient } from 'apify-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TIPAGENS DO MOTOR
// ============================================================================
export interface InstagramMetrics {
  followersCount: number;
  postsCount: number;
  avgEngagementRate: number;
  topPosts: Array<{
    url: string;
    imageUrl: string;
    caption: string;
    likes: number;
    comments: number;
    type: string;
  }>;
}

export interface AIReportOutput {
  executive_summary: string;
  detailed_analysis: string;
  action_plan: string;
  performance_score: number;
}

export class InstagramReportService {
  private apify: ApifyClient;
  private ai: GoogleGenerativeAI;

  constructor() {
    // Inicialização segura com fallback para evitar quebras em tempo de build
    this.apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });
    this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  /**
   * ============================================================================
   * 1. ORQUESTRADOR PRINCIPAL (O Método que a sua API/Cronjob vai chamar)
   * ============================================================================
   */
  public async generateMonthlyReport(projectId: string, instagramHandle: string): Promise<string> {
    console.log(`[CMO Engine] Iniciando auditoria profunda para o projeto: ${projectId}`);

    try {
      // 1. Coleta de Dados Brutos (Apify)
      const currentMetrics = await this.scrapeInstagramData(instagramHandle);

      // 2. Busca Contexto Histórico e Estratégico (Supabase)
      // Aqui trazemos não só os números, mas O QUE FOI FEITO (Planeamentos aprovados e tarefas concluídas)
      const { previousMetrics, projectContext, executedStrategy } = await this.getProjectContext(projectId);

      // 3. Processamento Neural (Google Gemini - CMO Persona)
      // CORREÇÃO APLICADA: Passagem correta da variável 'currentMetrics'
      const aiAnalysis = await this.generateAIAnalysis(currentMetrics, previousMetrics, projectContext, executedStrategy);

      // 4. Salvar Snapshot e Rascunho do Relatório (Supabase)
      await this.saveReportData(projectId, currentMetrics, aiAnalysis);

      console.log(`[CMO Engine] Sucesso! Relatório gerado em estado DRAFT para o projeto: ${projectId}`);
      return "Relatório estratégico gerado com sucesso e a aguardar revisão técnica.";

    } catch (error: any) {
      console.error(`[CMO Engine] Falha Crítica na Geração do Relatório:`, error);
      throw new Error(`Falha no motor de inteligência: ${error.message}`);
    }
  }

  /**
   * ============================================================================
   * 2. COLETOR DE DADOS (Integração Apify)
   * ============================================================================
   */
  private async scrapeInstagramData(handle: string): Promise<InstagramMetrics> {
    console.log(`[CMO Engine] Extraindo telemetria do perfil: @${handle}`);
    
    const run = await this.apify.actor('apify/instagram-profile-scraper').call({
      usernames: [handle.replace('@', '')],
    });

    const { items } = await this.apify.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      throw new Error("Perfil não encontrado ou API bloqueada pelo Instagram.");
    }

    const profileData = items[0] as any;
    const latestPosts = profileData.latestPosts || [];

    // Cálculo Rigoroso de Engajamento e triagem de Top Posts
    let totalEngagement = 0;
    const topPosts = latestPosts
      .sort((a: any, b: any) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(0, 3)
      .map((post: any) => {
        const postEngagement = (post.likesCount || 0) + (post.commentsCount || 0);
        totalEngagement += postEngagement;
        return {
          url: post.url || `https://instagram.com/p/${post.shortCode}`,
          imageUrl: post.displayUrl,
          caption: post.caption || '',
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          type: post.type
        };
      });

    const avgEngagementRate = latestPosts.length > 0 
      ? ((totalEngagement / latestPosts.length) / profileData.followersCount) * 100 
      : 0;

    return {
      followersCount: profileData.followersCount,
      postsCount: profileData.postsCount,
      avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
      topPosts
    };
  }

  /**
   * ============================================================================
   * 3. CONTEXTO DE NEGÓCIO E EXECUÇÃO (Supabase)
   * ============================================================================
   */
  private async getProjectContext(projectId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Snapshot do mês anterior
    const { data: snapshot } = await supabase
      .from('instagram_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Foco do Projeto
    const { data: project } = await supabase
      .from('projects')
      .select('current_focus, name, type')
      .eq('id', projectId)
      .single();

    // 🧠 INJEÇÃO DE CONTEXTO: O que a equipa realmente executou neste mês?
    const { data: contentPlans } = await supabase
      .from('content_planning')
      .select('hook, pillar, briefing')
      .eq('project_id', projectId)
      .in('status', ['approved', 'published'])
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      previousMetrics: snapshot || null,
      projectContext: project || { current_focus: 'Expansão de Audiência e Conversão' },
      executedStrategy: contentPlans || []
    };
  }

  /**
   * ============================================================================
   * 4. CÉREBRO ESTRATÉGICO (Google Gemini - Engenharia de Prompt Master)
   * ============================================================================
   */
  private async generateAIAnalysis(
    current: InstagramMetrics, 
    previous: any, 
    context: any,
    executedStrategy: any[]
  ): Promise<AIReportOutput> {
    console.log(`[CMO Engine] Consultando Oráculo IA (Gemini 1.5 Pro)...`);
    
    // O modelo Pro é obrigatório aqui para garantir raciocínio lógico profundo e não genérico
    const model = this.ai.getGenerativeModel({ 
      model: "gemini-1.5-pro", 
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.3 // Temperatura baixa para garantir coesão analítica e menos alucinação poética
      } 
    });

    const growthFollowers = previous ? current.followersCount - previous.followers_count : 0;
    
    // Sumariza a estratégia executada para a IA analisar a aderência
    const strategySummary = executedStrategy.length > 0 
      ? executedStrategy.map(cp => `- Eixo: ${cp.pillar} | Gancho/Abordagem: "${cp.hook}"`).join('\n')
      : "Manutenção orgânica de rotina sem campanhas específicas listadas.";

    const prompt = `
      Você é um Chief Marketing Officer (CMO) e Diretor Estratégico de uma agência de luxo chamada "Atelier".
      A sua missão é redigir um relatório mensal de performance para um cliente High-Ticket (Projeto: ${context.name}).
      
      DIRETRIZES DE TOM E ESTILO:
      - O seu tom deve ser magnético, sofisticado, brutalmente honesto, hiper-analítico e orientado a negócios (Business-driven).
      - ABSOLUTAMENTE PROIBIDO o uso de linguagem genérica, clichês de marketing de afiliados ou jargões robóticos de IA ("Neste relatório veremos", "Em suma", "Lembre-se que").
      - O cliente deve sentir que tem um gênio do marketing a analisar a sua marca com uma lupa, fazendo-o sentir que não precisa de se esforçar porque o Atelier já pensou em tudo.

      CONTEXTO DA OPERAÇÃO:
      - Foco Macro do Cliente estipulado para este ciclo: ${context.current_focus}
      - Estratégias e Linhas Editoriais efetivamente executadas pela nossa equipa neste mês:
      ${strategySummary}
      
      DADOS TELEMÉTRICOS ATUAIS:
      - Audiência Total: ${current.followersCount} seguidores (${growthFollowers >= 0 ? '+' : ''}${growthFollowers} vs mês anterior).
      - Taxa de Engajamento Global: ${current.avgEngagementRate}% (Atenção: Acima de 2% já é considerado excelente para marcas estabelecidas).
      
      DEEP DIVE NOS TOP 3 CONTEÚDOS COM MAIOR TRAÇÃO NESTE MÊS:
      ${current.topPosts.map((p, i) => `Posição ${i+1}: Formato [${p.type}] | Likes: ${p.likes} | Comentários: ${p.comments} | Legenda/Contexto: "${p.caption.substring(0, 150)}..."`).join('\n')}

      TAREFA:
      Sintetize estas informações e gere o relatório estruturado EXATAMENTE com as seguintes chaves JSON:

      1. "executive_summary": Um parágrafo denso e de alto impacto que resume o sentimento geral do mês, a aderência ao foco estratégico e o peso dos resultados.
      
      2. "detailed_analysis": Um texto longo e rico em formato Markdown. Divida em duas secções claras:
         - "Onde Vencemos": Analise psicologicamente e tecnicamente POR QUE os top posts funcionaram. Qual foi o gatilho semiótico ou narrativo que capturou a audiência? Como a estratégia que executamos impactou a retenção?
         - "Diagnóstico de Fricção": Uma análise franca sobre o que não performou como esperado, saturação de formatos, ou oportunidades perdidas no mercado. Mostre autoridade apontando o problema antes do cliente o ver.
      
      3. "action_plan": Um texto em formato Markdown listando 3 diretrizes táticas de intervenção para o próximo mês. O que o Atelier vai alterar na esteira de produção para escalar os resultados ou mitigar os problemas encontrados.
      
      4. "performance_score": Um número inteiro de 0 a 100 que reflete a saúde da operação neste mês, baseado no engajamento, crescimento e aderência à estratégia.

      Retorne APENAS o objeto JSON válido, sem formatações de bloco de código (\`\`\`json).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      return JSON.parse(responseText) as AIReportOutput;
    } catch (e) {
      console.error("[CMO Engine] Falha no parse do JSON. Resposta crua:", responseText);
      throw new Error("O oráculo de IA gerou uma resposta malformada.");
    }
  }

  /**
   * ============================================================================
   * 5. PERSISTÊNCIA DE DADOS (Salva o Snapshot e o Rascunho do Relatório)
   * ============================================================================
   */
  private async saveReportData(projectId: string, metrics: InstagramMetrics, aiOutput: AIReportOutput) {
    const now = new Date();
    
    // 1. Grava o Snapshot (Registo histórico imutável)
    const { error: snapError } = await supabase.from('instagram_snapshots').insert({
      project_id: projectId,
      followers_count: metrics.followersCount,
      posts_count: metrics.postsCount,
      avg_engagement_rate: metrics.avgEngagementRate,
      top_posts_data: metrics.topPosts, 
      month_year: now.toISOString()
    });

    if (snapError) throw snapError;

    // 2. Grava o Relatório para a equipa gerencial revisar antes de ir para o cliente
    const { error: repError } = await supabase.from('monthly_reports').insert({
      project_id: projectId,
      report_month_year: now.toISOString(),
      executive_summary: aiOutput.executive_summary,
      detailed_analysis: aiOutput.detailed_analysis,
      action_plan: aiOutput.action_plan,
      performance_score: aiOutput.performance_score,
      status: 'draft' 
    });

    if (repError) throw repError;
  }
}

// Exporta o Singleton
export const instagramReportService = new InstagramReportService();