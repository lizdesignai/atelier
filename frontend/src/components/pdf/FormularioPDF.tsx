// src/components/pdf/FormularioPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// 1. REGISTO DE FONTES DE LUXO
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

Font.register({
  family: 'Elegant',
  src: 'https://fonts.gstatic.com/s/playfairdisplay/v29/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2'
});

// 2. ESTILIZAÇÃO DO DOCUMENTO 
const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: 'Roboto',
    backgroundColor: '#FAFAFA', // Fundo leve para o PDF não ficar chapado
  },
  
  // --- CAPA EDITORIAL ---
  coverPage: {
    padding: 60,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogo: {
    width: 60,
    height: 60,
    marginBottom: 40,
  },
  coverTitle: {
    fontFamily: 'Elegant',
    fontSize: 42,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#ad6f40',
    textTransform: 'uppercase',
    letterSpacing: 4,
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

interface FormularioPDFProps {
  formType: string;
  clientName: string;
  dadosCompletos: Record<string, any>;
}

export default function FormularioPDF({ formType, clientName, dadosCompletos }: FormularioPDFProps) {
  const currentDate = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Orçamento & Captação</Text>
        <Text style={styles.coverSubtitle}>{formType}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* PÁGINA 2 em diante: CONTEÚDO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Ficha de Orçamento</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        <Text style={styles.sectionTitle}>Respostas do Prospect</Text>

        {/* MAPEAMENTO DO BRIEFING LIMPO */}
        {Object.entries(dadosCompletos || {}).map(([key, val]: any, index) => {
          if (!val) return null;
          
          const niceLabel = key.replace(/_/g, ' ');
          let displayValue = val;

          // Se for um Array
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

        {/* RODAPÉ (Repetido em todas as páginas automaticamente) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>{clientName || 'Atelier Liz Design'}</Text>
        </View>
      </Page>
    </Document>
  );
}
