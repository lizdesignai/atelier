// src/components/pdf/BriefingPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// 1. REGISTO DE FONTES DE LUXO
// O react-pdf precisa saber onde buscar as fontes para as injetar no arquivo final.
Font.register({
  family: 'Elegant',
  src: '/fonts/Elegant-Regular.ttf', // Certifique-se que o arquivo existe na pasta public/fonts/
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
    backgroundColor: '#fbf4e4', // Creme do Atelier
    padding: 60,
    paddingBottom: 80, // Espaço para o rodapé
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
    color: '#ad6f40', // Terracota
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
    marginBottom: 40,
  },
  headerTitle: {
    fontFamily: 'Elegant',
    fontSize: 24,
    color: '#ad6f40',
  },
  
  // --- INSIGHTS DA IA ---
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
  },
  aiBullet: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginBottom: 6,
    marginLeft: 10,
  },

  // --- DADOS DO CLIENTE ---
  qaContainer: {
    marginBottom: 24,
    wrap: false, // IMPEDE CORTES! Não quebra a meio da caixa
  },
  question: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 8,
  },
  answer: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#1a1a1a',
  },
  imageRef: {
    marginTop: 15,
    maxWidth: 300,
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
      if (!cleanLine) return null;
      
      // Limpa os asteriscos do negrito para não sujar a leitura
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

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        {/* Utilize o caminho completo da sua logo se houver erro ao carregar localmente */}
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Dossiê Estratégico</Text>
        <Text style={styles.coverSubtitle}>{projectName}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* PÁGINA 2 em diante: CONTEÚDO (Com paginação inteligente) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Fundamentação</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* CÉREBRO DA IA: DIAGNÓSTICO CBO */}
        {aiInsight && (
          <View style={styles.aiBox} wrap={false}>
            <Text style={styles.aiBoxTitle}>Diagnóstico de Marca (CBO)</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        <Text style={{ fontFamily: 'Elegant', fontSize: 18, color: '#1a1a1a', marginBottom: 20 }}>
          Sumário do Cliente
        </Text>

        {/* MAPEAMENTO DO BRIEFING (Protegido contra cortes por 'wrap={false}') */}
        {Object.entries(clientBriefing).map(([key, val]: any, index) => {
          if (!val || key === 'logo_atual_url') return null;
          
          return (
            <View key={index} style={styles.qaContainer} wrap={false}>
              <Text style={styles.question}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.answer}>{String(val)}</Text>
            </View>
          );
        })}

        {/* IMAGEM DE REFERÊNCIA */}
        {clientBriefing.logo_atual_url && (
          <View style={[styles.qaContainer, { marginTop: 20 }]} wrap={false}>
            <Text style={styles.question}>Referência Visual (Logotipo Anterior)</Text>
            <Image src={clientBriefing.logo_atual_url} style={styles.imageRef} />
          </View>
        )}

        {/* RODAPÉ (Repetido em todas as páginas automaticamente usando o 'fixed') */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier Liz Design</Text>
          <Text style={styles.footerText}>Página</Text>
        </View>
      </Page>
    </Document>
  );
}