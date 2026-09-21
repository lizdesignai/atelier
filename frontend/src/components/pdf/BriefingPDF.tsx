// src/components/pdf/BriefingPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { stripEmojis } from '@/lib/pdfUtils';

// 1. REGISTO DE FONTES DE LUXO
Font.register({
  family: 'Elegant',
  src: '/fonts/Elegant-Regular.ttf', 
});

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

// 2. FOLHA DE ESTILOS EDITORIAL (A Estética de Revista)
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fbf4e4', 
    padding: 60,
    paddingBottom: 80, 
    fontFamily: 'Roboto',
  },
  // --- CAPA ---
  coverPage: {
    backgroundColor: '#fbf4e4',
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogo: {
    width: 80,
    height: 80,
    opacity: 0.6,
    marginBottom: 40,
  },
  coverTitle: {
    fontFamily: 'Elegant',
    fontSize: 48,
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: '#ad6f40', 
    fontWeight: 700,
    textAlign: 'center',
  },
  coverDate: {
    position: 'absolute',
    bottom: 60,
    fontSize: 10,
    color: '#7a7470',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  
  // --- CABEÇALHO INTERNO ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122,116,112,0.2)',
    paddingBottom: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontFamily: 'Elegant',
    fontSize: 24,
    color: '#ad6f40',
  },
  
  // --- INSIGHTS DA IA ---
  // Removido o wrap={false} no componente pai para permitir paginação natural
  aiBox: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ad6f40',
    marginBottom: 40,
  },
  aiBoxTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 20,
  },
  
  // Formatador de Markdown da IA
  aiH3: {
    fontFamily: 'Elegant',
    fontSize: 18,
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 10,
  },
  aiP: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginBottom: 10,
    textAlign: 'justify',
  },
  aiBullet: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginBottom: 6,
    marginLeft: 10,
  },

  // --- DADOS DO CLIENTE ---
  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 22,
    color: '#1a1a1a',
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(122,116,112,0.1)',
  },
  qaContainer: {
    marginBottom: 20,
    // As perguntas continuam com wrap=false para não cortar uma pergunta a meio
  },
  question: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 6,
  },
  answer: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#1a1a1a',
  },
  imageRef: {
    marginTop: 10,
    maxWidth: 250,
    borderRadius: 8,
  },

  // --- RODAPÉ FIXO ---
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(122,116,112,0.2)',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#7a7470',
  },
});

interface BriefingPDFProps {
  clientBriefing: any;
  projectName: string;
  aiInsight?: string;
}

