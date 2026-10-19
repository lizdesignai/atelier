// scripts/migrate_tessera_wave1.js
const { getSql } = require('./lib/neon');

const sql = getSql();

async function runMigration() {
  console.log('🚀 Iniciando Migração do Tessera (Onda 0 & 1)...');

  // 1. Tabela de Organizações
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
      settings JSONB DEFAULT '{"workday_hours": 6, "work_days": [1,2,3,4,5], "brand_name": "Studio Veronna"}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_organizations criada/verificada');

  // 2. Tabela de Membros & Capacidade
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.tessera_organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'colaborador',
      weekly_capacity_hours NUMERIC DEFAULT 30,
      skills TEXT[] DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
    );
  `);
  console.log('✅ public.tessera_memberships criada/verificada');

  // 3. Tabela de Templates de Workflow Versionados
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_workflow_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.tessera_organizations(id) ON DELETE CASCADE,
      slug VARCHAR(100) NOT NULL,
      version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      name VARCHAR(255) NOT NULL,
      service_type VARCHAR(50) NOT NULL,
      description TEXT,
      stages_definition JSONB NOT NULL DEFAULT '[]',
      gates_definition JSONB NOT NULL DEFAULT '[]',
      tasks_definition JSONB NOT NULL DEFAULT '[]',
      rules_definition JSONB NOT NULL DEFAULT '[]',
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_template_slug_version UNIQUE (organization_id, slug, version)
    );
  `);
  console.log('✅ public.tessera_workflow_templates criada/verificada');

  // 4. Tabela Central de Itens de Trabalho (Work Items)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_work_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.tessera_organizations(id) ON DELETE CASCADE,
      project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
      parent_id UUID REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL DEFAULT 'task',
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status_id VARCHAR(50) NOT NULL DEFAULT 'inbox',
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      start_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ,
      internal_due_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      estimate_minutes INTEGER DEFAULT 60,
      actual_minutes INTEGER DEFAULT 0,
      remaining_estimate_minutes INTEGER,
      blocked_at TIMESTAMPTZ,
      blocked_reason TEXT,
      blocker_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      next_review_at TIMESTAMPTZ,
      urgency_override BOOLEAN DEFAULT FALSE,
      urgency_reason TEXT,
      urgency_set_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      urgency_expires_at TIMESTAMPTZ,
      acceptance_criteria TEXT,
      client_visible BOOLEAN DEFAULT FALSE,
      template_source_id UUID REFERENCES public.tessera_workflow_templates(id) ON DELETE SET NULL,
      stage_id VARCHAR(100),
      metadata JSONB DEFAULT '{}',
      version INTEGER DEFAULT 1,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_work_items criada/verificada');

  // Índices para máxima performance do Work Items
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_org ON public.tessera_work_items(organization_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_proj ON public.tessera_work_items(project_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_owner ON public.tessera_work_items(owner_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_status ON public.tessera_work_items(status_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_due ON public.tessera_work_items(internal_due_at);`);

  // 5. Dependências entre Tarefas (Blocks / Depends_on)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_task_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocking_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      dependent_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      dependency_type VARCHAR(30) DEFAULT 'finish_to_start',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_tessera_dependency UNIQUE (blocking_item_id, dependent_item_id)
    );
  `);
  console.log('✅ public.tessera_task_dependencies criada/verificada');

  // 6. Checklists de Aceite & Prontidão
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_checklist_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_checklist_items criada/verificada');

  // 7. Eventos de Revisão & QA
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      round_number INTEGER DEFAULT 1,
      decision VARCHAR(50) NOT NULL,
      reason_category VARCHAR(50),
      feedback_comment TEXT,
      attachments JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_reviews criada/verificada');

  // 8. Histórico de Estados
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      from_status VARCHAR(50),
      to_status VARCHAR(50) NOT NULL,
      changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      reason TEXT,
      duration_seconds INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_status_history criada/verificada');

  // 9. Auditoria Completa
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.tessera_organizations(id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      action VARCHAR(50) NOT NULL,
      actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      changes JSONB NOT NULL DEFAULT '{}',
      ip_address VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_audit_events criada/verificada');

  // 10. Outbox Transacional para Eventos de Domínio
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_domain_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_name VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMPTZ,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ public.tessera_domain_outbox criada/verificada');

  // 11. BOOTSTRAP DE DADOS DE FUNDAÇÃO (Onda 1)
  console.log('📦 Populando Organização Padrão e Templates...');
  
  // Organização padrão
  const orgResult = await sql.query(`
    INSERT INTO public.tessera_organizations (slug, name, timezone, settings)
    VALUES ('studio-veronna', 'Studio Veronna — Gestão & Criação', 'America/Sao_Paulo', '{"workday_hours": 6, "work_days": [1,2,3,4,5], "brand_name": "Studio Veronna"}')
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `);
  const orgId = orgResult[0].id;
  console.log('🏢 Organização Ativa:', orgId);

  // Vincular todos os perfis ativos como membros da organização
  await sql.query(`
    INSERT INTO public.tessera_memberships (organization_id, user_id, role, weekly_capacity_hours, skills)
    SELECT 
      $1 as organization_id,
      p.id as user_id,
      CASE 
        WHEN p.role = 'admin' THEN 'owner'
        WHEN p.role = 'gestor' THEN 'gestor'
        ELSE 'colaborador'
      END as role,
      30 as weekly_capacity_hours,
      COALESCE(p.skills, '{}') as skills
    FROM public.profiles p
    WHERE p.role IN ('admin', 'gestor', 'colaborador')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  `, [orgId]);
  console.log('👥 Membros vinculados a partir de public.profiles');

  // Template 1: IDV-CORE v1.0
  await sql.query(`
    INSERT INTO public.tessera_workflow_templates (
      organization_id, slug, version, name, service_type, description,
      stages_definition, gates_definition, tasks_definition, rules_definition
    ) VALUES (
      $1,
      'idv-core',
      '1.0.0',
      'Identidade Visual — Esteira Estratégica Completa',
      'idv',
      'Processo canônico de 6 movimentos externos e 10 fases técnicas internas para criação de marca.',
      $2,
      $3,
      $4,
      $5
    )
    ON CONFLICT (organization_id, slug, version) DO UPDATE SET updated_at = NOW();
  `, [
    orgId,
    JSON.stringify([
      { id: 'onboarding', label: 'Onboarding & Setup', order: 1, externalMovement: '01 Descobrir' },
      { id: 'discover', label: 'Briefing & Imersão', order: 2, externalMovement: '01 Descobrir' },
      { id: 'define', label: 'Curadoria & Territórios', order: 3, externalMovement: '02 Direcionar' },
      { id: 'develop', label: 'Criação do Sistema Visual', order: 4, externalMovement: '03 Construir' },
      { id: 'qa', label: 'Controle de Qualidade Interno', order: 5, externalMovement: '03 Construir' },
      { id: 'present', label: 'Cerimônia de Revelação', order: 6, externalMovement: '04 Revelar' },
      { id: 'client_review', label: 'Portão de Decisão (48h)', order: 7, externalMovement: '04 Revelar' },
      { id: 'refine', label: 'Ajustes de Rota', order: 8, externalMovement: '05 Refinar' },
      { id: 'deliver', label: 'Brandbook & Handover', order: 9, externalMovement: '06 Ativar' },
      { id: 'activate', label: 'Cofre & Pós-Entrega', order: 10, externalMovement: '06 Ativar' }
    ]),
    JSON.stringify([
      { id: 'gate_territory', stage: 'define', title: 'Aprovação de Território Criativo', required: true, approver: 'client' },
      { id: 'gate_qa', stage: 'qa', title: 'Aprovação de QA Interno', required: true, approver: 'gestor' },
      { id: 'gate_reveal', stage: 'client_review', title: 'Portão de Decisão da Revelação (48h)', required: true, approver: 'client', slaHours: 48 },
      { id: 'gate_deliver', stage: 'deliver', title: 'Aceite de Entrega Final & Handover', required: true, approver: 'client' }
    ]),
    JSON.stringify([
      { title: 'Reunião de Briefing & Kick-off', type: 'reuniao', stage: 'discover', dayOffset: 1, estimateMinutes: 60 },
      { title: 'Análise de Briefing e Mercado', type: 'copy', stage: 'discover', dayOffset: 1, estimateMinutes: 120 },
      { title: 'Estratégia e Posicionamento de Marca', type: 'copy', stage: 'discover', dayOffset: 2, estimateMinutes: 90 },
      { title: 'Curadoria Visual de DNA', type: 'design', stage: 'define', dayOffset: 3, estimateMinutes: 120 },
      { title: 'Direção Criativa e Territórios', type: 'design', stage: 'define', dayOffset: 4, estimateMinutes: 180 },
      { title: 'Exploração do Sistema Visual', type: 'design', stage: 'develop', dayOffset: 5, estimateMinutes: 240 },
      { title: 'Tipografia, Paleta e Gráficos de Apoio', type: 'design', stage: 'develop', dayOffset: 6, estimateMinutes: 240 },
      { title: 'Mockups e Aplicações Reais', type: 'design', stage: 'develop', dayOffset: 8, estimateMinutes: 240 },
      { title: 'Montagem da Apresentação & Vídeo', type: 'presentation', stage: 'present', dayOffset: 9, estimateMinutes: 180 },
      { title: 'Cerimônia de Revelação ao Cliente', type: 'reuniao', stage: 'present', dayOffset: 10, estimateMinutes: 60 },
      { title: 'Brandbook e Guidelines', type: 'setup', stage: 'deliver', dayOffset: 12, estimateMinutes: 120 },
      { title: 'Exportação de Arquivos Finais e Handover', type: 'setup', stage: 'deliver', dayOffset: 13, estimateMinutes: 60 }
    ]),
    JSON.stringify({
      slaBusinessDays: 13,
      bufferDays: 2,
      maxRevisionRounds: 2
    })
  ]);
  console.log('📐 Template IDV-CORE v1.0 registrado');

  // Template 2: Presença 2.0 v1.0 (Instagram)
  await sql.query(`
    INSERT INTO public.tessera_workflow_templates (
      organization_id, slug, version, name, service_type, description,
      stages_definition, gates_definition, tasks_definition, rules_definition
    ) VALUES (
      $1,
      'presenca-2.0',
      '1.0.0',
      'Presença 2.0 — Gestão Contínua de Instagram',
      'instagram',
      'Ciclos mensais de 6 movimentos para gestão estratégica de conteúdo e conversão.',
      $2,
      $3,
      $4,
      $5
    )
    ON CONFLICT (organization_id, slug, version) DO UPDATE SET updated_at = NOW();
  `, [
    orgId,
    JSON.stringify([
      { id: 'direcionar', label: '01 Direcionar', hint: 'Objetivo, Foco Comercial e Pulso do Mês' },
      { id: 'planejar', label: '02 Planejar', hint: 'Mix Editorial distribuído em 4 Pilares' },
      { id: 'produzir', label: '03 Produzir', hint: 'Criação de Peças, Roteiros e Legendas' },
      { id: 'aprovar', label: '04 Aprovar', hint: 'Curadoria com SLA de 2 dias úteis' },
      { id: 'publicar', label: '05 Publicar', hint: 'Agendamento e Monitoramento de Grade' },
      { id: 'aprender', label: '06 Aprender', hint: 'Métricas, Top Conteúdos e Próximo Ciclo' }
    ]),
    JSON.stringify([
      { id: 'gate_planning', stage: 'planejar', title: 'Aprovação do Planejamento Editorial', required: true, approver: 'client' },
      { id: 'gate_content', stage: 'aprovar', title: 'Aprovação de Peças (SLA 2 dias úteis)', required: true, approver: 'client', slaBusinessDays: 2 }
    ]),
    JSON.stringify([
      { title: 'Reunião / Pulso Estratégico Mensal', type: 'reuniao', stage: 'direcionar', estimateMinutes: 45 },
      { title: 'Planejamento Editorial & Pautas', type: 'planning', stage: 'planejar', estimateMinutes: 180 },
      { title: 'Roteiros de Vídeo / Reels', type: 'copy', stage: 'produzir', estimateMinutes: 120 },
      { title: 'Design de Carrosséis & Posts', type: 'design', stage: 'produzir', estimateMinutes: 180 },
      { title: 'Edição de Vídeos / Reels', type: 'video', stage: 'produzir', estimateMinutes: 180 },
      { title: 'Relatório Executivo & Aprendizados', type: 'relatorio', stage: 'aprender', estimateMinutes: 90 }
    ]),
    JSON.stringify({
      approvalSlaBusinessDays: 2,
      maxRevisionRounds: 2,
      defaultPillars: { descoberta: 30, autoridade: 35, relacionamento: 20, conversao: 15 }
    })
  ]);
  console.log('📱 Template Presença 2.0 v1.0 registrado');

  console.log('🎉 Migração concluída com êxito total!');
}

runMigration().catch(err => {
  console.error('❌ Falha na migração:', err);
  process.exit(1);
});
