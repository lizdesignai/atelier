// src/lib/presenca/constants.ts
// Regras, vocabulário e tipos compartilhados (servidor + UI) do módulo Presença.
// Sem dependências de servidor: pode ser importado em componentes client.

export const MOVEMENTS = [
  { id: 'direcionar', n: '01', label: 'Direcionar', hint: 'Objetivo e função do conteúdo' },
  { id: 'planejar', n: '02', label: 'Planejar', hint: 'Temas, formatos e calendário' },
  { id: 'produzir', n: '03', label: 'Produzir', hint: 'Peças, legendas e CTAs' },
  { id: 'aprovar', n: '04', label: 'Aprovar', hint: 'Decisões do cliente num só lugar' },
  { id: 'publicar', n: '05', label: 'Publicar', hint: 'Calendário aprovado em execução' },
  { id: 'aprender', n: '06', label: 'Aprender', hint: 'Sinais, conclusões e próximos testes' },
] as const;
export type MovementId = (typeof MOVEMENTS)[number]['id'];

export const PILLARS = [
  { id: 'descoberta', label: 'Descoberta', color: '#6C8EBF' },
  { id: 'autoridade', label: 'Autoridade', color: '#B5651D' },
  { id: 'relacionamento', label: 'Relacionamento', color: '#7A9E7E' },
  { id: 'conversao', label: 'Conversão', color: '#C0654A' },
] as const;
export type PillarId = (typeof PILLARS)[number]['id'];

export type PillarWeights = Record<PillarId, number>;

/** Mix editorial inicial por objetivo: o peso de cada pilar muda conforme o negócio. */
export const OBJECTIVE_KINDS: Record<string, { label: string; weights: PillarWeights; metrics: { key: string; label: string }[] }> = {
  descoberta: {
    label: 'Descoberta',
    weights: { descoberta: 45, autoridade: 25, relacionamento: 20, conversao: 10 },
    metrics: [
      { key: 'reach', label: 'Alcance' },
      { key: 'views', label: 'Visualizações' },
      { key: 'non_followers_reach', label: 'Alcance de não seguidores' },
    ],
  },
  autoridade: {
    label: 'Autoridade',
    weights: { descoberta: 20, autoridade: 45, relacionamento: 20, conversao: 15 },
    metrics: [
      { key: 'saves', label: 'Salvamentos' },
      { key: 'shares', label: 'Compartilhamentos' },
      { key: 'video_retention', label: 'Retenção de vídeo' },
    ],
  },
  relacionamento: {
    label: 'Relacionamento',
    weights: { descoberta: 15, autoridade: 25, relacionamento: 45, conversao: 15 },
    metrics: [
      { key: 'replies', label: 'Respostas' },
      { key: 'interactions', label: 'Interações' },
      { key: 'relevant_conversations', label: 'Conversas relevantes' },
    ],
  },
  consideracao: {
    label: 'Consideração',
    weights: { descoberta: 15, autoridade: 30, relacionamento: 20, conversao: 35 },
    metrics: [
      { key: 'profile_visits', label: 'Visitas ao perfil' },
      { key: 'link_clicks', label: 'Cliques' },
      { key: 'profile_actions', label: 'Ações no perfil' },
    ],
  },
  conversao: {
    label: 'Conversão',
    weights: { descoberta: 10, autoridade: 25, relacionamento: 15, conversao: 50 },
    metrics: [
      { key: 'qualified_contacts', label: 'Contatos qualificados' },
      { key: 'quote_requests', label: 'Solicitações de orçamento' },
      { key: 'bookings', label: 'Agendamentos / vendas rastreáveis' },
    ],
  },
};

export const ADJUST_TYPES = [
  { id: 'info', label: 'Informação incorreta' },
  { id: 'text', label: 'Texto / legenda' },
  { id: 'visual', label: 'Visual' },
  { id: 'offer', label: 'Oferta' },
  { id: 'other', label: 'Outro' },
] as const;
export type AdjustTypeId = (typeof ADJUST_TYPES)[number]['id'];

export const PIECE_STATUS = {
  in_production: { label: 'Em produção', tone: 'neutral' },
  awaiting_approval: { label: 'Aguardando aprovação', tone: 'warn' },
  adjust_requested: { label: 'Ajuste solicitado', tone: 'alert' },
  approved: { label: 'Aprovado', tone: 'good' },
  scheduled: { label: 'Agendado', tone: 'info' },
  published: { label: 'Publicado', tone: 'good' },
  failed: { label: 'Falha na publicação', tone: 'alert' },
} as const;
export type PieceStatus = keyof typeof PIECE_STATUS;

export const PULSE_QUESTIONS = [
  { id: 'offer', q: 'Há alguma oferta que merece prioridade no próximo ciclo?' },
  { id: 'dates', q: 'Existe alguma data ou campanha relevante?' },
  { id: 'doubts', q: 'Alguma dúvida recorrente apareceu nas conversas com clientes?' },
  { id: 'news', q: 'Há novos produtos, projetos ou depoimentos para usar?' },
  { id: 'changes', q: 'Alguma coisa mudou no negócio ou no público?' },
] as const;

export const STRATEGIC_DIRECTION_QUESTIONS = PULSE_QUESTIONS;

/** Prazo operacional proposto: 2 dias úteis após a notificação. Ajustável por contrato. */
export const APPROVAL_SLA_BUSINESS_DAYS = 2;
export const PULSE_WINDOW_DAYS = 7;

export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) count++;
  }
  return count;
}

/** Vocabulário de "peça": design/vídeo que não seja etapa interna (estratégia, setup, relatório...). */
export function isPieceTask(t: { task_type?: string | null; stage?: string | null; ig_is_piece?: boolean | null; title?: string | null }): boolean {
  if (typeof t.ig_is_piece === 'boolean') return t.ig_is_piece;
  const title = (t.title || '').toLowerCase();
  // Excluir expressamente etapas internas e entregáveis estratégicos
  if (/estrat|setup|imers|onboard|relat|briefing|calend[áa]rio|alinhamento|roteir/i.test(title)) return false;
  if (/estrat|setup|imers|onboard|relat/i.test(t.stage || '')) return false;

  const type = (t.task_type || '').toLowerCase();
  if (type === 'design' || type === 'video' || type === 'post' || type === 'carrossel' || type === 'reels') return true;
  if (/post\s+\d+|edição de vídeo|design\s*&\s*copy/i.test(title)) return true;
  return false;
}

export function deriveStatus(t: {
  status?: string | null;
  ig_publish_status?: string | null;
  ig_published_at?: string | null;
}): PieceStatus {
  if (t.ig_publish_status && t.ig_publish_status in PIECE_STATUS) return t.ig_publish_status as PieceStatus;
  switch (t.status) {
    case 'pending_client_approval':
      return 'awaiting_approval';
    case 'review':
      return 'adjust_requested';
    case 'completed':
      return t.ig_published_at ? 'published' : 'approved';
    default:
      return 'in_production';
  }
}
