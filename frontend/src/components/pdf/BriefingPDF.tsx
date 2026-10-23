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
    backgroundColor: '#E8E3DD', 
    padding: 60,
    paddingBottom: 80, 
    fontFamily: 'Roboto',
  },
  // --- CAPA ---
  coverPage: {
    backgroundColor: '#E8E3DD',
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
    color: '#142C48', 
    fontWeight: 700,
    textAlign: 'center',
  },
  coverDate: {
    position: 'absolute',
    bottom: 60,
    fontSize: 10,
    color: '#424242',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  
  // --- CABEÇALHO INTERNO ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 44, 72,0.2)',
    paddingBottom: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontFamily: 'Elegant',
    fontSize: 24,
    color: '#142C48',
  },
  
  // --- INSIGHTS DA IA ---
  // Removido o wrap={false} no componente pai para permitir paginação natural
  aiBox: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#142C48',
    marginBottom: 40,
  },
  aiBoxTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#142C48',
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
    borderTopColor: 'rgba(20, 44, 72,0.1)',
  },
  qaContainer: {
    marginBottom: 20,
    // As perguntas continuam com wrap=false para não cortar uma pergunta a meio
  },
  question: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#142C48',
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
    borderTopColor: 'rgba(20, 44, 72,0.2)',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#424242',
  },
});

import { BRIEFING_LABELS, normalizeBriefingAnswers } from '@/lib/briefingConstants';

interface BriefingPDFProps {
  clientBriefing: any;
  projectName: string;
  aiInsight?: string;
}

export default function BriefingPDF({ clientBriefing, projectName, aiInsight }: BriefingPDFProps) {
  const brandName = clientBriefing?.Nome_Marca || clientBriefing?.nome_marca || clientBriefing?.Nome_Logotipo || clientBriefing?.nome_logo || '';
  const resolvedProjectName = (projectName && projectName !== 'Cliente') ? projectName : (brandName || projectName || 'Identidade Visual');
  const safeProjectName = stripEmojis(resolvedProjectName);

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

  // Normalizar respostas deduplicando minúsculas/maiúsculas e traduzindo todas as perguntas
  const normalizedAnswers = normalizeBriefingAnswers(clientBriefing || {});

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>{safeProjectName || 'Briefing'}</Text>
        <Text style={styles.coverSubtitle}>Briefing de Identidade Visual</Text>
        <Text style={styles.coverDate}>{currentDate} • Studio Veronna</Text>
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

        {/* MAPEAMENTO DO BRIEFING LIMPO E DEDUPLICADO */}
        {normalizedAnswers.map((item, index) => {
          if (item.key.includes('url') || item.key.toLowerCase().endsWith('_outro')) return null;
          
          return (
            <View key={index} style={styles.qaContainer} wrap>
              <Text style={styles.question}>{stripEmojis(item.label)}</Text>
              <Text style={styles.answer}>{stripEmojis(String(item.value))}</Text>
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
          <Text style={styles.footerText}>Studio Veronna</Text>
          <Text style={styles.footerText}>{safeProjectName || 'Studio Veronna'}</Text>
        </View>
      </Page>
    </Document>
  );
}