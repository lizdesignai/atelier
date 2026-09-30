const { Client } = require('pg');

const IDV_FLOW_PIPELINE = {
  'IDV-CORE': [
    { phase: 'discover', type: 'reuniao', title: 'Reunião de Briefing (Kick-off)', day: 1, estTime: 60, isGate: false },
    { phase: 'discover', type: 'copy', title: 'Análise de Briefing + Pesquisa de Mercado', day: 1, estTime: 120, isGate: false },
    { phase: 'discover', type: 'copy', title: 'Benchmarking e Estudo de Concorrentes', day: 2, estTime: 120, isGate: false },
    { phase: 'discover', type: 'copy', title: 'Brand Intelligence Sheet', day: 2, estTime: 60, isGate: false },
    { phase: 'discover', type: 'community', title: 'Diário de Bordo: Kick-off', day: 2, estTime: 15, isGate: false },
    
    { phase: 'define', type: 'design', title: 'Construção da Direção Criativa', day: 3, estTime: 180, isGate: false },
    { phase: 'define', type: 'design', title: 'Pesquisa Tipográfica + Clima Cromático', day: 3, estTime: 120, isGate: false },
    { phase: 'define', type: 'design', title: 'Montagem dos Moodboards (2-3 caminhos)', day: 4, estTime: 180, isGate: false },
    { phase: 'define', type: 'gate', title: '🔒 GATE 1: Creative Lock (Aprovação Interna)', day: 4, estTime: 30, isGate: true },
    
    { phase: 'develop', type: 'design', title: 'Exploração: Símbolo + Lettering + Estrutura', day: 5, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Convergência: Sistema Visual', day: 6, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Refinamento: Logo + Tipografia + Paleta', day: 7, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Aplicações e Mockups Funcionais', day: 8, estTime: 240, isGate: false },
    
    { phase: 'qa', type: 'gate', title: '🔒 QA: Revisão Criativa Interna (Checklist)', day: 9, estTime: 120, isGate: true },
    
    { phase: 'present', type: 'presentation', title: 'Montagem da Apresentação Narrativa', day: 9, estTime: 180, isGate: false },
    { phase: 'present', type: 'presentation', title: 'Apresentação Oficial ao Cliente', day: 10, estTime: 60, isGate: false },
    { phase: 'present', type: 'community', title: 'Diário de Bordo: Identidade Revelada', day: 10, estTime: 15, isGate: false },
    
    { phase: 'refine', type: 'design', title: 'Ajustes Consolidados (1 Rodada)', day: 11, estTime: 180, isGate: false },
    { phase: 'refine', type: 'design', title: 'Finalização do Sistema Visual', day: 12, estTime: 120, isGate: false },
    
    { phase: 'deliver', type: 'setup', title: 'Fechamento de Arquivos e Exportação', day: 13, estTime: 180, isGate: false },
    { phase: 'deliver', type: 'presentation', title: 'Construção do Brandbook (Guidelines)', day: 13, estTime: 180, isGate: false },
    { phase: 'deliver', type: 'gate', title: '🔒 GATE Final: Aprovação de Handshake', day: 13, estTime: 30, isGate: true },
    { phase: 'deliver', type: 'community', title: 'Onboarding de Entrega e Hand-off', day: 13, estTime: 60, isGate: false }
  ]
};

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();

    const { rows: activeIdvProjects } = await client.query(`
      SELECT id, type, service_type, idv_product
      FROM projects 
      WHERE status = 'active' AND (service_type = 'Identidade Visual' OR type ILIKE '%Identidade Visual%')
    `);

    console.log(`Encontrados ${activeIdvProjects.length} projetos IDV ativos.`);

    for (const project of activeIdvProjects) {
      console.log(`Processando projeto: (${project.id})`);
      
      const { rowCount: deleted } = await client.query(`
        DELETE FROM tasks
        WHERE project_id = $1 AND status IN ('pending', 'in_progress')
      `, [project.id]);
      console.log(`Deletadas ${deleted} tarefas pendentes/em progresso.`);

      const pipeline = IDV_FLOW_PIPELINE[project.idv_product] || IDV_FLOW_PIPELINE['IDV-CORE'];
      const crypto = require('crypto');
      
      let inserted = 0;
      for (const t of pipeline) {
        await client.query(`
          INSERT INTO tasks (id, project_id, title, stage, task_type, estimated_time, status, assigned_to)
          VALUES ($1, $2, $3, $4, $5, $6, 'pending', '1aa36c53-a715-409d-901d-61f78f1ffe54')
        `, [crypto.randomUUID(), project.id, t.title, t.stage || t.phase, t.type, t.estTime]);
        inserted++;
      }
      
      console.log(`Inseridas ${inserted} novas tarefas para o projeto.`);
    }

    console.log("Migração concluída com sucesso!");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("Erro:", error);
    await client.end();
    process.exit(1);
  }
}

migrate();
