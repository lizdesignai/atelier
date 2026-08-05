import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

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
    ...Array.from({length: 6}).map((_, i) => ({ stage: "Produção de Vídeo", type: "video", title: `Edição de Vídeo ${i+1} + Capa`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação do Cliente & Agendamento", daysOffset: 18, estTime: 45 }
  ],
  "Pacote 2": [
    { stage: "Copywriting", type: "copy", title: "Revisão de Texto enviado pelo Cliente", daysOffset: 10, estTime: 30 },
    ...Array.from({length: 4}).map((_, i) => ({ stage: "Design Gráfico", type: "design", title: `Design de Post/Carrossel ${i+1}`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação & Agendamento", daysOffset: 16, estTime: 45 }
  ],
  "Pacote 3": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 10, estTime: 90 },
    ...Array.from({length: 8}).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i+1}`, daysOffset: 12 + (i * 0.5), estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico", daysOffset: 18, estTime: 60 },
    { stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 30, estTime: 60 }
  ],
  "Pacote 4": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial & Organização de Perfil", daysOffset: 10, estTime: 120 },
    { stage: "Estratégia", type: "setup", title: "Análise de Perfil", daysOffset: 12, estTime: 60 },
    ...Array.from({length: 12}).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i+1}`, daysOffset: 13 + (i * 0.5), estTime: 60 })),
    { stage: "Produção Contínua", type: "copy", title: "Criação de Roteiros Diários de Stories", daysOffset: 20, estTime: 180 },
    { stage: "Relatório", type: "setup", title: "Relatório Mensal Profundo", daysOffset: 30, estTime: 90 }
  ]
};

