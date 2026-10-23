// src/components/pdf/BriefingPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { stripEmojis } from '@/lib/pdfUtils';
import { BRIEFING_LABELS, normalizeBriefingAnswers } from '@/lib/briefingConstants';

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

  // --- CAPÍTULO DE CONCORRENTES & BENCHMARK ---
  competitorChapter: {
    marginTop: 20,
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#B66940',
  },
  chapterHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 44, 72, 0.1)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  chapterTag: {
    fontSize: 8.5,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#B66940',
    fontWeight: 700,
    marginBottom: 4,
  },
  chapterTitle: {
    fontFamily: 'Elegant',
    fontSize: 20,
    color: '#142C48',
  },
  chapterSubtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
    lineHeight: 1.4,
  },
  competitorCard: {
    backgroundColor: '#FAF7F5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 44, 72, 0.08)',
  },
  competitorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 44, 72, 0.06)',
    paddingBottom: 6,
  },
  competitorHandle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#142C48',
  },
  competitorFullName: {
    fontSize: 10,
    color: '#666666',
    fontStyle: 'italic',
  },
  competitorBio: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#444444',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricPill: {
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 44, 72, 0.08)',
  },
  metricLabel: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888888',
  },
  metricValue: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#142C48',
    marginTop: 2,
  },
  postsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  postBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 44, 72, 0.06)',
  },
  postImage: {
    width: '100%',
    height: 70,
    borderRadius: 4,
    marginBottom: 4,
    objectFit: 'cover',
  },
  postStat: {
    fontSize: 8,
    color: '#666666',
    fontWeight: 700,
  },
  postCaption: {
    fontSize: 7.5,
    color: '#777777',
    marginTop: 2,
    lineHeight: 1.3,
  },
  strategyGrid: {
    marginTop: 10,
    gap: 10,
  },
  strategyItem: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#142C48',
    marginBottom: 8,
  },
  strategyLabel: {
    fontSize: 8.5,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#142C48',
    fontWeight: 700,
    marginBottom: 3,
  },
  strategyText: {
    fontSize: 10,
    lineHeight: 1.45,
    color: '#222222',
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

interface BriefingPDFProps {
  clientBriefing: any;
  projectName: string;
  aiInsight?: string;
  competitorsData?: any[];
}

export default function BriefingPDF({ clientBriefing, projectName, aiInsight, competitorsData }: BriefingPDFProps) {
  const brandName = clientBriefing?.Nome_Marca || clientBriefing?.nome_marca || clientBriefing?.Nome_Logotipo || clientBriefing?.nome_logo || '';
  const resolvedProjectName = (projectName && projectName !== 'Cliente') ? projectName : (brandName || projectName || 'Identidade Visual');
  const safeProjectName = stripEmojis(resolvedProjectName);

  // Normalizar respostas e unwrap se vier com campo answers
  const flatBriefing = clientBriefing?.answers ? { ...clientBriefing.answers, ...clientBriefing } : (clientBriefing || {});

  // Dados de concorrentes do Apify (via prop ou embutidos no briefing)
  const resolvedCompetitors: any[] = competitorsData 
    || flatBriefing.competitors_data 
    || flatBriefing.competitor_analysis 
    || [];

  // Perguntas de mercado do cliente
  const competitorStrategy = [
    { label: 'Principais Concorrentes Citados', value: flatBriefing.concorrentes || flatBriefing.Concorrentes || flatBriefing.concorrentes_links || flatBriefing.Links_Concorrentes },
    { label: 'O que os concorrentes fazem de bom?', value: flatBriefing.concorrentes_bom || flatBriefing.Concorrentes_Bom },
    { label: 'O que fazer de diferente da concorrência?', value: flatBriefing.fazer_diferente || flatBriefing.Fazer_Diferente },
    { label: 'O que deseja EVITAR do mercado atual?', value: flatBriefing.evitar_mercado || flatBriefing.Evitar_Mercado },
    { label: 'Como a marca quer ser percebida frente aos concorrentes', value: flatBriefing.diferenca_percebida || flatBriefing.Diferenca_Percebida },
    { label: 'O que definitivamente NÃO fazer', value: flatBriefing.nao_fazer || flatBriefing.O_Que_Nao_Fazer || flatBriefing.o_que_nao_fazer },
    { label: 'Diferencial Competitivo Central', value: flatBriefing.diferencial || flatBriefing.Diferencial }
  ].filter(item => item.value && String(item.value).trim() !== '');

  // Função nativa para formatar a resposta da IA dentro do @react-pdf/renderer
  const renderAiInsight = (text: string) => {
    if (!text) return null;
    const cleanText = stripEmojis(text);
    const lines = cleanText.split('\n');
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

  // Normalizar respostas deduplicando minúsculas/maiúsculas e traduzindo todas as perguntas
  const normalizedAnswers = normalizeBriefingAnswers(flatBriefing);

  // Chaves já exibidas no capítulo de concorrentes para não repetir
  const competitorKeysToOmit = new Set([
    'concorrentes', 'links_concorrentes', 'concorrentes_links', 'concorrentes_bom',
    'fazer_diferente', 'evitar_mercado', 'diferenca_percebida', 'nao_fazer',
    'o_que_nao_fazer', 'diferencial', 'competitors_data', 'competitor_analysis'
  ]);

  return (
    <Document>
      {/* PÁGINA 1: CAPA EDITORIAL */}
      <Page size="A4" style={styles.coverPage}>
        <Image src="/images/simbolo-rosa.png" style={styles.coverLogo} />
        <Text style={styles.coverTitle}>{safeProjectName || 'Briefing'}</Text>
        <Text style={styles.coverSubtitle}>Dossiê & Briefing de Identidade Visual</Text>
        <Text style={styles.coverDate}>{currentDate} • Studio Veronna</Text>
      </Page>

      {/* PÁGINA 2 em diante: CONTEÚDO PRINCIPAL */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Briefing de Marca</Text>
          <Image src="/images/simbolo-rosa.png" style={{ width: 24, height: 24, opacity: 0.5 }} />
        </View>

        {/* VISÃO ESTRATÉGICA / INSIGHTS */}
        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiBoxTitle}>Visão Estratégica da Marca</Text>
            {renderAiInsight(aiInsight)}
          </View>
        )}

        {/* ===================================================================== */}
        {/* CAPÍTULO DEDICADO: ANÁLISE DE CONCORRENTES & BENCHMARK VISUAL */}
        {/* ===================================================================== */}
        {(competitorStrategy.length > 0 || resolvedCompetitors.length > 0) && (
          <View style={styles.competitorChapter} wrap={false}>
            <View style={styles.chapterHeader}>
              <Text style={styles.chapterTag}>Capítulo Estratégico • Mercado & Concorrência</Text>
              <Text style={styles.chapterTitle}>Análise de Concorrentes & Benchmark Visual</Text>
              <Text style={styles.chapterSubtitle}>
                Mapeamento analítico de inteligência de mercado, posicionamento competitivo e auditoria visual dos concorrentes no ecossistema do Instagram via Apify.
              </Text>
            </View>

            {/* Respostas de posicionamento do cliente */}
            {competitorStrategy.length > 0 && (
              <View style={styles.strategyGrid}>
                {competitorStrategy.map((strat, idx) => (
                  <View key={`strat_${idx}`} style={styles.strategyItem} wrap>
                    <Text style={styles.strategyLabel}>{stripEmojis(strat.label)}</Text>
                    <Text style={styles.strategyText}>{stripEmojis(String(strat.value))}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cards dos perfis extraídos via Apify */}
            {resolvedCompetitors.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.strategyLabel, { marginBottom: 10, color: '#B66940' }]}>
                  Telemetria Oficial dos Concorrentes (Instagram Intelligence via Apify)
                </Text>

                {resolvedCompetitors.map((comp: any, compIdx: number) => (
                  <View key={`comp_${compIdx}`} style={styles.competitorCard} wrap>
                    <View style={styles.competitorCardHeader}>
                      <Text style={styles.competitorHandle}>@{comp.username}</Text>
                      <Text style={styles.competitorFullName}>{stripEmojis(comp.fullName || comp.username)}</Text>
                    </View>

                    {comp.biography ? (
                      <Text style={styles.competitorBio}>{stripEmojis(comp.biography)}</Text>
                    ) : null}

                    <View style={styles.metricsRow}>
                      <View style={styles.metricPill}>
                        <Text style={styles.metricLabel}>Seguidores</Text>
                        <Text style={styles.metricValue}>
                          {Number(comp.followersCount || 0).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                      <View style={styles.metricPill}>
                        <Text style={styles.metricLabel}>Posts</Text>
                        <Text style={styles.metricValue}>
                          {Number(comp.postsCount || 0).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                      {comp.avgEngagementRate !== undefined && (
                        <View style={styles.metricPill}>
                          <Text style={styles.metricLabel}>Engajamento Médio</Text>
                          <Text style={styles.metricValue}>{comp.avgEngagementRate}%</Text>
                        </View>
                      )}
                    </View>

                    {/* Top posts do concorrente */}
                    {Array.isArray(comp.topPosts) && comp.topPosts.length > 0 && (
                      <View style={styles.postsRow}>
                        {comp.topPosts.slice(0, 3).map((post: any, pIdx: number) => (
                          <View key={`p_${pIdx}`} style={styles.postBox}>
                            {post.imageUrl ? (
                              <Image src={post.imageUrl} style={styles.postImage} />
                            ) : null}
                            <Text style={styles.postStat}>
                              ♥ {post.likes || 0}  💬 {post.comments || 0}
                            </Text>
                            {post.caption ? (
                              <Text style={styles.postCaption}>
                                {stripEmojis((post.caption || '').slice(0, 75))}...
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Conheça {safeProjectName}</Text>

        {/* MAPEAMENTO DO BRIEFING LIMPO E DEDUPLICADO */}
        {normalizedAnswers.map((item, index) => {
          if (
            item.key.includes('url') || 
            item.key.toLowerCase().endsWith('_outro') ||
            competitorKeysToOmit.has(item.key.toLowerCase())
          ) {
            return null;
          }
          
          return (
            <View key={index} style={styles.qaContainer} wrap>
              <Text style={styles.question}>{stripEmojis(item.label)}</Text>
              <Text style={styles.answer}>{stripEmojis(String(item.value))}</Text>
            </View>
          );
        })}

        {/* IMAGEM DE REFERÊNCIA (Se existir) */}
        {flatBriefing.logo_atual_url && (
          <View style={[styles.qaContainer, { marginTop: 20 }]} wrap>
            <Text style={styles.question}>Referência Visual (Logotipo Anterior)</Text>
            <Image src={flatBriefing.logo_atual_url} style={styles.imageRef} />
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
