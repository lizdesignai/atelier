import { getDb } from '../lib/db';

async function updateFoundationalTasks() {
  const sql = getDb();
  
  // Update Reunião de briefing
  await sql`
    UPDATE tasks 
    SET task_type = 'reuniao',
        stage = 'Imersão',
        description = 'Alinhamento inicial dos objetivos do ciclo, metas comerciais, temas prioritários e diretrizes gerais com o Studio Veronna.'
    WHERE title ILIKE '%briefing%' AND project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
  `;

  // Update Estudo de marca
  await sql`
    UPDATE tasks 
    SET task_type = 'estudo_marca',
        stage = 'Estratégia',
        description = 'Estudo aprofundado de persona, arquétipo, tom de voz e pilares estratégicos de posicionamento para validação do cliente antes da formulação dos posts.'
    WHERE title ILIKE '%estudo de marca%' AND project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
  `;

  // Update Calendário Editorial
  await sql`
    UPDATE tasks 
    SET task_type = 'calendario_editorial',
        stage = 'Estratégia',
        description = 'Calendário de temas e planejamento editorial do ciclo. O cliente valida os tópicos e datas antes da produção dos conteúdos.'
    WHERE title ILIKE '%calendário editorial%' AND project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
  `;

  // Update Alinhamento Visual
  await sql`
    UPDATE tasks 
    SET task_type = 'alinhamento_visual',
        stage = 'Estratégia',
        description = 'Diretriz de estilo de feed, moodboard visual e estética da grade no Instagram para aprovação prévia do cliente.'
    WHERE title ILIKE '%alinhamento visual%' AND project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
  `;

  console.log('Foundational tasks updated successfully in database.');
}

updateFoundationalTasks().catch(console.error);
