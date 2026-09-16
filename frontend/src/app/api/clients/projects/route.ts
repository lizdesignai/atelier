import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const IDV_PIPELINE = [
  { stage: "Setup & Onboarding", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
  { stage: "Setup & Onboarding", type: "setup", title: "Pagamento", daysOffset: 1, estTime: 15 },
  { stage: "Imersão", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Imersão", type: "copy", title: "Formulário de briefing detalhado", daysOffset: 3, estTime: 30 },
  { stage: "Exploração", type: "design", title: "Estudo da marca, Concorrentes & Moodboard", daysOffset: 5, estTime: 180 },
  { stage: "Exploração", type: "copy", title: "Envio de Direcionamento Criativo", daysOffset: 6, estTime: 30 },
  { stage: "Design Sprint", type: "design", title: "Testes de Fontes e Modificações", daysOffset: 8, estTime: 120 },
  { stage: "Design Sprint", type: "design", title: "Testes de Símbolos & Paletas", daysOffset: 10, estTime: 180 },
  { stage: "Design Sprint", type: "design", title: "Montagem dos Mockups & Extras", daysOffset: 13, estTime: 240 },
  { stage: "Apresentação", type: "design", title: "Montagem de Apresentação Final", daysOffset: 15, estTime: 120 },
  { stage: "Apresentação", type: "reuniao", title: "Reunião de Apresentação", daysOffset: 16, estTime: 60 },
  { stage: "Handover", type: "design", title: "Fechamento de Arquivos e Envio Drive", daysOffset: 18, estTime: 60 }
];

const IG_SETUP = [
  { stage: "Setup Inicial", type: "setup", title: "Assinatura do contrato & Pagamento", daysOffset: 0, estTime: 30 },
  { stage: "Imersão", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Estratégia", type: "copy", title: "Estudo de marca, Persona, Tom de voz", daysOffset: 5, estTime: 180 },
  { stage: "Estratégia", type: "design", title: "Alinhamento Visual (Estilo do Feed)", daysOffset: 7, estTime: 120 },
];

const IG_PACKAGES: Record<string, any[]> = {
  "Pacote 1": [
    { stage: "Copywriting", type: "copy", title: "Roteirização de 6 Vídeos", daysOffset: 10, estTime: 120 },
    ...Array.from({ length: 6 }).map((_, i) => ({ stage: "Produção de Vídeo", type: "video", title: `Edição de Vídeo ${i + 1} + Capa`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação do Cliente & Agendamento", daysOffset: 18, estTime: 45 }
  ],
  "Pacote 2": [
    { stage: "Copywriting", type: "copy", title: "Revisão de Texto enviado pelo Cliente", daysOffset: 10, estTime: 30 },
    ...Array.from({ length: 4 }).map((_, i) => ({ stage: "Design Gráfico", type: "design", title: `Design de Post/Carrossel ${i + 1}`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação & Agendamento", daysOffset: 16, estTime: 45 }
  ],
  "Pacote 3": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 10, estTime: 90 },
    ...Array.from({ length: 8 }).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i + 1}`, daysOffset: 12 + (i * 0.5), estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico", daysOffset: 18, estTime: 60 },
    { stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 30, estTime: 60 }
  ],
  "Pacote 4": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial & Organização de Perfil", daysOffset: 10, estTime: 120 },
    { stage: "Estratégia", type: "setup", title: "Análise de Perfil", daysOffset: 12, estTime: 60 },
    ...Array.from({ length: 12 }).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i + 1}`, daysOffset: 13 + (i * 0.5), estTime: 60 })),
    { stage: "Produção Contínua", type: "copy", title: "Criação de Roteiros Diários de Stories", daysOffset: 20, estTime: 180 },
    { stage: "Relatório", type: "setup", title: "Relatório Mensal Profundo", daysOffset: 30, estTime: 90 }
  ]
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      client_id,
      service_type,
      project_package,
      financial_value,
      payment_method,
      payment_recurrence,
      payment_split,
      billing_date,
      contract_start,
      contract_end,
      posts_quantity,
      videos_quantity
    } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const sql = getDb();

    // Validar se o cliente existe no banco Neon
    const clientProfiles = await sql`SELECT id, nome FROM profiles WHERE id = ${client_id} LIMIT 1`;
    if (clientProfiles.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado no sistema.' }, { status: 404 });
    }

    const finValue = financial_value ? parseFloat(String(financial_value)) : 0;
    const pQty = posts_quantity ? parseInt(String(posts_quantity), 10) : 0;
    const vQty = videos_quantity ? parseInt(String(videos_quantity), 10) : 0;
    const projectType = service_type === 'Gestão de Instagram' ? (project_package || service_type) : (service_type || 'Identidade Visual');
    const cleanBillingDate = billing_date || null;
    const cleanContractStart = contract_start || null;
    const cleanContractEnd = contract_end || null;
    const cleanPaymentMethod = payment_method || null;
    const cleanPaymentRecurrence = payment_recurrence || 'Único';
    const cleanPaymentSplit = payment_split || null;

    const [newProject] = await sql`
      INSERT INTO projects (
        client_id,
        service_type,
        type,
        status,
        phase,
        fase,
        progress,
        financial_value,
        payment_method,
        payment_recurrence,
        payment_split,
        billing_date,
        data_limite,
        contract_start,
        contract_end,
        posts_quantity,
        videos_quantity,
        created_at
      )
      VALUES (
        ${client_id},
        ${service_type || 'Identidade Visual'},
        ${projectType},
        'active',
        'Mesa de Trabalho',
        'reuniao',
        0,
        ${finValue},
        ${cleanPaymentMethod},
        ${cleanPaymentRecurrence},
        ${cleanPaymentSplit},
        ${cleanBillingDate},
        ${cleanBillingDate},
        ${cleanContractStart},
        ${cleanContractEnd},
        ${pQty},
        ${vQty},
        NOW()
      )
      RETURNING *
    `;

    // Gerar pipeline de tarefas
    let pipeline: any[] = [];
    if (service_type === 'Identidade Visual') {
      pipeline = IDV_PIPELINE;
    } else {
      pipeline = [...IG_SETUP];

      if (pQty > 0 || vQty > 0) {
        pipeline.push({ stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 5, estTime: 90 });
      }

      if (vQty > 0) {
        pipeline.push({ stage: "Copywriting", type: "copy", title: `Roteirização de ${vQty} Vídeos`, daysOffset: 7, estTime: 60 });
        for (let i = 0; i < vQty; i++) {
          pipeline.push({ stage: "Produção de Vídeo", type: "video", title: `Edição de Vídeo ${i + 1} + Capa`, daysOffset: 10 + (i * 0.5), estTime: 60 });
        }
      }

      if (pQty > 0) {
        for (let i = 0; i < pQty; i++) {
          pipeline.push({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i + 1}`, daysOffset: 11 + (i * 0.5), estTime: 60 });
        }
      }

      if (pQty === 0 && vQty === 0 && project_package && IG_PACKAGES[project_package]) {
        pipeline.push(...IG_PACKAGES[project_package]);
      }

      pipeline.push({ stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico & Aprovação do Cliente", daysOffset: 15, estTime: 60 });
      pipeline.push({ stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 25, estTime: 60 });
    }

    const baseDate = cleanBillingDate ? new Date(cleanBillingDate) : new Date();

    for (let index = 0; index < pipeline.length; index++) {
      const t = pipeline[index];
      const isFirstTask = index === 0;
      const taskDeadline = new Date(baseDate);
      taskDeadline.setDate(taskDeadline.getDate() + Math.round(t.daysOffset));

      await sql`
        INSERT INTO tasks (
          project_id,
          client_id,
          title,
          stage,
          task_type,
          status,
          priority_score,
          assigned_to,
          deadline,
          estimated_time,
          is_blocked,
          created_at
        )
        VALUES (
          ${newProject.id},
          ${client_id},
          ${t.title},
          ${t.stage},
          ${t.type},
          ${isFirstTask ? 'in_progress' : 'pending'},
          ${isFirstTask ? 1000 : (100 - index)},
          NULL,
          ${taskDeadline.toISOString()},
          ${t.estTime},
          ${!isFirstTask},
          NOW()
        )
      `;
    }

    return NextResponse.json({ data: newProject }, { status: 201 });
  } catch (error: any) {
    console.error('[api/clients/projects] Erro ao criar projeto:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao criar projeto' }, { status: 500 });
  }
}
