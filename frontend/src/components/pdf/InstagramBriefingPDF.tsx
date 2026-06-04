// src/components/pdf/InstagramBriefingPDF.tsx
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

// 2. ESTÉTICA EDITORIAL (PADRONIZADA ATELIER)
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
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: 'Elegant',
    fontSize: 22,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122,116,112,0.2)',
    paddingBottom: 8,
    marginBottom: 15,
  },
  questionBox: {
    marginBottom: 15,
  },
  label: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#ad6f40',
    fontWeight: 700,
    marginBottom: 4,
  },
  value: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#333333',
    textAlign: 'justify',
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

interface InstagramBriefingPDFProps {
  data: any;
  clientName: string;
  aiInsight?: string;
}

export default function InstagramBriefingPDF({ data, clientName, aiInsight }: InstagramBriefingPDFProps) {
  // Blindagem 1: Garante que o componente não explode se não houver dados
  if (!data) {
    console.warn("[PDF Engine] Dados não fornecidos para geração do PDF.");
    return null;
  }

// Blindagem 2: Parsing seguro do JSON caso o Supabase devolva os 'answers' como string
  let safeData: any = {}; // 🟢 A SOLUÇÃO: Declarar como 'any' para o TS não reclamar das propriedades
  if (typeof data === 'string') {
    try { safeData = JSON.parse(data); } catch (e) { console.error("Erro ao fazer parse do Briefing JSON:", e); }
  } else {
    safeData = data;
  }

  // Garantia de propriedades para não renderizar `undefined` no PDF
  const produtoAncora = safeData?.produto_ancora || "Não preenchido.";
  const clienteIdeal = safeData?.cliente_ideal || "Não preenchido.";
  const gatilhoCompra = safeData?.gatilho_compra === 'Outro' 
    ? (safeData?.gatilho_compra_outro || "Gatilho customizado não especificado.") 
    : (safeData?.gatilho_compra || "Não preenchido.");
  
  const inimigoComum = safeData?.inimigo_comum || "Não preenchido.";
  const padraoExcelencia = safeData?.padrao_excelencia || "Não preenchido.";
  
  const personaMarca = safeData?.persona_marca || "Não preenchido.";
  const arsenalVisual = safeData?.arsenal_visual || "Não preenchido.";
  const pontoChegada = safeData?.ponto_chegada || "Não preenchido.";


  const renderAiInsight = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return null;
      
      let textContent = cleanLine.replace(/\*\*/g, '');

      if (cleanLine.startsWith('###')) {
        return <Text key={`h3-${index}`} style={styles.aiH3}>{textContent.replace('###', '').trim()}</Text>;
      }
      if (cleanLine.startsWith('-')) {
        return <Text key={`bullet-${index}`} style={styles.aiBullet}>• {textContent.replace('-', '').trim()}</Text>;
      }
      return <Text key={`p-${index}`} style={styles.aiP}>{textContent}</Text>;
    });
  };

  const currentDate = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>Dossiê de Mercado</Text>
        <Text style={styles.coverSubtitle}>{clientName || "Cliente Atelier"}</Text>
        <Text style={styles.coverDate}>{currentDate} • Atelier LizDesign</Text>
      </Page>

      {/* PÁGINA 2 EM DIANTE: CONTEÚDO E ESTRATÉGIA */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Análise Estratégica</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* ESTRATÉGIA DO CMO (IA) */}
        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiBoxTitle}>Estratégia de Dominação (IA CMO)</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        {/* ESTÁGIO 1: NÚCLEO DE CONVERSÃO */}
        <View style={styles.sectionContainer} wrap={false}>
          <Text style={styles.sectionTitle}>01. Núcleo de Conversão</Text>
          
          <View style={styles.questionBox}>
            <Text style={styles.label}>Produto Âncora</Text>
            <Text style={styles.value}>{produtoAncora}</Text>
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.label}>A Regra de Pareto (Cliente Ideal)</Text>
            <Text style={styles.value}>{clienteIdeal}</Text>
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.label}>O Gatilho de Compra</Text>
            <Text style={styles.value}>{gatilhoCompra}</Text>
          </View>
        </View>

        {/* ESTÁGIO 2: DINÂMICA DE GUERRA */}
        <View style={styles.sectionContainer} wrap={false}>
          <Text style={styles.sectionTitle}>02. Dinâmica de Guerra</Text>
          
          <View style={styles.questionBox}>
            <Text style={styles.label}>O Inimigo Comum</Text>
            <Text style={styles.value}>{inimigoComum}</Text>
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.label}>Padrão de Excelência</Text>
            <Text style={styles.value}>{padraoExcelencia}</Text>
          </View>
        </View>

        {/* ESTÁGIO 3: ARSENAL E VOZ */}
        <View style={styles.sectionContainer} wrap={false}>
          <Text style={styles.sectionTitle}>03. Arsenal e Voz</Text>
          
          <View style={styles.questionBox}>
            <Text style={styles.label}>Persona da Marca</Text>
            <Text style={styles.value}>{personaMarca}</Text>
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.label}>Estado do Arsenal Visual</Text>
            <Text style={styles.value}>{arsenalVisual}</Text>
          </View>
        </View>

        {/* ESTÁGIO 4: ENDGAME */}
        <View style={styles.sectionContainer} wrap={false}>
          <Text style={styles.sectionTitle}>04. Endgame</Text>
          
          <View style={styles.questionBox}>
            <Text style={styles.label}>Ponto de Chegada (Métricas de Vitória)</Text>
            <Text style={styles.value}>{pontoChegada}</Text>
          </View>
        </View>

        {/* RODAPÉ */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Atelier LizDesign</Text>
          <Text style={styles.footerText}>Instagram • Estudo de Mercado</Text>
        </View>
      </Page>
    </Document>
  );
}