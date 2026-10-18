import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { CycleEngine } from '@/lib/presenca/CycleEngine';
const IDV_PIPELINE = [
  { stage: "onboarding", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
  { stage: "onboarding", type: "setup", title: "Onboarding do Cliente", daysOffset: 1, estTime: 15 },
  { stage: "discover", type: "reuniao", title: "Reunião de Briefing", daysOffset: 2, estTime: 60 },
  { stage: "discover", type: "copy", title: "Análise do Briefing + Brand Snapshot", daysOffset: 3, estTime: 45 },
  { stage: "define", type: "copy", title: "Acompanhar Brand Lab do Cliente", daysOffset: 4, estTime: 30 },
  { stage: "define", type: "design", title: "Compilar Brand DNA", daysOffset: 5, estTime: 60 },
  { stage: "define", type: "design", title: "Desenvolver Território A", daysOffset: 6, estTime: 180 },
  { stage: "define", type: "design", title: "Desenvolver Território B", daysOffset: 7, estTime: 180 },
  { stage: "define", type: "copy", title: "Enviar Territórios para Avaliação", daysOffset: 8, estTime: 30 },
  { stage: "develop", type: "design", title: "Desenvolvimento do Símbolo", daysOffset: 9, estTime: 180 },
  { stage: "develop", type: "design", title: "Tipografia & Paleta Cromática", daysOffset: 10, estTime: 120 },
  { stage: "develop", type: "design", title: "Sistema Gráfico & Aplicações", daysOffset: 11, estTime: 240 },
  { stage: "present", type: "design", title: "Montagem da Apresentação Narrativa", daysOffset: 14, estTime: 120 },
  { stage: "present", type: "reuniao", title: "Reunião de Apresentação", daysOffset: 15, estTime: 60 },
  { stage: "deliver", type: "design", title: "Brand Starter Kit + Asset Library", daysOffset: 16, estTime: 90 },
  { stage: "deliver", type: "setup", title: "Checklist de Ativação + Handover", daysOffset: 17, estTime: 60 }
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

    const resolvedServiceType = service_type || 'Identidade Visual';

    // Evitar duplicidade de projeto ativo para o mesmo cliente
    const existingActive = await sql`
      SELECT * FROM projects
      WHERE client_id = ${client_id}
      AND status = 'active'
      AND (service_type = ${resolvedServiceType} OR service_type IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (existingActive.length > 0) {
      return NextResponse.json({ 
        data: existingActive[0], 
        message: 'Cliente já possui um projeto ativo neste serviço.' 
      }, { status: 200 });
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
    const initialIdvPhase = service_type === 'Identidade Visual' ? 'discover' : null;
    const initialProgress = service_type === 'Identidade Visual' ? 14 : 0;
    const baseDate = cleanBillingDate ? new Date(cleanBillingDate) : new Date();
    const defaultDeliveryDate = new Date(baseDate.getTime() + (21 * 24 * 60 * 60 * 1000));
    const targetDeliveryDate = cleanContractEnd ? new Date(cleanContractEnd) : defaultDeliveryDate;

    const [newProject] = await sql`
      INSERT INTO projects (
        client_id,
        service_type,
        type,
        status,
        phase,
        fase,
        idv_phase,
        progress,
        financial_value,
        payment_method,
        payment_recurrence,
        payment_split,
        billing_date,
        data_limite,
        delivery_target_date,
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
        ${initialIdvPhase || 'reuniao'},
        ${initialIdvPhase},
        ${initialProgress},
        ${finValue},
        ${cleanPaymentMethod},
        ${cleanPaymentRecurrence},
        ${cleanPaymentSplit},
        ${cleanBillingDate},
        ${targetDeliveryDate.toISOString()},
        ${targetDeliveryDate.toISOString()},
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

    const COMPLETED_IDV_TASKS = [
      "Formulário de cadastro & Contrato",
      "Onboarding do Cliente",
      "Reunião de Briefing"
    ];

    for (let index = 0; index < pipeline.length; index++) {
      const t = pipeline[index];
      const isAutoCompleted = service_type === 'Identidade Visual' && COMPLETED_IDV_TASKS.includes(t.title);
      const isNextTask = service_type === 'Identidade Visual' 
        ? t.title === "Análise do Briefing + Brand Snapshot"
        : index === 0;

      const taskDeadline = new Date(baseDate);
      taskDeadline.setDate(taskDeadline.getDate() + Math.round(t.daysOffset));

      const isIgPiece = service_type === 'Gestão de Instagram' && (t.type === 'design' || t.type === 'video');
      const igFormat = isIgPiece ? (t.type === 'video' ? 'Reels' : 'Carrossel / Post') : null;

      await sql`
        INSERT INTO tasks (
          project_id,
          client_id,
          title,
          stage,
          task_type,
          status,
          completed_at,
          priority_score,
          assigned_to,
          deadline,
          estimated_time,
          is_blocked,
          ig_is_piece,
          ig_format,
          ig_publish_status,
          created_at
        )
        VALUES (
          ${newProject.id},
          ${client_id},
          ${t.title},
          ${t.stage},
          ${t.type},
          ${isAutoCompleted ? 'completed' : (isNextTask ? 'in_progress' : 'pending')},
          ${isAutoCompleted ? new Date().toISOString() : null},
          ${isNextTask ? 1000 : (100 - index)},
          NULL,
          ${taskDeadline.toISOString()},
          ${t.estTime},
          ${!isAutoCompleted && !isNextTask},
          ${isIgPiece},
          ${igFormat},
          ${isIgPiece ? 'in_production' : null},
          NOW()
        )
      `;
    }

    // Inicialização do ciclo mensal integrado da Gestão de Instagram
    if (service_type === 'Gestão de Instagram') {
      try {
        await CycleEngine.ensureCurrentCycle(newProject.id);
      } catch (err: any) {
        console.warn('[api/clients/projects] Aviso ao inicializar ciclo:', err.message);
      }
    }

    return NextResponse.json({ data: newProject }, { status: 201 });
  } catch (error: any) {
    console.error('[api/clients/projects] Erro ao criar projeto:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao criar projeto' }, { status: 500 });
  }
}
