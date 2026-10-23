// frontend/src/lib/unifiedBriefing.ts
import { getDb } from '@/lib/db';
import { normalizeBriefingAnswers } from '@/lib/briefingConstants';

export interface UnifiedBriefingResult {
  briefing: Record<string, any> | null;
  source: 'client_briefings' | 'briefings_identidade_visual' | null;
  normalizedAnswers: Array<{ key: string; label: string; value: any }>;
  competitorsData: any[] | null;
  clientInfo: {
    nome?: string;
    email?: string;
    projectName?: string;
  };
}

/**
 * Busca e unifica o briefing de um projeto, verificando tanto client_briefings
 * quanto briefings_identidade_visual com fallback inteligente e unwrap de answers.
 */
export async function getUnifiedProjectBriefing(projectId: string): Promise<UnifiedBriefingResult> {
  const sql = getDb();

  // 1. Obter informações do projeto e cliente
  const projects = await sql`
    SELECT p.id, p.client_id, pr.email, pr.nome, p.idv_product, p.idv_phase
    FROM projects p
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE p.id = ${projectId}
    LIMIT 1
  `;

  if (!projects.length) {
    return {
      briefing: null,
      source: null,
      normalizedAnswers: [],
      competitorsData: null,
      clientInfo: {}
    };
  }

  const project = projects[0];
  const clientEmail = (project.email || '').trim();
  const clientNome = (project.nome || '').trim();
  const clientInfo = {
    nome: clientNome,
    email: clientEmail,
    projectName: clientNome || 'Identidade Visual'
  };

  // 2. Tentar buscar em client_briefings (in-app modal briefing)
  const cbRows = await sql`
    SELECT * FROM client_briefings 
    WHERE project_id = ${projectId} 
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  if (cbRows.length > 0 && cbRows[0]) {
    const row = cbRows[0];
    const answers = row.answers && typeof row.answers === 'object' ? row.answers : {};
    
    // Unwrapping completo: mescla as respostas no nível raiz
    const merged = {
      ...answers,
      id: row.id,
      project_id: row.project_id,
      client_id: row.client_id,
      is_completed: row.is_completed,
      created_at: row.created_at,
      // Garante chaves padronizadas
      nome: answers.nome || clientNome,
      email: answers.email || clientEmail,
      whatsapp: answers.whatsapp || '',
      nome_logo: answers.nome_logo || answers.Nome_Logotipo || '',
      concorrentes: answers.concorrentes || answers.Concorrentes || answers.concorrentes_links || '',
      concorrentes_links: answers.concorrentes_links || answers.Links_Concorrentes || '',
      concorrentes_bom: answers.concorrentes_bom || answers.Concorrentes_Bom || '',
      fazer_diferente: answers.fazer_diferente || answers.Fazer_Diferente || '',
      evitar_mercado: answers.evitar_mercado || answers.Evitar_Mercado || '',
      diferenca_percebida: answers.diferenca_percebida || answers.Diferenca_Percebida || '',
      nao_fazer: answers.nao_fazer || answers.O_Que_Nao_Fazer || '',
      diferencial: answers.diferencial || answers.Diferencial || ''
    };

    const competitorsData = answers.competitors_data || row.competitors_data || null;

    return {
      briefing: merged,
      source: 'client_briefings',
      normalizedAnswers: normalizeBriefingAnswers(merged),
      competitorsData,
      clientInfo
    };
  }

  // 3. Fallback: Tentar buscar em briefings_identidade_visual (formulário externo completo)
  let bivRows: any[] = [];
  if (clientEmail) {
    bivRows = await sql`
      SELECT * FROM briefings_identidade_visual 
      WHERE "Email" ILIKE ${clientEmail} 
         OR (dados_completos->>'Email') ILIKE ${clientEmail} 
         OR (dados_completos->>'email') ILIKE ${clientEmail}
      ORDER BY created_at DESC 
      LIMIT 1
    `;
  }

  if (!bivRows.length && clientNome) {
    bivRows = await sql`
      SELECT * FROM briefings_identidade_visual 
      WHERE "Nome_Cliente" ILIKE ${'%' + clientNome + '%'} 
         OR (dados_completos->>'Nome_Cliente') ILIKE ${'%' + clientNome + '%'} 
         OR (dados_completos->>'Nome_Marca') ILIKE ${'%' + clientNome + '%'}
      ORDER BY created_at DESC 
      LIMIT 1
    `;
  }

  if (bivRows.length > 0 && bivRows[0]) {
    const raw = bivRows[0];
    const dc = raw.dados_completos && typeof raw.dados_completos === 'object' ? raw.dados_completos : {};

    // Mescla dados_completos com as colunas diretas da tabela
    const flat: Record<string, any> = { ...dc, ...raw };

    // Mapeamento normalizado garantindo chaves em snake_case que a UI do Studio Veronna consome
    const merged: Record<string, any> = {
      ...flat,
      project_id: projectId,
      nome: flat.nome || flat.Nome || flat.Nome_Cliente || flat.nome_cliente || clientNome,
      email: flat.email || flat.Email || clientEmail,
      whatsapp: flat.whatsapp || flat.WhatsApp || '',
      nome_logo: flat.nome_logo || flat.Nome_Logotipo || flat.nome_logotipo || flat.Nome_Marca || flat.nome_marca || '',
      significado_nome: flat.significado_nome || flat.Significado_Nome || '',
      tagline: flat.tagline || flat.Tagline || '',
      slogan: flat.slogan || flat.Slogan || '',
      produtos_servicos: flat.produtos_servicos || flat.Produtos_Servicos || flat.o_que_vende || flat.O_Que_Vende || '',
      motivo_abertura: flat.motivo_abertura || flat.Motivo_Abertura || flat.motivo_nascimento || '',
      proposito: flat.proposito || flat.Proposito || '',
      tempo_mercado: flat.tempo_mercado || flat.Tempo_Mercado || '',
      emoji: flat.emoji || flat.Emoji_Empresa || flat.emoji_empresa || '',
      musica: flat.musica || flat.Musica_Empresa || flat.musica_empresa || '',
      sentimento: flat.sentimento || flat.Sentimento_Empresa || flat.sentimento_empresa || '',
      visao_5_anos: flat.visao_5_anos || flat.Visao_5_Anos || flat.empresa_5_anos || '',
      genero: flat.genero || flat.Genero_Publico || flat.genero_publico || '',
      classe: flat.classe || flat.Classe_Social || flat.classe_social || '',
      idade: flat.idade || flat.Idade_Publico || flat.idade_publico || '',
      resumo_publico: flat.resumo_publico || flat.Resumo_Publico || flat.perfil_cliente || '',
      
      // Concorrentes & Mercado
      concorrentes: flat.concorrentes || flat.Concorrentes || flat.Links_Concorrentes || flat.links_concorrentes || '',
      concorrentes_links: flat.concorrentes_links || flat.Links_Concorrentes || flat.links_concorrentes || flat.concorrentes || '',
      concorrentes_bom: flat.concorrentes_bom || flat.Concorrentes_Bom || '',
      fazer_diferente: flat.fazer_diferente || flat.Fazer_Diferente || '',
      evitar_mercado: flat.evitar_mercado || flat.Evitar_Mercado || '',
      diferenca_percebida: flat.diferenca_percebida || flat.Diferenca_Percebida || '',
      nao_fazer: flat.nao_fazer || flat.O_Que_Nao_Fazer || flat.o_que_nao_fazer || '',
      diferencial: flat.diferencial || flat.Diferencial || flat.diferenca_outros || '',
      referencias: flat.referencias || flat.Referencias_Inspiracoes || flat.referencias_inspiracoes || '',

      // Sentimento e Missão
      sentimento_marca: flat.sentimento_marca || flat.Sentimento_Marca || '',
      sentimento_consumidor: flat.sentimento_consumidor || flat.Sentimento_Consumidor || '',
      missao: flat.missao || flat.Missao || '',
      top_3_adjetivos: flat.top_3_adjetivos || flat.Top_3_Adjetivos || flat.atributos_top3 || '',
      adjetivos_positivos: Array.isArray(flat.Adjetivos_Positivos) ? flat.Adjetivos_Positivos : (flat.Adjetivos_Positivos ? [flat.Adjetivos_Positivos] : []),
      adjetivos_negativos: Array.isArray(flat.Adjetivos_Negativos) ? flat.Adjetivos_Negativos : (flat.Adjetivos_Negativos ? [flat.Adjetivos_Negativos] : []),

      // Cores e Símbolo
      simbolo: flat.simbolo || flat.Simbolo_Especifico || flat.simbolo_especifico || flat.simbolo_desejado || '',
      cor_desejada: flat.cor_desejada || flat.Cor_Desejada || flat.cor_desejada_qual || '',
      cor_nao_desejada: flat.cor_nao_desejada || flat.Cor_Nao_Desejada || flat.cor_indesejada || '',
      onde_verao: flat.onde_verao || flat.Onde_Verao_Identidade || flat.onde_verao_identidade || '',
      logo_atual: flat.logo_atual || flat.Sobre_Logo_Atual || flat.sobre_logo_atual || '',
      logo_atual_url: flat.logo_atual_url || flat.Logo_Atual_Url || flat.link_logo_atual || '',
      motivo_escolha: flat.motivo_escolha || flat.Motivo_Escolha_Liz || flat.motivo_escolha_liz || '',
      ideias_livres: flat.ideias_livres || flat.Ideias_Livres_Extras || flat.ideias_livres_extras || flat.consideracoes_finais || ''
    };

    const competitorsData = flat.competitors_data || dc.competitors_data || null;

    return {
      briefing: merged,
      source: 'briefings_identidade_visual',
      normalizedAnswers: normalizeBriefingAnswers(merged),
      competitorsData,
      clientInfo
    };
  }

  // 4. Nenhum briefing preenchido ainda
  return {
    briefing: null,
    source: null,
    normalizedAnswers: [],
    competitorsData: null,
    clientInfo
  };
}

/**
 * Salva a análise de concorrentes no registro de briefing correspondente
 */
export async function saveProjectCompetitorsData(projectId: string, competitorsData: any[]): Promise<boolean> {
  const sql = getDb();

  // Verifica se existe em client_briefings
  const cb = await sql`SELECT id, answers FROM client_briefings WHERE project_id = ${projectId} LIMIT 1`;
  if (cb.length > 0) {
    const currentAnswers = cb[0].answers && typeof cb[0].answers === 'object' ? cb[0].answers : {};
    const updatedAnswers = { ...currentAnswers, competitors_data: competitorsData };
    await sql`
      UPDATE client_briefings 
      SET answers = ${JSON.stringify(updatedAnswers)}::jsonb, updated_at = NOW() 
      WHERE project_id = ${projectId}
    `;
    return true;
  }

  // Se não estiver em client_briefings, tenta em briefings_identidade_visual
  const projects = await sql`
    SELECT p.id, pr.email, pr.nome 
    FROM projects p 
    LEFT JOIN profiles pr ON p.client_id = pr.id 
    WHERE p.id = ${projectId} 
    LIMIT 1
  `;
  if (projects.length > 0 && projects[0].email) {
    const email = projects[0].email;
    const biv = await sql`
      SELECT id, dados_completos FROM briefings_identidade_visual 
      WHERE "Email" ILIKE ${email} OR (dados_completos->>'Email') ILIKE ${email} 
      LIMIT 1
    `;
    if (biv.length > 0) {
      const currentDc = biv[0].dados_completos && typeof biv[0].dados_completos === 'object' ? biv[0].dados_completos : {};
      const updatedDc = { ...currentDc, competitors_data: competitorsData };
      await sql`
        UPDATE briefings_identidade_visual 
        SET dados_completos = ${JSON.stringify(updatedDc)}::jsonb 
        WHERE id = ${biv[0].id}
      `;
      return true;
    }
  }

  return false;
}
