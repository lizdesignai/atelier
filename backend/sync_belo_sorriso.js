const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.POSTGRES_URL);

async function syncBeloSorriso() {
  const projId = '7ef5e662-6540-40f7-94c9-7aee456bebd9';

  console.log('1. Verificando projeto Belo Sorriso...');
  const [proj] = await sql`
    SELECT id, client_id, service_type, type, status, billing_date, posts_quantity, videos_quantity, current_cycle_id
    FROM projects WHERE id = ${projId}
  `;
  console.log('Projeto:', proj);

  // Excluir a tarefa legada avulsa "Novo Ciclo Iniciado"
  const deleted = await sql`
    DELETE FROM tasks
    WHERE project_id = ${projId} AND (title ILIKE '%Novo Ciclo Iniciado%' OR title ILIKE '%🗓️%')
    RETURNING id, title
  `;
  console.log('2. Tarefas legadas removidas:', deleted);

  // Buscar o ciclo ativo
  const [cycle] = await sql`
    SELECT * FROM ig_cycles WHERE project_id = ${projId} AND status = 'open' ORDER BY period_start DESC LIMIT 1
  `;
  console.log('3. Ciclo atual:', cycle?.id, 'Ciclo #', cycle?.cycle_number);

  if (cycle) {
    // Definir postsQty para Pacote 4 (12 posts)
    const postsQty = 12;
    const videosQty = 0;
    await sql`UPDATE projects SET posts_quantity = ${postsQty}, videos_quantity = ${videosQty} WHERE id = ${projId}`;

    const cycleNumber = cycle.cycle_number || 1;
    const periodStart = new Date(cycle.period_start);
    const periodEnd = new Date(cycle.period_end);

    const calcDeadline = (days) => {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + days);
      if (d > periodEnd) return periodEnd.toISOString();
      return d.toISOString();
    };

    // Buscar admin
    const [admin] = await sql`
      SELECT id FROM profiles WHERE role IN ('admin', 'gestor') ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END LIMIT 1
    `;
    const adminId = admin?.id || null;

    // Buscar regras
    const rules = await sql`SELECT task_type, assignee_id FROM routing_rules WHERE project_id = ${projId}`;
    const rulesMap = {};
    rules.forEach(r => { if (r.task_type) rulesMap[r.task_type] = r.assignee_id; });

    const tasksToCreate = [
      {
        title: `Planejamento Editorial & Estratégia • Ciclo #${cycleNumber}`,
        description: `Definição de objetivos, prioridades comerciais, temas estratégicos e o mix editorial do ciclo.`,
        stage: 'Estratégia',
        task_type: 'copy',
        status: 'pending',
        priority_score: 950,
        deadline: calcDeadline(5),
        estimated_minutes: 90,
        is_blocked: false,
        ig_is_piece: false,
        urgency: true,
      },
      {
        title: `Reunião de Alinhamento & Pulso • Ciclo #${cycleNumber}`,
        description: `Reunião mensal de alinhamento com o cliente para coleta de novidades, prioridades e direcionamento estratégico.`,
        stage: 'Planejamento',
        task_type: 'reuniao',
        status: 'pending',
        priority_score: 850,
        deadline: calcDeadline(7),
        estimated_minutes: 60,
        is_blocked: false,
        ig_is_piece: false,
        urgency: false,
      }
    ];

    for (let i = 1; i <= postsQty; i++) {
      tasksToCreate.push({
        title: `Post ${i} • Ciclo #${cycleNumber}`,
        description: `Criação de arte, carrossel ou design gráfico com copy para o Post ${i}.`,
        stage: 'Produção',
        task_type: 'design',
        status: 'pending',
        priority_score: 700 - i,
        deadline: calcDeadline(10 + Math.floor(i * 1.5)),
        estimated_minutes: 60,
        is_blocked: false,
        ig_is_piece: true,
        ig_format: 'Carrossel / Post',
        ig_publish_status: 'in_production',
        urgency: false,
      });
    }

    tasksToCreate.push({
      title: `Aprovação de Conteúdos & Agendamento • Ciclo #${cycleNumber}`,
      description: `Validação interna e envio do lote completo para aprovação do cliente no Cockpit Atelier, com posterior agendamento.`,
      stage: 'Aprovação',
      task_type: 'setup',
      status: 'pending',
      priority_score: 600,
      deadline: calcDeadline(18),
      estimated_minutes: 45,
      is_blocked: false,
      ig_is_piece: false,
      urgency: false,
    });

    tasksToCreate.push({
      title: `Relatório de Desempenho & Inteligência • Ciclo #${cycleNumber}`,
      description: `Consolidação das métricas do ciclo, levantamento de aprendizados e recomendações estratégicas para o próximo mês.`,
      stage: 'Relatório',
      task_type: 'management',
      status: 'pending',
      priority_score: 550,
      deadline: periodEnd.toISOString(),
      estimated_minutes: 60,
      is_blocked: false,
      ig_is_piece: false,
      urgency: false,
    });

    console.log(`4. Inserindo ${tasksToCreate.length} demandas para Belo Sorriso...`);
    for (const t of tasksToCreate) {
      const assignedTo = rulesMap[t.task_type] || (t.task_type === 'copy' || t.task_type === 'management' || t.task_type === 'reuniao' ? adminId : null);

      await sql`
        INSERT INTO tasks (
          project_id, client_id, cycle_id, title, description, stage, type, task_type,
          status, priority_score, assigned_to, deadline, estimated_minutes, is_blocked,
          ig_is_piece, ig_format, ig_publish_status, urgency, created_at, updated_at
        ) VALUES (
          ${projId}, ${proj.client_id || null}, ${cycle.id}, ${t.title}, ${t.description || null},
          ${t.stage}, ${t.task_type}, ${t.task_type},
          ${t.status}, ${t.priority_score}, ${assignedTo}, ${t.deadline}, ${t.estimated_minutes}, ${t.is_blocked},
          ${t.ig_is_piece || false}, ${t.ig_format || null}, ${t.ig_publish_status || null}, ${t.urgency || false}, NOW(), NOW()
        )
      `;
    }
    console.log('✅ Demandas inseridas com sucesso!');
  }

  // Verificar tarefas ativas finais
  const activeTasks = await sql`
    SELECT id, title, stage, task_type, status, deadline, ig_is_piece, ig_publish_status
    FROM tasks
    WHERE project_id = ${projId} AND status != 'archived'
    ORDER BY deadline ASC
  `;
  console.log(`5. Total de tarefas ativas para Belo Sorriso: ${activeTasks.length}`);
  console.log(activeTasks);
}

syncBeloSorriso().catch(console.error);
