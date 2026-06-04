// src/components/pdf/BriefingPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

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
  
  // Função nativa para formatar a resposta da IA dentro do @react-pdf/renderer
  const renderAiInsight = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
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

  // Dicionário Limpo para o PDF ficar executivo e não parecer código de banco de dados
  const DICTIONARY: Record<string, string> = {
    nome: "Nome do Responsável",
    whatsapp: "WhatsApp",
    email: "E-mail de Contato",
    nome_logo: "Nome a ser utilizado no Logotipo",
    significado_nome: "Significado da Escolha do Nome",
    tagline: "Tagline (Subtítulo)",
    slogan: "Slogan da Empresa",
    produtos_servicos: "Produtos ou Serviços Oferecidos",
    motivo_abertura: "Por que a empresa foi aberta?",
    proposito: "Propósito principal além de lucrar",
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
    referencias: "Referências Visuais do Cliente",
    sentimento_marca: "Sentimento Exigido da Marca",
    missao: "A Missão Oficial",
    adjetivos_positivos: "Adjetivos Positivos (A Marca É)",
    top_3_adjetivos: "Top 3 Adjetivos",
    adjetivos_negativos: "Adjetivos Negativos (A Marca NÃO É)",
    simbolo: "Pedido de Símbolo Específico",
    cor_desejada: "Cores Desejadas",
    cor_nao_desejada: "Cores Bloqueadas (Não usar)",
    onde_verao: "Onde a Identidade será mais aplicada?",
    logo_atual: "Sobre o Logotipo Atual",
    motivo_escolha: "Por que escolheu o Atelier?",
    ideias_livres: "Ideias Livres e Extensões"
  };

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Dossiê Estratégico</Text>
        <Text style={styles.coverSubtitle}>{projectName}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* PÁGINA 2 em diante: CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Fundamentação Estratégica</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* CÉREBRO DA IA: DIAGNÓSTICO CBO */}
        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiBoxTitle}>Diagnóstico de Marca (CBO AI)</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        <Text style={styles.sectionTitle}>Resumo Operacional do Cliente</Text>

        {/* MAPEAMENTO DO BRIEFING LIMPO */}
        {Object.entries(clientBriefing).map(([key, val]: any, index) => {
          // Ignora campos sistémicos, URLs de imagem ou valores vazios
          if (!val || key.includes('url') || key.includes('outro') || key === 'id' || key === 'project_id' || key === 'created_at') return null;
          
          const niceLabel = DICTIONARY[key] || key.replace(/_/g, ' ');
          let displayValue = val;

          // Se for um Array (Ex: Adjetivos Positivos)
          if (Array.isArray(val)) {
            displayValue = val.join(', ');
          }
          
          return (
            <View key={index} style={styles.qaContainer} wrap={false}>
              <Text style={styles.question}>{niceLabel}</Text>
              <Text style={styles.answer}>{String(displayValue)}</Text>
            </View>
          );
        })}

        {/* IMAGEM DE REFERÊNCIA (Se existir) */}
        {clientBriefing.logo_atual_url && (
          <View style={[styles.qaContainer, { marginTop: 20 }]} wrap={false}>
            <Text style={styles.question}>Referência Visual (Logotipo Anterior)</Text>
            <Image src={clientBriefing.logo_atual_url} style={styles.imageRef} />
          </View>
        )}

        {/* RODAPÉ (Repetido em todas as páginas automaticamente) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>Documento Confidencial</Text>
        </View>
      </Page>
    </Document>
  );
}