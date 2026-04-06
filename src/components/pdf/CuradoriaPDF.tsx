// src/components/pdf/CuradoriaPDF.tsx
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

  // A Caixa da IA agora com quebra natural de página (Sem wrap={false})
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
    marginBottom: 15,
  },
  
  aiH3: {
    fontFamily: 'Elegant',
    fontSize: 18,
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 8,
  },
  aiP: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginBottom: 8,
    textAlign: 'justify',
  },
  aiBullet: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginBottom: 6,
    marginLeft: 10,
  },

  // ESTILOS DA CURADORIA (IMAGENS E FEEDBACK)
  directionContainer: {
    marginBottom: 50,
  },
  directionTitle: {
    fontFamily: 'Elegant',
    fontSize: 26,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122,116,112,0.2)',
    paddingBottom: 10,
    marginBottom: 20,
  },

  // Correção Matemática do Grid (Substituição de gap para evitar sobreposição)
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Essencial para o React-PDF
    marginBottom: 10,
  },
  imageWrapper: {
    width: '48%', // Garante 2 colunas seguras
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 15, // Substitui o gap vertical
  },

  feedbackBox: {
    backgroundColor: '#fcfaf8',
    padding: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0e6dd',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6dd',
    paddingBottom: 10,
    marginBottom: 15,
  },
  feedbackHeaderLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    fontWeight: 700,
  },
  scoreBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    padding: '4px 12px',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  // Correção Matemática do Grid de Feedback
  feedbackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Em vez de gap
  },
  feedbackItem: {
    width: '48%', // Garante 2 colunas seguras
    marginBottom: 15,
  },
  feedbackLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#999999',
    marginBottom: 4,
  },
  feedbackValue: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#333333',
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

interface CuradoriaPDFProps {
  adminRefs: any[];
  projectName: string;
  aiInsight?: string;
}

export default function CuradoriaPDF({ adminRefs, projectName, aiInsight }: CuradoriaPDFProps) {
  if (!adminRefs || adminRefs.length === 0) return null;

  // Motor Segregador de Texto (Markdown to PDF elements)
  const renderAiInsight = (text: string) => {
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

  const currentDate = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <Document>
      {/* CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Relatório de Curadoria</Text>
        <Text style={styles.coverSubtitle}>{projectName}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* CONTEÚDO PRINCIPAL (Paginação Inteligente e Dinâmica) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Análise Visual Estratégica</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* CÉREBRO DA IA DA CURADORIA (Removido o wrap={false}) */}
        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiBoxTitle}>Análise Semiótica (Direção de Arte)</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        {/* ROTAS CRIATIVAS E FEEDBACKS */}
        {adminRefs.map((ref, i) => {
          const images = ref.image_urls && ref.image_urls.length > 0 ? ref.image_urls : (ref.image_url ? [ref.image_url] : []);
          
          return (
            // Mantido o wrap={false} apenas por rota, para não separar as imagens do seu respectivo feedback
            <View key={i} style={styles.directionContainer} wrap={false}>
              <Text style={styles.directionTitle}>
                <Text style={{ color: '#ad6f40' }}>{String(i + 1).padStart(2, '0')}. </Text>
                {ref.title}
              </Text>
              
              {/* IMAGENS (Grid matemático blindado) */}
              <View style={styles.imageGrid}>
                {images.map((img: string, idx: number) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </View>
                ))}
              </View>

              {/* CAIXA DE AVALIAÇÃO DO CLIENTE */}
              <View style={styles.feedbackBox}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackHeaderLabel}>Feedback do Cliente</Text>
                  <Text style={styles.scoreBadge}>Nota: {ref.score || 0}/10</Text>
                </View>
                
                <View style={styles.feedbackGrid}>
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>Atmosfera Global</Text>
                    <Text style={styles.feedbackValue}>{ref.feedback?.q1 || "Aguardando avaliação"}</Text>
                  </View>
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>Tipografia</Text>
                    <Text style={styles.feedbackValue}>{ref.feedback?.q2 || "Aguardando avaliação"}</Text>
                  </View>
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>Cores e Tons</Text>
                    <Text style={styles.feedbackValue}>{ref.feedback?.q3 || "Aguardando avaliação"}</Text>
                  </View>
                  <View style={styles.feedbackItem}>
                    <Text style={styles.feedbackLabel}>Elementos Gráficos</Text>
                    <Text style={styles.feedbackValue}>{ref.feedback?.q4 || "Aguardando avaliação"}</Text>
                  </View>
                </View>
              </View>

            </View>
          );
        })}

        {/* RODAPÉ (Repetido em todas as páginas via fixed) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>Relatório de Curadoria</Text>
        </View>
      </Page>
    </Document>
  );
}