const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'controllers', 'TaskController.ts');
let content = fs.readFileSync(file, 'utf8');

const oldCode = `  static async updateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get the existing task to check if assigned_to changes
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', id)
        .single();
        
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
        .single();
        
      if (error) throw error;
      
      // If assignment changed and is now assigned to someone, notify them
      if (updates.assigned_to && existingTask && existingTask.assigned_to !== updates.assigned_to) {
        (async () => {
          try {
            const { data: collab } = await supabase.from('profiles').select('email, nome').eq('id', updates.assigned_to).single();
            if (collab?.email) {
              const projName = data.agency_subclients?.name || data.projects?.profiles?.nome || data.projects?.type || 'Projeto';
              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: \`\${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/task/\${data.id}\`
              });
            }
          } catch (e) {
            console.error("Erro ao enviar e-mail de tarefa reatribuída:", e);
          }
        })();
      }
      
      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error', details: error });
    }
  }`;

const newCode = `  static async updateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      let data, error;
      let existingTask;
      
      try {
        const resObj = await supabase
          .from('tasks')
          .select('assigned_to')
          .eq('id', id)
          .maybeSingle();
        existingTask = resObj.data;
      } catch (e) {}
        
      if (existingTask) {
        const result = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
          .single();
        data = result.data;
        error = result.error;
      } else {
        try {
          const { neon } = require('@neondatabase/serverless');
          const rawSql = neon(process.env.POSTGRES_URL!);
          
          if (updates.deadline === '') updates.deadline = null;
          if (updates.urgency === '') updates.urgency = null;
          if (updates.assigned_to === 'none' || updates.assigned_to === '') updates.assigned_to = null;
          
          const setClauses = [];
          const values = [];
          let i = 1;
          for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
              setClauses.push(\`\${key} = $\${i}\`);
              values.push(Array.isArray(value) ? JSON.stringify(value) : value);
              i++;
            }
          }
          values.push(id);
          
          if (setClauses.length > 0) {
            const query = \`UPDATE tasks SET \${setClauses.join(', ')} WHERE id = $\${i} RETURNING *\`;
            const resData = await rawSql(query, values);
            data = resData[0] || updates;
          } else {
            data = updates;
          }
        } catch (neonErr) {
           throw neonErr;
        }
      }
        
      if (error) throw error;
      
      if (updates.assigned_to && existingTask && existingTask.assigned_to !== updates.assigned_to) {
        (async () => {
          try {
            const { data: collab } = await supabase.from('profiles').select('email, nome').eq('id', updates.assigned_to).maybeSingle();
            if (collab?.email) {
              const projName = data.agency_subclients?.name || data.projects?.profiles?.nome || data.projects?.type || 'Projeto';
              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: \`\${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/task/\${data.id}\`
              });
            }
          } catch (e) {
            console.error("Erro ao enviar e-mail de tarefa reatribuída:", e);
          }
        })();
      }
      
      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error', details: error });
    }
  }`;

if (content.includes('static async updateTask')) {
  const newContent = content.replace(oldCode, newCode);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("Replaced");
} else {
  console.log("Could not find method");
}
