const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'controllers', 'TaskController.ts');
let content = fs.readFileSync(file, 'utf8');

const newCode = `  static async updateTaskStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { requestedStatus, task } = req.body;

      if (!task || !requestedStatus) {
        return res.status(400).json({ error: 'Missing task object or requestedStatus' });
      }

      if (task.status === requestedStatus) {
        return res.status(200).json({ data: task });
      }

      const now = new Date();
      let finalStatus = requestedStatus;
      let updates: any = {};

      if (finalStatus === 'in_progress') {
        updates.started_at = now.toISOString();
      }

      if (task.status === 'in_progress' && task.started_at && finalStatus !== 'in_progress') {
        const startTime = new Date(task.started_at).getTime();
        const diffMinutes = Math.floor((now.getTime() - startTime) / 60000);
        updates.actual_time = (task.actual_time || 0) + diffMinutes;
        updates.started_at = null;
      }

      if (finalStatus === 'review' || finalStatus === 'completed' || finalStatus === 'pending_client_approval') {
        updates.completed_at = finalStatus === 'completed' ? now.toISOString() : null;
      }

      updates.status = finalStatus;

      let data, error;

      // Update Database
      const result = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(\`
          *,
          projects(type, service_type, client_id, profiles(nome)),
          agency_subclients(name)
        \`)
        .maybeSingle();
        
      data = result.data;
      error = result.error;

      if (!data && !error) {
         // Fallback Neon
         try {
           const { neon } = require('@neondatabase/serverless');
           const rawSql = neon(process.env.POSTGRES_URL!);
           const setClauses = [];
           const values = [];
           let i = 1;
           for (const [key, value] of Object.entries(updates)) {
             if (value !== undefined) {
               setClauses.push(\`\${key} = $\${i}\`);
               values.push(value);
               i++;
             }
           }
           values.push(id);
           if (setClauses.length > 0) {
              const query = \`UPDATE tasks SET \${setClauses.join(', ')} WHERE id = $\${i} RETURNING *\`;
              const resData = await (rawSql as any)(query, values);
              data = resData[0];
           }
         } catch (neonErr) {
            console.error('Neon fallback error', neonErr);
         }
      }

      if (error) throw error;

      // Retorna resposta de sucesso imediatamente ao cliente
      res.status(200).json({ data: data || task });

      // Disparar Notificao para o Gestor em background (no trava o event loop principal)
      if (['in_progress', 'paused', 'review', 'completed'].includes(finalStatus)) {
        (async () => {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('email, role, id');

            let recipients = profiles
              ?.filter((p: any) => ['admin', 'gestor'].includes(p.role) || p.id === task.assigned_to)
              .map((p: any) => p.email) || [];
              
            // Remove duplicatas (caso um admin seja tambm o designado)
            recipients = [...new Set(recipients)];
            
            let notifyType = '';
            if (finalStatus === 'in_progress') notifyType = 'task_in_progress';
            if (finalStatus === 'paused') notifyType = 'task_paused';
            if (finalStatus === 'review') notifyType = 'internal_review';
            if (finalStatus === 'completed') notifyType = 'task_completed';

            if (recipients.length > 0 && notifyType) {
               await NotificationService.sendNotification({
                 to: recipients as string[],
                 type: notifyType as string,
                 taskId: String(id),
                 collaboratorName: String(req.body.collaboratorName || 'O Colaborador'),
                 taskName: String(req.body.task?.title || task.title || 'Tarefa'),
                 projectName: String(
                    req.body.task?.agency_subclients?.name ||
                    task.agency_subclients?.name ||
                    req.body.task?.projects?.profiles?.nome ||
                    req.body.task?.projects?.service_type ||
                    req.body.task?.projects?.type ||
                    'Projeto No Especificado'
                  ),
                 mediaUrl: task.attachment_url || req.body.task?.attachment_url ? String(task.attachment_url || req.body.task?.attachment_url) : undefined,
                 link: \`\${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin\`
               });
            }
          } catch (err) {
            console.error("Falha ao enviar notificao em background:", err);
          }
        })();
      }
      return;
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }`;

const startIdx = content.indexOf('  static async updateTaskStatus(');
const endIdx = content.indexOf('  static async updateTask(');

if (startIdx !== -1 && endIdx !== -1) {
  const oldChunk = content.substring(startIdx, endIdx);
  content = content.replace(oldChunk, newCode + '\n\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully replaced updateTaskStatus.");
} else {
  console.log("Could not find method boundaries.");
}
