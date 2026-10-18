import { getDb } from '../lib/db';

async function main() {
  const sql = getDb();
  const projectId = '6e184ace-0004-4eff-b54d-2c3676bda6a8';
  const cycleId = '20ade41b-aa57-4b7b-9d85-f213ea8025b4'; // Ciclo 2

  console.log('--- Configurando demandas do Ciclo 2 ---');

  // 1. Calendário Editorial de Conteúdos
  await sql`
    UPDATE tasks SET
      cycle_id = ${cycleId},
      task_type = 'calendario_editorial',
      stage = 'Estratégia',
      status = 'pending_client_approval',
      attachment_url = '/docs/calendario-editorial-ciclo2.pdf',
      admin_feedback = ${JSON.stringify([
        {
          id: 'msg-init-cal',
          authorName: 'Gestão Studio Veronna',
          role: 'admin',
          content: 'Planejamento editorial do Ciclo 2 concluído e aprovado pela gestão. Documento em PDF anexado para sua validação.',
          createdAt: new Date().toISOString()
        }
      ])},
      updated_at = NOW()
    WHERE project_id = ${projectId} AND title ILIKE '%calendário%'
  `;
  console.log('✔ Calendário Editorial configurado com PDF e status pending_client_approval');

  // 2. Alinhamento Visual (Estilo do Feed)
  await sql`
    UPDATE tasks SET
      cycle_id = ${cycleId},
      task_type = 'alinhamento_visual',
      stage = 'Estratégia',
      status = 'pending_client_approval',
      attachment_url = '/docs/alinhamento-visual-ciclo2.pdf',
      admin_feedback = ${JSON.stringify([
        {
          id: 'msg-init-vis',
          authorName: 'Gestão Studio Veronna',
          role: 'admin',
          content: 'Alinhamento visual do feed do Ciclo 2 estruturado. Avalie a harmonia da grade, moodboard e paleta cromática no PDF.',
          createdAt: new Date().toISOString()
        }
      ])},
      updated_at = NOW()
    WHERE project_id = ${projectId} AND title ILIKE '%alinhamento visual%'
  `;
  console.log('✔ Alinhamento Visual configurado com PDF e status pending_client_approval');

  // 3. Roteirização de 8 Vídeos
  await sql`
    UPDATE tasks SET
      cycle_id = ${cycleId},
      task_type = 'roteiro',
      stage = 'Copywriting',
      status = 'pending_client_approval',
      attachment_url = '/docs/roteirizacao-videos-ciclo2.pdf',
      admin_feedback = ${JSON.stringify([
        {
          id: 'msg-init-rot',
          authorName: 'Gestão Studio Veronna',
          role: 'admin',
          content: 'Roteiros dos 8 vídeos finalizados com ganchos de alta retenção e CTAs. Documento disponível para sua leitura e aprovação.',
          createdAt: new Date().toISOString()
        }
      ])},
      updated_at = NOW()
    WHERE project_id = ${projectId} AND (title ILIKE '%roteirização%' OR title ILIKE '%roteiro%')
  `;
  console.log('✔ Roteirização configurada com PDF e status pending_client_approval');

  // 4. Vincular posts e peças do ciclo 2 ao cycle_id
  await sql`
    UPDATE tasks SET
      cycle_id = ${cycleId}
    WHERE project_id = ${projectId} 
      AND (title ILIKE '%vídeo%' OR title ILIKE '%post%' OR title ILIKE '%edição%')
      AND deadline >= '2026-10-10' AND deadline <= '2026-11-09'
  `;
  console.log('✔ Peças de conteúdo vinculadas ao Ciclo 2');

  // 4.1 Desvincular Reunião de Briefing e Estudo de Marca do Ciclo 2 (pertencem apenas ao Ciclo 1)
  await sql`
    UPDATE tasks SET
      cycle_id = NULL
    WHERE project_id = ${projectId} 
      AND (task_type IN ('reuniao', 'estudo_marca') OR title ILIKE '%briefing%' OR title ILIKE '%estudo de marca%')
  `;
  console.log('✔ Reunião de Briefing e Estudo de Marca desvinculados do Ciclo 2 (restritos ao Ciclo 1)');

  // 5. Verificar estado resultante
  const updatedTasks = await sql`
    SELECT id, title, task_type, stage, status, attachment_url, deadline
    FROM tasks
    WHERE project_id = ${projectId} AND cycle_id = ${cycleId}
    ORDER BY deadline ASC
  `;

  console.log('\nDemandas no Ciclo 2:');
  for (const t of updatedTasks) {
    console.log(`- [${t.status}] ${t.deadline} | type: ${t.task_type} | ${t.title} | PDF: ${t.attachment_url || 'não'}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
