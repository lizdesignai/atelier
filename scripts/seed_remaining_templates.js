// scripts/seed_remaining_templates.js
const { getSql } = require('./lib/neon');

const sql = getSql();

async function seed() {
  const orgResult = await sql.query(`SELECT id FROM public.tessera_organizations WHERE slug = 'studio-veronna' LIMIT 1;`);
  if (!orgResult.length) return;
  const orgId = orgResult[0].id;

  // Template 3: Mapa Estratégico v1.0
  await sql.query(`
    INSERT INTO public.tessera_workflow_templates (
      organization_id, slug, version, name, service_type, description,
      stages_definition, gates_definition, tasks_definition, rules_definition
    ) VALUES (
      $1,
      'mapa-estrategico',
      '1.0.0',
      'Mapa — Diagnóstico & Presença Estratégica',
      'mapa',
      'Diagnóstico de maturidade digital em 4 etapas estruturadas: Boas-vindas, Raio-X de 12 perguntas, Evidências e Dossiê Executivo.',
      $2,
      $3,
      $4,
      $5
    )
    ON CONFLICT (organization_id, slug, version) DO UPDATE SET updated_at = NOW();
  `, [
    orgId,
    JSON.stringify([
      { id: 'onboarding', label: '01 Boas-Vindas', hint: 'Alinhamento do diagnóstico' },
      { id: 'raiox', label: '02 Raio-X Digital', hint: '12 perguntas estratégicas' },
      { id: 'evidencias', label: '03 Evidências', hint: 'Upload e classificação de ativos' },
      { id: 'dossie', label: '04 Dossiê & Entrega', hint: 'Análise humana e plano de ação' }
    ]),
    JSON.stringify([
      { id: 'gate_evidencias', stage: 'evidencias', title: 'Conclusão do Raio-X e Evidências', required: true, approver: 'client' },
      { id: 'gate_dossie', stage: 'dossie', title: 'Aprovação do Dossiê Estratégico', required: true, approver: 'gestor' }
    ]),
    JSON.stringify([
      { title: 'Revisão das 12 Perguntas do Raio-X', type: 'copy', stage: 'raiox', estimateMinutes: 60 },
      { title: 'Análise de Evidências & Benchmark de Mercado', type: 'search', stage: 'evidencias', estimateMinutes: 90 },
      { title: 'Redação do Dossiê Estratégico', type: 'copy', stage: 'dossie', estimateMinutes: 180 },
      { title: 'Reunião de Devolutiva & Próximos Passos', type: 'reuniao', stage: 'dossie', estimateMinutes: 60 }
    ]),
    JSON.stringify({
      slaBusinessDays: 7,
      isDiagnosticProduct: true
    })
  ]);
  console.log('🗺️ Template Mapa Estratégico v1.0 registrado');

  // Template 4: Iniciativa Interna (Shape Up inspired) v1.0
  await sql.query(`
    INSERT INTO public.tessera_workflow_templates (
      organization_id, slug, version, name, service_type, description,
      stages_definition, gates_definition, tasks_definition, rules_definition
    ) VALUES (
      $1,
      'iniciativa-interna',
      '1.0.0',
      'Iniciativa Interna — Timebox & Produto',
      'internal',
      'Template para projetos de produto/software, melhorias operacionais e marketing próprio com apetite de tempo delimitado.',
      $2,
      $3,
      $4,
      $5
    )
    ON CONFLICT (organization_id, slug, version) DO UPDATE SET updated_at = NOW();
  `, [
    orgId,
    JSON.stringify([
      { id: 'shaping', label: 'Shaping (Escopo & Apetite)', hint: 'Definição do problema e limites' },
      { id: 'betting', label: 'Aposta / Compromisso', hint: 'Alocação formal de tempo' },
      { id: 'building', label: 'Construção Integrada', hint: 'Design e engenharia simultâneos' },
      { id: 'cooldown', label: 'Cool-down & Retrospectiva', hint: 'Ajustes finos e aprendizados' }
    ]),
    JSON.stringify([
      { id: 'gate_appetite', stage: 'betting', title: 'Aprovação de Apetite & Alocação', required: true, approver: 'owner' },
      { id: 'gate_done', stage: 'building', title: 'Definition of Done & QA', required: true, approver: 'gestor' }
    ]),
    JSON.stringify([
      { title: 'Documento de Shaping & Escopo Mínimo', type: 'copy', stage: 'shaping', estimateMinutes: 120 },
      { title: 'Kick-off da Iniciativa', type: 'reuniao', stage: 'betting', estimateMinutes: 30 },
      { title: 'Desenvolvimento & Testes', type: 'setup', stage: 'building', estimateMinutes: 480 },
      { title: 'Retrospectiva & Lições Aprendidas', type: 'reuniao', stage: 'cooldown', estimateMinutes: 45 }
    ]),
    JSON.stringify({
      defaultAppetiteWeeks: 2,
      circuitBreakerEnabled: true
    })
  ]);
  console.log('⚡ Template Iniciativa Interna v1.0 registrado');
}

seed().catch(console.error);