export default function BriefingPDF({ clientBriefing, projectName, aiInsight }: BriefingPDFProps) {
  
  const safeProjectName = stripEmojis(projectName);

  // Função nativa para formatar a resposta da IA dentro do @react-pdf/renderer
  const renderAiInsight = (text: string) => {
    if (!text) return null;
    const cleanText = stripEmojis(text);
    const lines = cleanText.split('\n');
    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null; // Filtro de linhas vazias
      
      let textContent = cleanLine.replace(/\*\*/g, '');

      if (cleanLine.startsWith('###')) {
        return <Text key={index} style={styles.aiH3}>{textContent.replace('###', '').trim()}</Text>;
      }
      if (cleanLine.startsWith('-')) {
        return <Text key={index} style={styles.aiBullet}>• {textContent.replace('-', '').trim()}</Text>;
      }
      return <Text key={index} style={styles.aiP}>{textContent}</Text>;
    });
  };

  const currentDate = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  // Campos sistêmicos que não devem aparecer no PDF
  const SYSTEM_FIELDS = new Set([
    'id', 'project_id', 'client_id', 'created_at', 'updated_at',
    'dados_completos', 'notificado', 'lido', 'status_marca',
    'logo_atual_url', 'is_completed',
  ]);

  // Dicionário humanizado — mapeia chaves do banco para labels legíveis
  const DICTIONARY: Record<string, string> = {
    // --- Campos legados (PascalCase) ---
    Nome_Cliente: "Nome do Responsável",
    WhatsApp: "WhatsApp",
    Email: "E-mail de Contato",
    Nome_Logotipo: "Nome a ser utilizado no Logotipo",
    Significado_Nome: "Significado da Escolha do Nome",
    Tagline: "Tagline (Subtítulo)",
    Slogan: "Slogan da Empresa",
    Produtos_Servicos: "Produtos ou Serviços Oferecidos",
    Motivo_Abertura: "Por que a empresa foi aberta?",
    Proposito: "Propósito além de lucrar",
    Tempo_Mercado: "Tempo de Mercado",
    Emoji_Empresa: "A Marca em Emojis",
    Musica_Empresa: "Música que a define",
    Sentimento_Empresa: "O Sentimento que a marca vende",
    Visao_5_Anos: "Visão de Futuro (Em 5 Anos)",
    Genero_Publico: "Gênero do Público",
    Genero_Publico_Outro: "Gênero do Público (detalhe)",
    Classe_Social: "Classe Social Predominante",
    Classe_Social_Outro: "Classe Social (detalhe)",
    Idade_Publico: "Faixa Etária",
    Idade_Publico_Outro: "Faixa Etária (detalhe)",
    Resumo_Publico: "Resumo Comportamental do Público",
    Links_Concorrentes: "Concorrentes Principais",
    O_Que_Nao_Fazer: "O que definitivamente NÃO fazer",
    Diferencial: "Diferencial Competitivo",
    Referencias_Inspiracoes: "Referências e Inspirações",
    Sentimento_Marca: "Sentimento Exigido da Marca",
    Sentimento_Consumidor: "Sentimento Esperado pelo Consumidor",
    Missao: "A Missão da Marca",
    Adjetivos_Positivos: "Adjetivos Positivos (A Marca É)",
    Adjetivos_Positivos_Outro: "Adjetivos Positivos (detalhe)",
    Top_3_Adjetivos: "Top 3 Adjetivos",
    Adjetivos_Negativos: "Adjetivos Negativos (A Marca NÃO É)",
    Adjetivos_Negativos_Outro: "Adjetivos Negativos (detalhe)",
    Simbolo_Especifico: "Pedido de Símbolo Específico",
    Cor_Desejada: "Cores Desejadas",
    Cor_Nao_Desejada: "Cores Bloqueadas (Não usar)",
    Onde_Verao_Identidade: "Onde a Identidade será mais aplicada?",
    Sobre_Logo_Atual: "Sobre o Logotipo Atual",
    Motivo_Escolha_Liz: "Por que escolheu o Atelier?",
    Ideias_Livres_Extras: "Ideias Livres e Extensões",

    // --- Campos legados (lowercase / client_briefings) ---
    nome: "Nome do Responsável",
    whatsapp: "WhatsApp",
    email: "E-mail de Contato",
    nome_logo: "Nome a ser utilizado no Logotipo",
    significado_nome: "Significado da Escolha do Nome",
    tagline: "Tagline (Subtítulo)",
    slogan: "Slogan da Empresa",
    produtos_servicos: "Produtos ou Serviços Oferecidos",
    motivo_abertura: "Por que a empresa foi aberta?",
    proposito: "Propósito além de lucrar",
    tempo_mercado: "Tempo de Mercado",
    emoji: "A Marca em Emojis",
    musica: "Música que a define",
    sentimento: "O Sentimento que a marca vende",
    visao_5_anos: "Visão de Futuro (Em 5 Anos)",
    genero: "Gênero do Público",
    classe: "Classe Social Predominante",
    idade: "Faixa Etária",
    resumo_publico: "Resumo Comportamental do Público",
    concorrentes_links: "Concorrentes Principais",
    diferencial: "Diferencial Competitivo",
    nao_fazer: "O que definitivamente NÃO fazer",
    referencias: "Referências Visuais",
    sentimento_marca: "Sentimento Exigido da Marca",
    sentimento_consumidor: "Sentimento Esperado pelo Consumidor",
    missao: "A Missão da Marca",
    adjetivos_positivos: "Adjetivos Positivos (A Marca É)",
    top_3_adjetivos: "Top 3 Adjetivos",
    adjetivos_negativos: "Adjetivos Negativos (A Marca NÃO É)",
    simbolo: "Pedido de Símbolo Específico",
    cor_desejada: "Cores Desejadas",
    cor_nao_desejada: "Cores Bloqueadas (Não usar)",
    onde_verao: "Onde a Identidade será mais aplicada?",
    logo_atual: "Sobre o Logotipo Atual",
    motivo_escolha: "Por que escolheu o Atelier?",
    ideias_livres: "Ideias Livres e Extensões",

    // --- Novas colunas (formulário expandido) ---
    motivo_nascimento: "O que motivou o nascimento da marca?",
    motivo_escolha_negocio: "Por que escolheu esse tipo de negócio?",
    historia_importante: "Existe alguma história importante por trás?",
    tem_significado_nome: "O nome tem algum significado especial?",
    conceito_inseparavel: "Conceito inseparável da marca",
    frase_resumo: "Frase que resume a essência da marca",
    o_que_vende: "O que a marca vende?",
    tipo_produto: "Tipo de produto ou serviço",
    tipo_produto_outro: "Tipo de produto (detalhe)",
    motivo_compra: "Por que o cliente compra de você?",
    diferenca_outros: "O que diferencia a marca das demais?",
    algo_diferente: "Algo diferente que gostaria de oferecer?",
    pitch_10s: "Pitch de 10 segundos sobre a marca",
    perfil_cliente: "Perfil do cliente ideal",
    problema_cliente: "Maior problema que resolve para o cliente",
    influencia_compra: "O que mais influencia a compra?",
    influencia_compra_outro: "Influência de compra (detalhe)",
    sentimento_desejado: "Sentimento desejado ao interagir com a marca",
    sentimento_desejado_outro: "Sentimento desejado (detalhe)",
    cliente_indesejado: "Tipo de cliente que não deseja atrair",
    concorrentes: "Principais concorrentes",
    concorrentes_bom: "O que os concorrentes fazem de bom?",
    fazer_diferente: "O que faria de diferente?",
    evitar_mercado: "O que evitar do mercado?",
    diferenca_percebida: "Como a marca se diferencia na percepção?",
    atributos_gerais: "Atributos gerais da marca",
    atributos_gerais_outro: "Atributos gerais (detalhe)",
    atributos_top3: "Top 3 atributos da marca",
    atributos_nao_transmitir: "Atributos que a marca NÃO deve transmitir",
    atributos_nao_transmitir_outro: "Atributos negativos (detalhe)",
    porque_atributos: "Por que esses atributos?",
    eixo_tradicional_contemporanea: "Eixo: Tradicional ↔ Contemporânea",
    eixo_seria_descontraida: "Eixo: Séria ↔ Descontraída",
    eixo_acessivel_exclusiva: "Eixo: Acessível ↔ Exclusiva",
    eixo_discreta_ousada: "Eixo: Discreta ↔ Ousada",
    eixo_racional_emocional: "Eixo: Racional ↔ Emocional",
    eixo_minimalista_expressiva: "Eixo: Minimalista ↔ Expressiva",
    percepcao_primeiravez: "Impressão desejada no primeiro contato",
    percepcao_poscompra: "Impressão desejada após a compra",
    percepcao_indesejada: "Percepção que deseja evitar",
    falta_marca: "O que sente que falta na marca hoje?",
    marcas_admiradas: "Marcas que admira",
    gosto_referencias: "O que gosta nessas referências?",
    gosto_referencias_outro: "Referências (detalhe)",
    marcas_nao_admiradas: "Marcas que NÃO admira",
    nao_gosto_referencias: "O que não gosta nessas marcas?",
    ambiente_proximo: "Ambiente mais próximo da marca",
    ambiente_proximo_outro: "Ambiente (detalhe)",
    atmosfera_combinada: "Atmosfera que combina com a marca",
    universo_evitar: "Universo visual a evitar",
    cor_desejada_opcao: "Opção de cor desejada",
    cor_desejada_qual: "Qual cor desejada?",
    cor_indesejada: "Cores indesejadas",
    simbolo_desejado: "Símbolo desejado",
    simbolo_indesejado: "Símbolo indesejado",
    identidade_preservar: "O que preservar da identidade atual?",
    identidade_abandonar: "O que abandonar da identidade atual?",
    aplicacoes: "Onde a identidade será aplicada?",
    aplicacoes_outro: "Aplicações (detalhe)",
    aplicacao_principal: "Aplicação principal",
    aplicacao_especial: "Alguma aplicação especial?",
    empresa_hoje: "Onde a empresa está hoje?",
    empresa_5_anos: "Onde estará em 5 anos?",
    representacao_futuro: "O que a marca representa para o futuro?",
    expansao: "Planos de expansão?",
    como_expandir: "Como pretende expandir?",
    unica_coisa_resolver: "Se pudesse resolver uma coisa, qual seria?",
    validacao_espelho: "A marca reflete quem você é?",
    ajustes_espelho: "Quais ajustes faria?",
    consideracoes_finais: "Considerações finais",
    emoji_empresa: "A Marca em Emojis",
    musica_empresa: "Música que a define",
  };

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>{safeProjectName || 'Briefing'}</Text>
        <Text style={styles.coverSubtitle}>Briefing de Identidade Visual</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* PÁGINA 2 em diante: CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Briefing de Marca</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* VISÃO ESTRATÉGICA / INSIGHTS */}
        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiBoxTitle}>Visão Estratégica</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        <Text style={styles.sectionTitle}>Conheça {safeProjectName}</Text>

        {/* MAPEAMENTO DO BRIEFING LIMPO */}
        {Object.entries(clientBriefing).map(([key, val]: any, index) => {
          // Ignora campos sistêmicos, URLs de imagem ou valores vazios
          if (!val || SYSTEM_FIELDS.has(key) || key.includes('url') || key.includes('outro')) return null;
          
          const niceLabel = DICTIONARY[key] || key.replace(/_/g, ' ');
          let displayValue = val;

          // Se for um Array (Ex: Adjetivos Positivos)
          if (Array.isArray(val)) {
            displayValue = val.join(', ');
          }
          
          return (
            <View key={index} style={styles.qaContainer} wrap>
              <Text style={styles.question}>{stripEmojis(niceLabel)}</Text>
              <Text style={styles.answer}>{stripEmojis(String(displayValue))}</Text>
            </View>
          );
        })}

        {/* IMAGEM DE REFERÊNCIA (Se existir) */}
        {clientBriefing.logo_atual_url && (
          <View style={[styles.qaContainer, { marginTop: 20 }]} wrap>
            <Text style={styles.question}>Referência Visual (Logotipo Anterior)</Text>
            <Image src={clientBriefing.logo_atual_url} style={styles.imageRef} />
          </View>
        )}

        {/* RODAPÉ (Repetido em todas as páginas automaticamente) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>{safeProjectName || 'Atelier Liz Design'}</Text>
        </View>
      </Page>
    </Document>
  );
}