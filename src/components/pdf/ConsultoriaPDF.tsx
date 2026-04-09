// src/components/pdf/ConsultoriaPDF.tsx
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

// 2. ESTÉTICA EDITORIAL ESTRATÉGICA
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fbf4e4',
    padding: 60,
    paddingBottom: 80, 
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
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: '#ad6f40',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverDetails: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#7a7470',
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

  // CAIXAS DE DESTAQUE (Diagnóstico Visual & Arquétipo)
  primaryBox: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ad6f40',
    marginBottom: 24,
  },
  
  // CAIXAS SECUNDÁRIAS (Tom de Voz & Stories)
  secondaryBox: {
    backgroundColor: '#fcfaf8',
    padding: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0e6dd',
    marginBottom: 24,
  },

  boxTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 12,
  },
  
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
    textAlign: 'justify',
  },

  // ESTILOS DOS PILARES DE CONTEÚDO
  pillarsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  pillarItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
    alignItems: 'center',
  },
  pillarNumber: {
    fontFamily: 'Elegant',
    fontSize: 28,
    color: '#ad6f40',
    marginRight: 20,
  },
  pillarText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a1a',
    flex: 1,
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

export interface ConsultoriaResult {
  brand_archetype: string;
  visual_diagnosis: string;
  tone_of_voice: string;
  stories_strategy: string;
  content_pillars: string[];
}

interface ConsultoriaPDFProps {
  clientName: string;
  instagram: string;
  nicho: string;
  result: ConsultoriaResult;
}

export default function ConsultoriaPDF({ clientName, instagram, nicho, result }: ConsultoriaPDFProps) {
  if (!result) return null;

  const currentDate = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  // Utilitário para quebrar textos em parágrafos caso a IA retorne blocos longos com \n
  const renderText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (!line.trim()) return null;
      return <Text key={idx} style={[styles.paragraph, { marginBottom: 6 }]}>{line.trim()}</Text>;
    });
  };

  return (
    <Document>
      {/* CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Auditoria Estratégica</Text>
        <Text style={styles.coverSubtitle}>{clientName}</Text>
        <Text style={styles.coverDetails}>{instagram} • {nicho}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* CONTEÚDO PRINCIPAL */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Diagnóstico de Autoridade</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* 1. ARQUÉTIPO DE MARCA */}
        <View style={styles.primaryBox} wrap={false}>
          <Text style={styles.boxTitle}>Arquétipo de Marca Recomendado</Text>
          <Text style={{ fontFamily: 'Elegant', fontSize: 22, color: '#1a1a1a', marginBottom: 8 }}>
            {result.brand_archetype.split('-')[0] || result.brand_archetype}
          </Text>
          <Text style={styles.paragraph}>
            {result.brand_archetype.includes('-') ? result.brand_archetype.split('-')[1].trim() : ''}
          </Text>
        </View>

        {/* 2. DIAGNÓSTICO VISUAL */}
        <View style={styles.secondaryBox} wrap={false}>
          <Text style={styles.boxTitle}>Diagnóstico Visual e Estético</Text>
          {renderText(result.visual_diagnosis)}
        </View>

        {/* 3. TOM DE VOZ */}
        <View style={styles.secondaryBox} wrap={false}>
          <Text style={styles.boxTitle}>Tom de Voz (Brand Persona)</Text>
          {renderText(result.tone_of_voice)}
        </View>

        {/* 4. ESTRATÉGIA DE STORIES */}
        <View style={styles.secondaryBox} wrap={false}>
          <Text style={styles.boxTitle}>Dinâmica de Conversão (Stories)</Text>
          {renderText(result.stories_strategy)}
        </View>

        {/* 5. PILARES DE CONTEÚDO */}
        <View style={styles.pillarsSection} wrap={false}>
          <Text style={styles.boxTitle}>Táticas & Pilares de Conteúdo</Text>
          {result.content_pillars.map((pillar, index) => (
            <View key={index} style={styles.pillarItem}>
              <Text style={styles.pillarNumber}>0{index + 1}</Text>
              <Text style={styles.pillarText}>{pillar}</Text>
            </View>
          ))}
        </View>

        {/* RODAPÉ (Repetido em todas as páginas) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>Documento Confidencial</Text>
        </View>
      </Page>
    </Document>
  );
}