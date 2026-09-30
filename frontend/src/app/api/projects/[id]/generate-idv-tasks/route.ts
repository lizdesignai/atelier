import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { IDV_FLOW_PIPELINE } from '@/app/admin/analytics/constants';
import { addBusinessDays } from 'date-fns';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { id: projectId } = await context.params;
    if (!projectId) return NextResponse.json({ error: 'ID do projeto não fornecido.' }, { status: 400 });

    const sql = getDb();
    
    // Buscar projeto para descobrir o produto
    const projectRes = await sql`SELECT idv_product FROM projects WHERE id = ${projectId}`;
    if (projectRes.length === 0) {
      return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    }
    const product = projectRes[0].idv_product || 'IDV-CORE';
    const pipeline = IDV_FLOW_PIPELINE[product] || IDV_FLOW_PIPELINE['IDV-CORE'];

    // Check if tasks already exist
    const existingTasks = await sql`SELECT id FROM tasks WHERE project_id = ${projectId} AND task_type IN ('idv_milestone', 'gate')`;
    if (existingTasks.length > 0) {
      return NextResponse.json({ error: 'Este projeto já possui a Trilha da Marca gerada.' }, { status: 400 });
    }

    const insertedIds = [];
    let lastGateId: string | null = null;
    let isAfterFirstGate = false;
    
    const today = new Date();

    for (const t of pipeline) {
      const deadline = addBusinessDays(today, t.day);
      
      // Se for gate, status é pendente (quando chegar a vez) ou draft
      const status = isAfterFirstGate ? 'draft' : 'pending';
      const dbTaskType = t.isGate ? 'gate' : t.type;
      
      const res = await sql`
        INSERT INTO tasks (
          id, project_id, assigned_to, title, description, status, stage, 
          task_type, priority_score, estimated_time, is_adhoc, deadline, internal_deadline, depends_on, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${projectId}, ${user.sub}, ${t.title}, ${t.title}, ${status}, ${t.phase},
          ${dbTaskType}, 90, ${t.estTime}, false, ${deadline.toISOString()}, ${deadline.toISOString()}, ${lastGateId}, NOW(), NOW()
        ) RETURNING id
      `;
      
      const newTaskId = res[0].id;
      insertedIds.push(newTaskId);
      
      if (t.isGate) {
        lastGateId = newTaskId;
        isAfterFirstGate = true; // Tudo depois do primeiro gate nasce como draft (bloqueado)
      }
    }

    // Atualizar datas e fase do projeto
    const presentationTarget = addBusinessDays(today, 10).toISOString();
    const deliveryTarget = addBusinessDays(today, 13).toISOString();

    await sql`
      UPDATE projects 
      SET 
        idv_phase = 'discover', 
        fase = 'pesquisa',
        production_start_date = NOW(),
        presentation_target_date = ${presentationTarget},
        delivery_target_date = ${deliveryTarget}
      WHERE id = ${projectId}
    `;

    return NextResponse.json({ success: true, count: insertedIds.length });
  } catch (error: any) {
    console.error('[generate-idv-tasks] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
