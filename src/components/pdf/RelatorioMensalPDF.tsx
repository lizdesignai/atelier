// src/components/pdf/RelatorioMensalPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// 1. REGISTO DE FONTES DE LUXO (Mantido rigorosamente)
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

// 2. ESTÉTICA EDITORIAL
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fbf4e4',
    padding: 60,
    paddingBottom: 80, // Margem de segurança para o rodapé
    fontFamily: 'Roboto',
  },
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
    marginBottom: 8,
  },
  coverHandle: {
    fontSize: 10,
    color: '#7a7470',
    letterSpacing: 2,
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

  // GRID DE MÉTRICAS (Novo para o Relatório, mas usando a matemática do seu grid anterior)
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  metricBox: {
    width: '31%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
  },
  metricBoxHighlight: {
    width: '31%',
    backgroundColor: '#ad6f40',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#999999',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricLabelHighlight: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontFamily: 'Elegant',
    fontSize: 28,
    color: '#1a1a1a',
  },
  metricValueHighlight: {
    fontFamily: 'Elegant',
    fontSize: 28,
    color: '#ffffff',
  },

  // CAIXAS DE CONTEÚDO IA
  aiBox: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ad6f40',
    marginBottom: 30,
  },
  aiBoxTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 15,
  },
  
  // CAIXA DE PLANO DE AÇÃO (Reaproveitando a estética do seu feedbackBox)
  actionPlanBox: {
    backgroundColor: '#fcfaf8',
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0e6dd',
    marginBottom: 30,
  },

  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 26,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122,116,112,0.2)',
    paddingBottom: 10,
    marginBottom: 20,
    marginTop: 10,
  },

  // MOTOR DE TEXTO
  aiH3: {
    fontFamily: 'Elegant',
    fontSize: 18,
    color: '#1a1a1a',
    marginTop: 15,
    marginBottom: 8,
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

interface RelatorioMensalPDFProps {
  clientName: string;
  instagramHandle: string;
  monthName: string; // Ex: "Maio de 2026"
  metrics: {
    followers: number;
    engagementRate: number;
  };
  report: {
    executive_summary: string;
    detailed_analysis: string;
    action_plan: string;
    performance_score: number;
  };
}

export default function RelatorioMensalPDF({ clientName, instagramHandle, monthName, metrics, report }: RelatorioMensalPDFProps) {
  if (!report) return null;

  // Motor Segregador de Texto (Markdown to PDF elements) - Mantido exato do original
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null; // Elimina parágrafos vazios fantasmas
      
      const textContent = cleanLine.replace(/\*\*/g, ''); // Limpa strongs

      if (cleanLine.startsWith('###')) {
        return <Text key={index} style={styles.aiH3}>{textContent.replace('###', '').trim()}</Text>;
      }
      if (cleanLine.startsWith('-')) {
        return <Text key={index} style={styles.aiBullet}>• {textContent.replace('-', '').trim()}</Text>;
      }
      return <Text key={index} style={styles.aiP}>{textContent}</Text>;
    });
  };

  const currentDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document>
      {/* CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Relatório Executivo</Text>
        <Text style={styles.coverSubtitle}>{clientName}</Text>
        <Text style={styles.coverHandle}>{instagramHandle}</Text>
        <Text style={styles.coverDate}>{monthName} • Atelier Liz Design</Text>
      </Page>

      {/* CONTEÚDO PRINCIPAL */}
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Auditoria de Performance</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* MÉTRICAS (SNAPSHOT) */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Audiência Total</Text>
            <Text style={styles.metricValue}>{metrics.followers.toLocaleString()}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Engajamento Médio</Text>
            <Text style={styles.metricValue}>{metrics.engagementRate}%</Text>
          </View>
          <View style={styles.metricBoxHighlight}>
            <Text style={styles.metricLabelHighlight}>Performance Score</Text>
            <Text style={styles.metricValueHighlight}>{report.performance_score}/100</Text>
          </View>
        </View>

        {/* RESUMO EXECUTIVO (Caixa de Destaque IA) */}
        <View style={styles.aiBox} wrap={false}>
          <Text style={styles.aiBoxTitle}>Visão Executiva do CMO</Text>
          {renderMarkdown(report.executive_summary)}
        </View>

        {/* ANÁLISE DETALHADA */}
        <View style={{ marginBottom: 40 }}>
          <Text style={styles.sectionTitle}>Diagnóstico & Análise</Text>
          {renderMarkdown(report.detailed_analysis)}
        </View>

        {/* PLANO DE AÇÃO ESTRATÉGICO */}
        <View style={styles.actionPlanBox} wrap={false}>
          <Text style={styles.aiBoxTitle}>Plano de Intervenção Estratégico</Text>
          {renderMarkdown(report.action_plan)}
        </View>

        {/* RODAPÉ FIXED */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>Emitido a {currentDate}</Text>
        </View>

      </Page>
    </Document>
  );
}