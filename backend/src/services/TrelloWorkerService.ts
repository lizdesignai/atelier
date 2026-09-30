import { neon } from '@neondatabase/serverless';
import { NotificationService } from './NotificationService';

const TRELLO_API_KEY = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.NEXT_PUBLIC_TRELLO_TOKEN;

/**
 * Extrai o ID do board a partir de uma URL do Trello.
 */
function extractBoardId(url: string): string | null {
  const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export class TrelloWorkerService {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 300000) { // Default 5 minutes
    if (this.intervalId) return;
    console.log(`[TrelloWorker] Serviço de automação do Trello iniciado (intervalo: ${intervalMs / 1000 / 60} min)`);
    
    setTimeout(() => {
      this.syncTrelloDemands();
    }, 15000);

    this.intervalId = setInterval(() => {
      this.syncTrelloDemands();
    }, intervalMs);
  }

  private static async syncTrelloDemands() {
    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      console.log('[TrelloWorker] Credenciais do Trello não configuradas.');
      return;
    }

    try {
      console.log('[TrelloWorker] Verificando novas demandas...');
      const sql = neon(process.env.POSTGRES_URL || '');

      // Buscar projects e agency_subclients que possuem trello_sync_list_ids configurados
      // As colunas trello_url e trello_sync_list_ids não existem em projects no Neon DB
      // const [projects, subclients] = await Promise.all([
      //   sql`SELECT id, client_id, type as name, trello_url, trello_sync_list_ids FROM projects WHERE trello_sync_list_ids IS NOT NULL`,
      //   sql`SELECT id, agency_id, name, trello_url, trello_sync_list_ids FROM agency_subclients WHERE trello_sync_list_ids IS NOT NULL`
      // ]);
      const projects: any[] = [];
      const subclients: any[] = [];

      const processSync = async (entity: any, isSubclient: boolean) => {
        // Ignorar arrays vazios de trello_sync_list_ids
        if (!entity.trello_url || !entity.trello_sync_list_ids) return;

        let listIds = [];
        if (typeof entity.trello_sync_list_ids === 'string') {
          listIds = entity.trello_sync_list_ids.split(',').map((id: string) => id.trim());
        } else if (Array.isArray(entity.trello_sync_list_ids)) {
          listIds = entity.trello_sync_list_ids;
        }
        
        if (listIds.length === 0) return;

        const boardId = extractBoardId(entity.trello_url);
        if (!boardId) return;

        for (const listId of listIds) {
          try {
            const cardsRes = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`);
            if (!cardsRes.ok) continue;
            const cards = await cardsRes.json();

            for (const card of cards) {
              const existingTaskData = await sql`
                SELECT id FROM tasks WHERE trello_card_id = ${card.id} LIMIT 1
              `;
              const existingTask = existingTaskData[0];

              if (!existingTask) {
                const taskPayload: any = {
                  title: card.name,
                  status: 'pendente',
                  priority: 'Média',
                  task_type: 'Outros',
                  trello_card_id: card.id
                };

                let newTask;
                let error = null;

                try {
                  let newTaskData;
                  if (isSubclient) {
                    taskPayload.subclient_id = entity.id;
                    taskPayload.client_id = entity.agency_id;
                    newTaskData = await sql`
                      INSERT INTO tasks (title, status, priority, task_type, trello_card_id, subclient_id, client_id)
                      VALUES (${taskPayload.title}, ${taskPayload.status}, ${taskPayload.priority}, ${taskPayload.task_type}, ${taskPayload.trello_card_id}, ${taskPayload.subclient_id}, ${taskPayload.client_id})
                      RETURNING id
                    `;
                  } else {
                    taskPayload.project_id = entity.id;
                    taskPayload.client_id = entity.client_id;
                    newTaskData = await sql`
                      INSERT INTO tasks (title, status, priority, task_type, trello_card_id, project_id, client_id)
                      VALUES (${taskPayload.title}, ${taskPayload.status}, ${taskPayload.priority}, ${taskPayload.task_type}, ${taskPayload.trello_card_id}, ${taskPayload.project_id}, ${taskPayload.client_id})
                      RETURNING id
                    `;
                  }
                  newTask = newTaskData[0];
                } catch (err) {
                  error = err;
                }

                if (!error && newTask) {
                  console.log(`[TrelloWorker] Demanda criada: ${card.name} para ${entity.name}`);

                  const emailUsersRes = await sql`SELECT email FROM profiles WHERE role IN ('Administrador', 'Líder')`;
                  if (emailUsersRes) {
                    const emails = emailUsersRes.map((u: any) => u.email).filter(Boolean);
                    if (emails.length > 0) {
                      await NotificationService.sendNotification({
                        to: emails,
                        type: 'new_demand',
                        clientName: entity.name,
                        taskName: card.name,
                        link: '/admin/jtbd'
                      });
                    }
                  }
                } else {
                  console.error('[TrelloWorker] Erro ao criar demanda:', error);
                }
              }
            }
          } catch (listErr) {
            console.error(`[TrelloWorker] Erro ao buscar lista ${listId}:`, listErr);
          }
        }
      };

      const promises = [];
      if (projects) {
        for (const p of projects) promises.push(processSync(p, false));
      }
      if (subclients) {
        for (const s of subclients) promises.push(processSync(s, true));
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('[TrelloWorker] Erro geral na sincronização:', error);
    }
  }
}
