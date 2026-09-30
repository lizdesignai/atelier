import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IDV_FLOW_PIPELINE } from '@/app/admin/analytics/constants';

export async function POST(req: Request) {
  try {
    const { projectId, kickoffDate } = await req.json();
    if (!projectId || !kickoffDate) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const sql = getDb();
    
    // Pegar o projeto
    const projects = await sql`SELECT idv_product FROM projects WHERE id = ${projectId}`;
    if (!projects.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const product = projects[0].idv_product || 'IDV-CORE';
    
    // Obter todas as tasks
    const tasks = await sql`SELECT id, title FROM tasks WHERE project_id = ${projectId}`;
    const pipeline = IDV_FLOW_PIPELINE[product] || IDV_FLOW_PIPELINE['IDV-CORE'];
    
    const kickDate = new Date(kickoffDate);
    
    let maxDate = new Date(kickDate);

    for (const t of tasks) {
      // Procurar o offset no pipeline
      const pTask = pipeline.find(pt => pt.title === t.title);
      if (pTask && pTask.day) {
        const daysToAdd = pTask.day - 1;
        let targetDate = new Date(kickDate);
        if (daysToAdd > 0) {
           let added = 0;
           while(added < daysToAdd) {
             targetDate.setDate(targetDate.getDate() + 1);
             if (targetDate.getDay() !== 0 && targetDate.getDay() !== 6) {
               added++;
             }
           }
        }
        if (targetDate > maxDate) maxDate = new Date(targetDate);
        
        await sql`UPDATE tasks SET deadline = ${targetDate.toISOString()} WHERE id = ${t.id}`;
      }
    }
    
    // Atualizar no projeto
    await sql`UPDATE projects SET contract_start = ${kickDate.toISOString()}, delivery_target_date = ${maxDate.toISOString()} WHERE id = ${projectId}`;
    
    return NextResponse.json({ success: true, delivery_target_date: maxDate.toISOString(), contract_start: kickDate.toISOString() });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