export class ClientsController {
  static async getOverview(req: Request, res: Response) {
    try {
      const [tasksRes, profilesRes, agenciesRes, activeProjectsRes] = await Promise.all([
        supabase.from('tasks').select('project_id, status'),
        supabase.from('profiles').select('id, nome, avatar_url, role, created_at, empresa').in('role', ['client', 'lead']),
        supabase.from('agencies').select('id, name, status, financial_value, billing_date, created_at, trello_url'),
        supabase.from('projects').select('id, client_id, service_type, type, status, phase, fase, progress, financial_value, billing_date, contract_start, contract_end, posts_quantity, videos_quantity, created_at, profiles(nome, avatar_url, empresa)').in('status', ['active', 'delivered'])
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (agenciesRes.error) throw agenciesRes.error;
      if (activeProjectsRes.error) throw activeProjectsRes.error;

      const tasksData = tasksRes.data || [];
      const profilesData = profilesRes.data || [];
      const agenciesData = agenciesRes.data || [];
      const activeProjects = activeProjectsRes.data || [];

      let enriched = activeProjects.map(p => {
        const pTasks = tasksData.filter(t => t.project_id === p.id);
        const totalTasks = pTasks.length;
        const completedTasks = pTasks.filter(t => t.status === 'completed').length;
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return { ...p, calculatedProgress: progress, isLead: false, isAgency: false };
      });

      const leadsMapped = profilesData.filter(p => p.role === 'lead').map(lead => ({
        id: `lead-${lead.id}`, 
        client_id: lead.id,
        isLead: true,
        isAgency: false,
        profiles: lead,
        status: 'lead', 
        type: 'Lead (Prospecção)',
        calculatedProgress: 0,
        created_at: lead.created_at
      }));

      const agenciesMapped = agenciesData.map(agency => ({
        id: `agency-${agency.id}`, 
        client_id: agency.id,
        isLead: false,
        isAgency: true,
        profiles: { nome: agency.name, empresa: "Agência Parceira (White-Label)", avatar_url: null },
        status: agency.status, 
        type: 'Agência Parceira',
        financial_value: agency.financial_value,
        billing_date: agency.billing_date,
        calculatedProgress: 0,
        created_at: agency.created_at,
        trello_url: agency.trello_url
      }));

      const enrichedProjects = [...enriched, ...leadsMapped, ...agenciesMapped]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.status(200).json({
        data: {
          enrichedProjects,
          availableClients: profilesData.filter(p => p.role === 'client')
        }
      });
    } catch (error: any) {
      console.error('Error fetching clients overview:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async createProject(req: Request, res: Response) {
    try {
      const { 
        client_id, service_type, project_package, 
        financial_value, payment_method, payment_recurrence, 
        payment_split, billing_date,
        contract_start, contract_end, posts_quantity, videos_quantity
      } = req.body;

      if (!client_id) {
        return res.status(400).json({ error: 'Client ID is required' });
      }

      const projectPayload = {
        client_id,
        service_type,
        type: service_type === 'Gestão de Instagram' ? project_package : service_type, 
        status: 'active',
        phase: 'Mesa de Trabalho',
        fase: 'reuniao', 
        progress: 0,
        financial_value: financial_value ? parseFloat(financial_value) : 0,
        payment_method,
        payment_recurrence,
        payment_split,
        billing_date: billing_date || null,
        data_limite: billing_date || null,
        contract_start: contract_start || null,
        contract_end: contract_end || null,
        posts_quantity: posts_quantity ? parseInt(posts_quantity) : 0,
        videos_quantity: videos_quantity ? parseInt(videos_quantity) : 0
      };

      const { data: newProject, error: projError } = await supabase.from('projects').insert(projectPayload).select().single();
      if (projError) throw projError;
      
      let pipeline: any[] = [];
      if (service_type === 'Identidade Visual') {
        pipeline = IDV_PIPELINE;
      } else {
        // Pipeline Dinâmico Baseado no Contrato
        pipeline = [...IG_SETUP];
        
        const v_qty = projectPayload.videos_quantity;
        const p_qty = projectPayload.posts_quantity;

        // Estratégia Inicial se tiver posts ou videos
        if (p_qty > 0 || v_qty > 0) {
            pipeline.push({ stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 5, estTime: 90 });
        }

        // Criar tarefas de Vídeo
        if (v_qty > 0) {
           pipeline.push({ stage: "Copywriting", type: "copy", title: `Roteirização de ${v_qty} Vídeos`, daysOffset: 7, estTime: 60 });
           for (let i = 0; i < v_qty; i++) {
               pipeline.push({ stage: "Produção de Vídeo", type: "video", title: `Edição de Vídeo ${i+1} + Capa`, daysOffset: 10 + (i * 0.5), estTime: 60 });
           }
        }

        // Criar tarefas de Posts
        if (p_qty > 0) {
           for (let i = 0; i < p_qty; i++) {
               pipeline.push({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i+1}`, daysOffset: 11 + (i * 0.5), estTime: 60 });
           }
        }

        // Aprovação e Relatório final
        pipeline.push({ stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico & Aprovação do Cliente", daysOffset: 15, estTime: 60 });
        pipeline.push({ stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 25, estTime: 60 });
      }

      const baseDate = billing_date ? new Date(billing_date) : new Date();
      const today = new Date();

      const tasksToInsert = pipeline.map((t, index) => {
        const isFirstTask = index === 0;
        const taskDeadline = new Date(baseDate);
        taskDeadline.setDate(taskDeadline.getDate() + t.daysOffset);

        return {
          project_id: newProject.id,
          title: t.title,
          stage: t.stage,
          type: t.type,
          status: isFirstTask ? 'in_progress' : 'pending',
          priority_score: isFirstTask ? 1000 : (100 - index),
          assigned_to: null,
          deadline: taskDeadline.toISOString(),
          estimated_minutes: t.estTime,
          is_blocked: !isFirstTask 
        };
      });

      const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
      if (tasksError) {
        console.error("Erro ao injetar pipeline de tarefas:", tasksError);
      }

      return res.status(201).json({ data: newProject });
    } catch (error: any) {
      console.error('Error creating project:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
