// src/components/pdf/BrandbookPDF.tsx
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
    marginBottom: 40,
  },
  headerTitle: {
    fontFamily: 'Elegant',
    fontSize: 24,
    color: '#ad6f40',
  },

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

  // ESTILOS DE DADOS DO LABORATÓRIO
  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 26,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122,116,112,0.2)',
    paddingBottom: 10,
    marginBottom: 25,
    marginTop: 20,
  },
  
  tiltContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tiltLabel: {
    width: 140,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  tiltBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0e6dd',
    borderRadius: 3,
    marginHorizontal: 15,
  },
  tiltBarFill: {
    height: '100%',
    backgroundColor: '#ad6f40',
    borderRadius: 3,
  },
  tiltValue: {
    width: 40,
    fontSize: 12,
    fontFamily: 'Elegant',
    color: '#ad6f40',
    textAlign: 'right',
  },

  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 30,
  },
  dataCard: {
    width: '46%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0e6dd',
  },
  dataCardLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 8,
  },
  dataCardValue: {
    fontSize: 12,
    color: '#1a1a1a',
    lineHeight: 1.4,
  },

  synapseContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0e6dd',
  },
  synapseImage: {
    width: 120,
    height: 160,
    objectFit: 'cover',
    borderRadius: 4,
  },
  synapseTextContainer: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  synapseReasonLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 8,
  },
  synapseReasonValue: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#4a4a4a',
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

// Tradutores de Dicionário
const SEMIOTICS_MAP: Record<string, { A: string, B: string }> = {
  lighting: { A: "Luz Natural (Acolhedor)", B: "Luz Dura & Sombras (Cinemático)" },
  framing: { A: "Macro/Detalhe (Intimista)", B: "Plano Aberto (Operacional)" },
  presence: { A: "Movimento Real (Cândido)", B: "Retrato Posado (Autoridade)" },
  temperature: { A: "Tons Quentes (Tradição)", B: "Tons Frios (Hiper-modernidade)" },
  composition: { A: "Caos Criativo (Assimétrico)", B: "Rigor Técnico (Simetria)" },
  setting: { A: "Urbano/Rua (Vivência)", B: "Interior Polido (Isolamento/Luxo)" },
  post_prod: { A: "Granulação (Verdade)", B: "Nitidez 4K (Sofisticação)" },
  negative_space: { A: "Informação Densa (Complexidade)", B: "Espaço Vazio (Minimalismo)" }
};

const VOICE_MAP: Record<string, string> = {
  A: "Oculto/Educativo",
  B: "Estrategista Frio/Soberano",
  C: "Implacável/Agressivo"
};

interface BrandbookPDFProps {
  clientName: string;
  aiInsight?: string;
  tilt: { technical: number, culture: number, lifestyle: number, community: number };
  semiotics?: Record<string, string>;
  voice?: Record<string, string>;
  synapses?: { url: string, reason: string }[];
}

