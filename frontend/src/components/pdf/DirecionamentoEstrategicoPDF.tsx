// src/components/pdf/DirecionamentoEstrategicoPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { stripEmojis } from '@/lib/pdfUtils';
import { PULSE_QUESTIONS } from '@/lib/presenca/constants';

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

// 2. ESTÉTICA EDITORIAL ATELIER
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#E8E3DD',
    padding: 50,
    paddingBottom: 70,
    fontFamily: 'Roboto',
  },
  coverPage: {
    backgroundColor: '#E8E3DD',
    padding: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverBadge: {
    fontSize: 9,
    fontFamily: 'Roboto',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#142C48',
    backgroundColor: 'rgba(20, 44, 72, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  coverTitle: {
    fontFamily: 'Elegant',
    fontSize: 38,
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: '#142C48',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 30,
  },
  coverMetaBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 44, 72, 0.15)',
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  coverMetaLabel: {
    fontSize: 9,
    color: '#424242',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 9,
    color: '#424242',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 44, 72, 0.2)',
    paddingBottom: 16,
    marginBottom: 30,
  },
  headerTitle: {
    fontFamily: 'Elegant',
    fontSize: 22,
    color: '#142C48',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#424242',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  overviewBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#142C48',
    marginBottom: 25,
  },
  overviewTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#142C48',
    fontWeight: 700,
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#333333',
  },
  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 20,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 44, 72, 0.2)',
    paddingBottom: 6,
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 44, 72, 0.12)',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#142C48',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'center',
    paddingTop: 4,
    marginRight: 8,
  },
  questionText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1a1a1a',
    flex: 1,
  },
  answerBox: {
    backgroundColor: '#E8E3DD',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  answerText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#2a2a2a',
  },
  noAnswerText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#8a8580',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 44, 72, 0.15)',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#424242',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

interface DirecionamentoEstrategicoPDFProps {
  clientName: string;
  cycleNumber: number;
  periodStart?: string;
  periodEnd?: string;
  answeredAt?: string;
  answers: Record<string, string>;
  objective?: string;
  editorialStrategy?: string;
}

export default function DirecionamentoEstrategicoPDF({
  clientName,
  cycleNumber,
  periodStart,
  periodEnd,
  answeredAt,
  answers = {},
  objective,
  editorialStrategy,
}: DirecionamentoEstrategicoPDFProps) {
  const safeClientName = stripEmojis(clientName) || 'Cliente';
  const formattedAnsweredAt = answeredAt ? new Date(answeredAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const formattedPeriod = periodStart && periodEnd
    ? `${new Date(periodStart).toLocaleDateString('pt-BR')} a ${new Date(periodEnd).toLocaleDateString('pt-BR')}`
    : 'Período Mensal';

  return (
    <Document title={`Direcionamento_Estrategico_Ciclo_${cycleNumber}_${safeClientName}`}>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverBadge}>Studio Veronna • Presença 2.0</Text>
        <Text style={styles.coverTitle}>Direcionamento Estratégico</Text>
        <Text style={styles.coverSubtitle}>Ciclo #{cycleNumber} • Alinhamento Executivo</Text>

        <View style={styles.coverMetaBox}>
          <Text style={styles.coverMetaLabel}>Cliente / Marca</Text>
          <Text style={styles.coverMetaValue}>{safeClientName}</Text>

          <Text style={styles.coverMetaLabel}>Vigência do Ciclo</Text>
          <Text style={styles.coverMetaValue}>{formattedPeriod}</Text>

          <Text style={styles.coverMetaLabel}>Data de Validação</Text>
          <Text style={styles.coverMetaValue}>{formattedAnsweredAt}</Text>
        </View>

        <Text style={styles.coverFooter}>Studio Veronna • Confidencial & Exclusivo</Text>
      </Page>

      {/* PÁGINA 2: RESPOSTAS DO DIRECIONAMENTO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Diretrizes do Ciclo #{cycleNumber}</Text>
          <Text style={styles.headerSubtitle}>{safeClientName}</Text>
        </View>

        {(objective || editorialStrategy) && (
          <View style={styles.overviewBox}>
            <Text style={styles.overviewTitle}>Objetivo & Tese Central</Text>
            {objective && (
              <Text style={styles.overviewText}>
                {stripEmojis(objective)}
              </Text>
            )}
            {editorialStrategy && (
              <Text style={[styles.overviewText, { marginTop: 6, fontStyle: 'italic', color: '#555555' }]}>
                {stripEmojis(editorialStrategy)}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Questionário Estratégico de Alinhamento</Text>

        {PULSE_QUESTIONS.map((q, idx) => {
          const answer = answers[q.id];
          return (
            <View key={q.id} style={styles.questionCard} wrap={false}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionIndex}>{idx + 1}</Text>
                <Text style={styles.questionText}>{q.q}</Text>
              </View>
              <View style={styles.answerBox}>
                {answer ? (
                  <Text style={styles.answerText}>{stripEmojis(answer)}</Text>
                ) : (
                  <Text style={styles.noAnswerText}>Sem observações adicionais para este ciclo.</Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Studio Veronna • Direcionamento Estratégico</Text>
          <Text 
            style={styles.footerText} 
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} 
          />
        </View>
      </Page>
    </Document>
  );
}
