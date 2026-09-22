// src/components/pdf/MapaPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { stripEmojis } from '@/lib/pdfUtils';
import { MAPA_STAGES_CONTENT } from '@/app/mapa/content';

// 1. REGISTO DE FONTES
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
    padding: 50,
    fontFamily: 'Roboto',
    color: '#7a7470',
  },
  coverPage: {
    backgroundColor: '#ad6f40', // Terracota cover
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#ffffff',
  },
  coverTitle: {
    fontFamily: 'Elegant',
    fontSize: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: 700,
    textAlign: 'center',
    opacity: 0.8,
  },
  clientName: {
    fontSize: 14,
    marginTop: 40,
    fontWeight: 400,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 28,
    color: '#7a7470',
    marginBottom: 20,
    marginTop: 30,
    borderBottom: '1px solid rgba(122, 116, 112, 0.2)',
    paddingBottom: 10,
  },
  textBlock: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 15,
  },
  highlightBox: {
    backgroundColor: 'rgba(173, 111, 64, 0.1)', // Terracota 10%
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  highlightTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    marginBottom: 8,
  },
  scoreNumber: {
    fontFamily: 'Elegant',
    fontSize: 40,
    color: '#ad6f40',
    marginBottom: 5,
  },
  taskItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  taskBullet: {
    width: 15,
    fontSize: 11,
    color: '#ad6f40',
    fontWeight: 700,
  },
  taskText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(122, 116, 112, 0.2)',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#7a7470',
    opacity: 0.5,
  }
});

interface MapaPDFProps {
  clientName: string;
  stageNumber: number; // 1 to 4
  mapaData: any; // The DB record with scores
}

export default function MapaPDF({ clientName, stageNumber, mapaData }: MapaPDFProps) {
  const content = MAPA_STAGES_CONTENT[stageNumber];
  if (!content) return null;

  const dimensionKey = content.dimensao.toLowerCase() as 'clareza' | 'percepcao' | 'autoridade' | 'conversao';
  const stageScore = mapaData[`score_${dimensionKey}`] || 0;
  
  // Custom interpretation based on score
  const getInterpretation = (score: number) => {
    if (score >= 80) return "Sua marca já demonstra maturidade nesta dimensão. O foco agora é otimização e escala.";
    if (score >= 60) return "Você tem uma boa base estruturada, mas há pontos de fricção que estão roubando sua autoridade no digital.";
    return "Esta área exige atenção imediata. Os fundamentos não estão estabelecidos e você está perdendo resultados por isso.";
  };

  const isPrincipalGargalo = mapaData.principal_gargalo?.toLowerCase() === dimensionKey;

  return (
    <Document>
      {/* CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverSubtitle}>MÉTODO MAPA 4D — SPRINT 0{stageNumber}</Text>
        <Text style={styles.coverTitle}>{stripEmojis(content.dimensao)}</Text>
        <Text style={{ fontSize: 16, marginTop: 20, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          {stripEmojis(content.contexto.subtitle)}
        </Text>
        <Text style={styles.clientName}>Preparado exclusivamente para {stripEmojis(clientName)}</Text>
      </Page>

      {/* DIAGNÓSTICO PERSONALIZADO */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Seu Diagnóstico: {stripEmojis(content.dimensao)}</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: '60%' }}>
            <Text style={styles.textBlock}>
              Baseado na sua auditoria inicial, analisamos a sua presença digital sob a ótica da {content.dimensao.toLowerCase()}.
            </Text>
            <Text style={styles.textBlock}>
              {stripEmojis(getInterpretation(stageScore))}
            </Text>
          </View>
          <View style={{ width: '35%', backgroundColor: '#fff', padding: 20, borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Seu IPD</Text>
            <Text style={styles.scoreNumber}>{stageScore}<Text style={{ fontSize: 16, color: '#7a7470', opacity: 0.5 }}>/100</Text></Text>
            <Text style={{ fontSize: 10, marginTop: 5, color: '#ad6f40', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Roboto' }}>IPD Atual</Text>
          </View>
        </View>

        {isPrincipalGargalo && (
          <View style={{ ...styles.highlightBox, backgroundColor: 'rgba(201, 163, 155, 0.2)' }}>
             <Text style={{ ...styles.highlightTitle, color: '#9b836b' }}>⚠️ ALERTA DE GARGALO</Text>
             <Text style={styles.textBlock}>
               O nosso sistema identificou que a {content.dimensao} é atualmente o principal gargalo que impede o crescimento da sua marca. As tarefas desta semana são as mais críticas de toda a jornada.
             </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>O Fundamento</Text>
        <Text style={styles.textBlock}>{stripEmojis(content.contexto.copy)}</Text>
        
        {/* FOOTER P1 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Atelier Liz Design</Text>
          <Text style={styles.footerText}>Semana 0{stageNumber} — {stripEmojis(content.dimensao)}</Text>
        </View>
      </Page>

      {/* PLANO DE EXECUÇÃO */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Plano de Ação Prático</Text>
        <Text style={styles.textBlock}>
          Para elevar o seu score de {stageScore} nesta dimensão, você precisa executar a missão abaixo. Não avance para a próxima semana sem concluir estas tarefas.
        </Text>

        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>A MISSÃO DA SEMANA</Text>
          
          <View style={{ marginTop: 10 }}>
            {content.missao.tarefas.map((tarefa, idx) => (
              <View key={idx} style={styles.taskItem}>
                <Text style={styles.taskBullet}>•</Text>
                <Text style={styles.taskText}>
                  <Text style={{ fontWeight: 700 }}>{stripEmojis(tarefa.texto)}</Text>
                  {"\n"}
                  <Text style={{ fontSize: 9, opacity: 0.7, color: '#ad6f40' }}>
                    Impacto {tarefa.impacto.toUpperCase()} / Esforço {tarefa.esforco.toUpperCase()}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Checklist de Validação</Text>
        <Text style={styles.textBlock}>
          Antes de prosseguir, certifique-se de que:
        </Text>
        <View style={{ marginTop: 5 }}>
          {content.checkpoint.perguntas.map((q, idx) => (
            <View key={idx} style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{idx + 1}. {stripEmojis(q.pergunta)}</Text>
              <Text style={{ fontSize: 10, paddingLeft: 10, color: '#ad6f40', fontStyle: 'italic' }}>
                ↳ O ideal: {stripEmojis(q.opcoes.find(o => o.correta)?.texto || '')}
              </Text>
            </View>
          ))}
        </View>

        {/* FOOTER P2 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Atelier Liz Design</Text>
          <Text style={styles.footerText}>Semana 0{stageNumber} — {stripEmojis(content.dimensao)}</Text>
        </View>
      </Page>
    </Document>
  );
}