export default function BrandbookPDF({ clientName, aiInsight, tilt, semiotics = {}, voice = {}, synapses = [] }: BrandbookPDFProps) {
  
  const renderAiInsight = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null;
      
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
      {/* CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Manual de Operações da Marca</Text>
        <Text style={styles.coverSubtitle}>{clientName} • Brandbook Código-Fonte</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier Liz Design</Text>
      </Page>

      {/* PÁGINA 1: O CÓDIGO FONTE (IA) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Inteligência Estratégica</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {aiInsight ? (
          <View style={styles.aiBox} wrap={false}>
            <Text style={styles.aiBoxTitle}>Estratégia CMO (Atelier Core)</Text>
            {renderAiInsight(aiInsight)}
          </View>
        ) : (
          <Text style={styles.aiP}>O Código-Fonte gerado por Inteligência Artificial ainda não foi compilado para esta marca.</Text>
        )}

        {/* RODAPÉ GLOBAL */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier Liz Design</Text>
          <Text style={styles.footerText}>O Código-Fonte</Text>
        </View>
      </Page>

      {/* PÁGINA 2: MATRIZ DE ALOCAÇÃO E SINTAXE VISUAL */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Decodificação de Identidade</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* ZONA 1: CONTENT TILT */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>1. Alocação de Energia (Tilt)</Text>
          
          <View style={styles.tiltContainer}>
            <Text style={styles.tiltLabel}>Autoridade Técnica</Text>
            <View style={styles.tiltBarBg}><View style={[styles.tiltBarFill, { width: `${tilt.technical || 0}%` }]} /></View>
            <Text style={styles.tiltValue}>{tilt.technical || 0}%</Text>
          </View>
          
          <View style={styles.tiltContainer}>
            <Text style={styles.tiltLabel}>Cultura e Bastidores</Text>
            <View style={styles.tiltBarBg}><View style={[styles.tiltBarFill, { width: `${tilt.culture || 0}%` }]} /></View>
            <Text style={styles.tiltValue}>{tilt.culture || 0}%</Text>
          </View>
          
          <View style={styles.tiltContainer}>
            <Text style={styles.tiltLabel}>Lifestyle e Status</Text>
            <View style={styles.tiltBarBg}><View style={[styles.tiltBarFill, { width: `${tilt.lifestyle || 0}%` }]} /></View>
            <Text style={styles.tiltValue}>{tilt.lifestyle || 0}%</Text>
          </View>

          <View style={styles.tiltContainer}>
            <Text style={styles.tiltLabel}>Comunidade (Tribo)</Text>
            <View style={styles.tiltBarBg}><View style={[styles.tiltBarFill, { width: `${tilt.community || 0}%` }]} /></View>
            <Text style={styles.tiltValue}>{tilt.community || 0}%</Text>
          </View>
        </View>

        {/* ZONA 2 & 3: SEMIÓTICA E VOZ */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>2. Sintaxe Visual e Conduta</Text>
          
          <View style={styles.dataGrid}>
            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>A Natureza da Luz</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.lighting ? SEMIOTICS_MAP.lighting[semiotics.lighting as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>
            
            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>O Foco Narrativo</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.framing ? SEMIOTICS_MAP.framing[semiotics.framing as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>A Presença Humana</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.presence ? SEMIOTICS_MAP.presence[semiotics.presence as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>Tom de Cor</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.temperature ? SEMIOTICS_MAP.temperature[semiotics.temperature as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>Composição</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.composition ? SEMIOTICS_MAP.composition[semiotics.composition as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>Cenário / Background</Text>
              <Text style={styles.dataCardValue}>
                {semiotics.setting ? SEMIOTICS_MAP.setting[semiotics.setting as 'A'|'B'] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>Voz: Objeção de Preço</Text>
              <Text style={styles.dataCardValue}>
                {voice.price ? VOICE_MAP[voice.price] : 'Pendente'}
              </Text>
            </View>

            <View style={styles.dataCard}>
              <Text style={styles.dataCardLabel}>Voz: Celebração</Text>
              <Text style={styles.dataCardValue}>
                {voice.victory ? VOICE_MAP[voice.victory] : 'Pendente'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier Liz Design</Text>
          <Text style={styles.footerText}>Laboratório de Expressão</Text>
        </View>
      </Page>

      {/* PÁGINA 3: COFRE DE SINAPSES (Opcional - só aparece se houver uploads) */}
      {synapses && synapses.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header} fixed>
            <Text style={styles.headerTitle}>O Cofre de Sinapses</Text>
            <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
          </View>

          <Text style={{ fontSize: 11, color: '#7a7470', marginBottom: 20, lineHeight: 1.5 }}>
            Os fragmentos visuais abaixo foram selecionados pelo cliente como referências de desejo. A Direção de Arte utilizará estes ativos para extração de paleta e textura de realidade.
          </Text>

          {synapses.map((syn, idx) => (
            <View key={idx} style={styles.synapseContainer} wrap={false}>
              <Image src={syn.url} style={styles.synapseImage} />
              <View style={styles.synapseTextContainer}>
                <Text style={styles.synapseReasonLabel}>Motivo da Extração</Text>
                <Text style={styles.synapseReasonValue}>{syn.reason || "Nenhum motivo especificado."}</Text>
              </View>
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Atelier Liz Design</Text>
            <Text style={styles.footerText}>Repositório de Ativos</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}